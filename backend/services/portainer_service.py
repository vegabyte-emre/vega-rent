"""
Portainer Integration Service
Handles automatic deployment of company stacks to Portainer
"""

import os
import httpx
import logging
import tarfile
import io as std_io
from typing import Optional, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Portainer Configuration
# KVM Server Portainer URL
PORTAINER_URL = os.environ.get('PORTAINER_URL', 'https://72.61.158.147:9443')
PORTAINER_API_KEY = os.environ.get('PORTAINER_API_KEY', 'ptr_XwtYmxpR0KCkqMLsPLGMM4mHQS5Q75gupgBcCGqRUEY=')
PORTAINER_ENDPOINT_ID = int(os.environ.get('PORTAINER_ENDPOINT_ID', '3'))
SERVER_IP = os.environ.get('SERVER_IP', '72.61.158.147')

# Port allocation range for companies
BASE_FRONTEND_PORT = 10000
BASE_BACKEND_PORT = 11000
BASE_MONGO_PORT = 12000


def get_docker_compose_template(company_code: str, company_name: str, port_offset: int) -> str:
    """
    Generate Docker Compose YAML for a company stack
    """
    frontend_port = BASE_FRONTEND_PORT + port_offset
    backend_port = BASE_BACKEND_PORT + port_offset
    mongo_port = BASE_MONGO_PORT + port_offset
    
    return f"""version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: {company_code}_mongodb
    restart: unless-stopped
    environment:
      - MONGO_INITDB_DATABASE={company_code}_db
    volumes:
      - {company_code}_mongo_data:/data/db
    ports:
      - "{mongo_port}:27017"
    networks:
      - {company_code}_network

  backend:
    image: python:3.11-slim
    container_name: {company_code}_backend
    restart: unless-stopped
    working_dir: /app
    command: >
      bash -c "pip install fastapi uvicorn motor pydantic python-jose passlib python-dotenv bcrypt &&
               uvicorn server:app --host 0.0.0.0 --port 8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME={company_code}_db
      - JWT_SECRET={company_code}_jwt_secret_key_2024
      - CORS_ORIGINS=*
      - COMPANY_CODE={company_code}
      - COMPANY_NAME={company_name}
    ports:
      - "{backend_port}:8001"
    depends_on:
      - mongodb
    networks:
      - {company_code}_network
    volumes:
      - {company_code}_backend_data:/app

  frontend:
    image: node:20-alpine
    container_name: {company_code}_frontend
    restart: unless-stopped
    working_dir: /app
    command: >
      sh -c "npm install -g serve && serve -s build -l 3000"
    environment:
      - REACT_APP_BACKEND_URL=http://{SERVER_IP}:{backend_port}
      - REACT_APP_COMPANY_CODE={company_code}
      - REACT_APP_COMPANY_NAME={company_name}
    ports:
      - "{frontend_port}:3000"
    depends_on:
      - backend
    networks:
      - {company_code}_network
    volumes:
      - {company_code}_frontend_data:/app

volumes:
  {company_code}_mongo_data:
  {company_code}_backend_data:
  {company_code}_frontend_data:

networks:
  {company_code}_network:
    driver: bridge
"""


def get_minimal_compose_template(company_code: str, company_name: str, port_offset: int) -> str:
    """
    Generate minimal Docker Compose YAML - MongoDB only for testing
    """
    mongo_port = BASE_MONGO_PORT + port_offset
    
    return f"""version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: {company_code}_mongodb
    restart: unless-stopped
    environment:
      - MONGO_INITDB_DATABASE={company_code}_db
    volumes:
      - {company_code}_mongo_data:/data/db
    ports:
      - "{mongo_port}:27017"
    networks:
      - {company_code}_network

volumes:
  {company_code}_mongo_data:

networks:
  {company_code}_network:
    driver: bridge
"""


def get_full_company_stack_template(company_code: str, company_name: str, domain: str, port_offset: int) -> str:
    """
    Generate Docker Compose for a complete company stack with Traefik SSL.
    Template files will be copied via Portainer API after stack creation.
    Includes mobile app containers for Customer and Operation apps.
    """
    safe_code = company_code.replace('-', '').replace('_', '')
    
    frontend_port = BASE_FRONTEND_PORT + port_offset
    backend_port = BASE_BACKEND_PORT + port_offset
    mongo_port = BASE_MONGO_PORT + port_offset
    
    # Expo token from environment
    expo_token = os.environ.get("EXPO_TOKEN", "")
    
    return f"""version: '3.8'

services:
  {safe_code}_mongodb:
    image: mongo:6.0
    container_name: {safe_code}_mongodb
    restart: unless-stopped
    environment:
      - MONGO_INITDB_DATABASE={safe_code}_db
    volumes:
      - {safe_code}_mongo_data:/data/db
    ports:
      - "{mongo_port}:27017"
    networks:
      - {safe_code}_network
      - traefik_network

  {safe_code}_backend:
    image: tiangolo/uvicorn-gunicorn-fastapi:python3.11-slim
    container_name: {safe_code}_backend
    restart: unless-stopped
    environment:
      - MONGO_URL=mongodb://{safe_code}_mongodb:27017
      - DB_NAME={safe_code}_db
      - JWT_SECRET={safe_code}_jwt_secret_2024
      - COMPANY_CODE={company_code}
      - COMPANY_NAME={company_name}
      - API_URL=https://api.{domain}
      - DOMAIN={domain}
      - MODULE_NAME=server
      - VARIABLE_NAME=app
    ports:
      - "{backend_port}:80"
    depends_on:
      - {safe_code}_mongodb
    networks:
      - {safe_code}_network
      - traefik_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.{safe_code}-api.rule=Host(`api.{domain}`)"
      - "traefik.http.routers.{safe_code}-api.entrypoints=websecure"
      - "traefik.http.routers.{safe_code}-api.tls.certresolver=letsencrypt"
      - "traefik.http.services.{safe_code}-api.loadbalancer.server.port=80"

  {safe_code}_frontend:
    image: nginx:alpine
    container_name: {safe_code}_frontend
    restart: unless-stopped
    ports:
      - "{frontend_port}:80"
    depends_on:
      - {safe_code}_backend
    networks:
      - {safe_code}_network
      - traefik_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.{safe_code}-web.rule=Host(`{domain}`) || Host(`www.{domain}`)"
      - "traefik.http.routers.{safe_code}-web.entrypoints=websecure"
      - "traefik.http.routers.{safe_code}-web.tls.certresolver=letsencrypt"
      - "traefik.http.routers.{safe_code}-web.service={safe_code}-frontend"
      - "traefik.http.routers.{safe_code}-panel.rule=Host(`panel.{domain}`)"
      - "traefik.http.routers.{safe_code}-panel.entrypoints=websecure"
      - "traefik.http.routers.{safe_code}-panel.tls.certresolver=letsencrypt"
      - "traefik.http.routers.{safe_code}-panel.service={safe_code}-frontend"
      - "traefik.http.services.{safe_code}-frontend.loadbalancer.server.port=80"

  {safe_code}_customer_app:
    image: node:20-alpine
    container_name: {safe_code}_customer_app
    restart: unless-stopped
    working_dir: /app
    environment:
      - EXPO_TOKEN={expo_token}
      - COMPANY_CODE={company_code}
      - COMPANY_NAME={company_name}
      - API_URL=https://api.{domain}
      - DOMAIN={domain}
    command: ["tail", "-f", "/dev/null"]
    networks:
      - {safe_code}_network

  {safe_code}_operation_app:
    image: node:20-alpine
    container_name: {safe_code}_operation_app
    restart: unless-stopped
    working_dir: /app
    environment:
      - EXPO_TOKEN={expo_token}
      - COMPANY_CODE={company_code}
      - COMPANY_NAME={company_name}
      - API_URL=https://api.{domain}
      - DOMAIN={domain}
    command: ["tail", "-f", "/dev/null"]
    networks:
      - {safe_code}_network

volumes:
  {safe_code}_mongo_data:

networks:
  {safe_code}_network:
    driver: bridge
  traefik_network:
    external: true
"""


def get_template_stack_compose() -> str:
    """
    Generate Docker Compose for template volumes - contains pre-built frontend and backend code
    This stack creates shared volumes that all tenant stacks will use
    Now includes mobile app templates for Customer and Operation apps
    """
    return """version: '3.8'

services:
  template_frontend:
    image: nginx:alpine
    container_name: rentacar_template_frontend
    restart: unless-stopped
    volumes:
      - rentacar_template_frontend:/usr/share/nginx/html
    ports:
      - "10099:80"
    networks:
      - template_network

  template_backend:
    image: tiangolo/uvicorn-gunicorn-fastapi:python3.11-slim
    container_name: rentacar_template_backend
    restart: unless-stopped
    volumes:
      - rentacar_template_backend:/app
    ports:
      - "11099:80"
    networks:
      - template_network

  template_customer_app:
    image: node:20-alpine
    container_name: rentacar_template_customer_app
    restart: unless-stopped
    working_dir: /app
    volumes:
      - rentacar_template_customer_app:/app
    environment:
      - EXPO_TOKEN=${EXPO_TOKEN:-}
    command: ["tail", "-f", "/dev/null"]
    networks:
      - template_network

  template_operation_app:
    image: node:20-alpine
    container_name: rentacar_template_operation_app
    restart: unless-stopped
    working_dir: /app
    volumes:
      - rentacar_template_operation_app:/app
    environment:
      - EXPO_TOKEN=${EXPO_TOKEN:-}
    command: ["tail", "-f", "/dev/null"]
    networks:
      - template_network

volumes:
  rentacar_template_frontend:
    name: rentacar_template_frontend
  rentacar_template_backend:
    name: rentacar_template_backend
  rentacar_template_customer_app:
    name: rentacar_template_customer_app
  rentacar_template_operation_app:
    name: rentacar_template_operation_app

networks:
  template_network:
    driver: bridge
"""


def get_traefik_compose_template(admin_email: str = "admin@rentafleet.com") -> str:
    """
    Generate Traefik reverse proxy stack with automatic SSL
    """
    return f"""version: '3.8'

services:
  traefik:
    image: traefik:v2.10
    container_name: traefik
    restart: unless-stopped
    command:
      - "--api.dashboard=true"
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--providers.docker.network=traefik_network"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.tlschallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.email={admin_email}"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--log.level=INFO"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_certs:/letsencrypt
    networks:
      - traefik_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`traefik.localhost`)"
      - "traefik.http.routers.dashboard.service=api@internal"

volumes:
  traefik_certs:

networks:
  traefik_network:
    name: traefik_network
    driver: bridge
"""


def get_superadmin_compose_template(github_repo: str = "https://github.com/vegabyte-emre/vega-rent.git") -> str:
    """
    Generate Docker Compose YAML for SuperAdmin stack
    
    BAĞIMSIZ ÇALIŞMA:
    - Backend: GitHub'dan kod çeker, dependencies kurar, çalıştırır
    - Frontend: Nginx ile static dosyalar serve eder (deploy script ile güncellenir)
    - MongoDB: Kendi volume'unda persistent data
    
    Ports: Frontend 9000, Backend 9001, MongoDB 27017
    Backend uses network_mode: host for direct Portainer access
    """
    yaml_content = f"""version: "3.8"

services:
  superadmin_mongodb:
    image: mongo:6.0
    container_name: superadmin_mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - superadmin_mongo_data:/data/db
    networks:
      - superadmin_network

  superadmin_backend:
    image: python:3.11-slim
    container_name: superadmin_backend
    restart: unless-stopped
    network_mode: host
    working_dir: /app
    environment:
      - MONGO_URL=mongodb://127.0.0.1:27017
      - DB_NAME=superadmin_db
      - PORTAINER_URL=https://72.61.158.147:9443
      - PORTAINER_API_KEY=ptr_XwtYmxpR0KCkqMLsPLGMM4mHQS5Q75gupgBcCGqRUEY=
      - SERVER_IP=72.61.158.147
      - PYTHONUNBUFFERED=1
    command:
      - bash
      - -c
      - |
        apt-get update && apt-get install -y git > /dev/null 2>&1
        cd /app
        if [ -f /app/.git/config ]; then
          git pull origin main || true
        else
          rm -rf /app/*
          git clone --depth 1 {github_repo} /tmp/repo
          cp -r /tmp/repo/backend/* /app/
          rm -rf /tmp/repo
        fi
        pip install --no-cache-dir -q -r /app/requirements.txt 2>/dev/null || true
        pip install --no-cache-dir -q uvicorn email-validator
        exec uvicorn server:app --host 0.0.0.0 --port 9001 --reload
    volumes:
      - superadmin_backend_app:/app

  superadmin_nginx:
    image: nginx:alpine
    container_name: superadmin_nginx
    restart: unless-stopped
    ports:
      - "9000:80"
    volumes:
      - superadmin_frontend_html:/usr/share/nginx/html
    command:
      - sh
      - -c
      - |
        echo 'server {{ listen 80; root /usr/share/nginx/html; index index.html; location / {{ try_files $$uri $$uri/ /index.html; }} }}' > /etc/nginx/conf.d/default.conf
        nginx -g "daemon off;"
    networks:
      - superadmin_network

volumes:
  superadmin_mongo_data:
  superadmin_backend_app:
  superadmin_frontend_html:

networks:
  superadmin_network:
    driver: bridge
"""
    return yaml_content


class PortainerService:
    def __init__(self):
        self.base_url = PORTAINER_URL
        self.api_key = PORTAINER_API_KEY
        self.endpoint_id = PORTAINER_ENDPOINT_ID
        self.headers = {
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json'
        }
    
    async def _request(self, method: str, endpoint: str, data: Optional[Dict] = None, files: Optional[Dict] = None) -> Dict[str, Any]:
        """Make request to Portainer API"""
        url = f"{self.base_url}/api/{endpoint}"
        
        # Create SSL context that ignores certificate verification
        import ssl
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        async with httpx.AsyncClient(verify=False, timeout=60.0, http2=False) as client:
            try:
                if files:
                    # For file uploads, don't use JSON
                    headers = {'X-API-Key': self.api_key}
                    response = await client.request(method, url, headers=headers, data=data, files=files)
                else:
                    response = await client.request(method, url, headers=self.headers, json=data)
                
                if response.status_code >= 400:
                    logger.error(f"Portainer API error: {response.status_code} - {response.text}")
                    return {'error': response.text, 'status_code': response.status_code}
                
                try:
                    return response.json()
                except:
                    return {'text': response.text, 'status_code': response.status_code}
                    
            except Exception as e:
                logger.error(f"Portainer API request failed: {str(e)}")
                import traceback
                logger.error(f"Traceback: {traceback.format_exc()}")
                return {'error': str(e)}
    
    async def get_stacks(self) -> list:
        """Get all stacks"""
        result = await self._request('GET', 'stacks')
        if isinstance(result, list):
            return result
        return []
    
    async def get_containers(self) -> list:
        """Get all containers from Portainer"""
        endpoint = f"endpoints/{self.endpoint_id}/docker/containers/json?all=true"
        result = await self._request('GET', endpoint)
        if isinstance(result, list):
            return [
                {
                    'id': c.get('Id', '')[:12],
                    'names': c.get('Names', []),
                    'state': c.get('State'),
                    'status': c.get('Status'),
                    'image': c.get('Image')
                }
                for c in result
            ]
        return []
    
    async def _get_container_port(self, container_name: str) -> Optional[int]:
        """Get the public port of a container"""
        endpoint = f"endpoints/{self.endpoint_id}/docker/containers/json?all=true"
        result = await self._request('GET', endpoint)
        if isinstance(result, list):
            for c in result:
                names = c.get('Names', [])
                if f"/{container_name}" in names:
                    ports = c.get('Ports', [])
                    for p in ports:
                        public_port = p.get('PublicPort')
                        if public_port:
                            return public_port
        return None
    
    async def delete_stack(self, stack_id: int) -> Dict[str, Any]:
        """Delete a stack by ID"""
        endpoint = f"stacks/{stack_id}?endpointId={self.endpoint_id}"
        
        async with httpx.AsyncClient(verify=False, timeout=60.0) as client:
            try:
                url = f"{self.base_url}/api/{endpoint}"
                response = await client.delete(url, headers=self.headers)
                
                if response.status_code < 400:
                    logger.info(f"Stack {stack_id} deleted successfully")
                    return {'success': True}
                else:
                    logger.error(f"Stack delete failed: {response.status_code} - {response.text}")
                    return {'error': response.text, 'status_code': response.status_code}
            except Exception as e:
                logger.error(f"Stack delete error: {str(e)}")
                return {'error': str(e)}
    
    async def get_next_port_offset(self, db) -> int:
        """Get next available port offset based on existing companies and Portainer stacks"""
        # Find the highest port_offset used in database
        companies = await db.companies.find(
            {'port_offset': {'$exists': True, '$ne': None}},
            {'port_offset': 1}
        ).to_list(1000)
        
        # Also check Portainer for existing stacks to avoid conflicts
        try:
            stacks = await self.get_stacks()
            stack_count = len([s for s in stacks if isinstance(s, dict) and s.get('Name', '').startswith('rentacar_')])
        except:
            stack_count = 0
        
        if not companies:
            # Start from offset that accounts for existing Portainer stacks
            # Add +5 buffer to avoid any potential conflicts
            return max(stack_count + 5, 5)
        
        max_offset = max(c.get('port_offset', 0) for c in companies)
        # Ensure new offset is higher than both max in DB and stack count
        next_offset = max(max_offset + 1, stack_count + 5)
        
        logger.info(f"[PORT] Next port offset: {next_offset} (DB max: {max_offset}, Portainer stacks: {stack_count})")
        return next_offset
    
    async def create_full_stack(self, company_code: str, company_name: str, domain: str, port_offset: int) -> Dict[str, Any]:
        """
        Create a full company stack with Frontend + Backend + MongoDB
        With Traefik labels for domain-based routing
        """
        stack_name = f"rentacar_{company_code}"
        compose_content = get_full_company_stack_template(company_code, company_name, domain, port_offset)
        
        endpoint = f"stacks/create/standalone/string?endpointId={self.endpoint_id}"
        
        payload = {
            'name': stack_name,
            'stackFileContent': compose_content,
            'env': []
        }
        
        result = await self._request('POST', endpoint, data=payload)
        
        if 'error' not in result:
            logger.info(f"Full stack created successfully: {stack_name}")
            return {
                'success': True,
                'stack_id': result.get('Id'),
                'stack_name': stack_name,
                'ports': {
                    'frontend': BASE_FRONTEND_PORT + port_offset,
                    'backend': BASE_BACKEND_PORT + port_offset,
                    'mongodb': BASE_MONGO_PORT + port_offset
                },
                'urls': {
                    'website': f"https://{domain}",
                    'panel': f"https://panel.{domain}",
                    'api': f"https://api.{domain}",
                    'ip_frontend': f"http://{SERVER_IP}:{BASE_FRONTEND_PORT + port_offset}",
                    'ip_backend': f"http://{SERVER_IP}:{BASE_BACKEND_PORT + port_offset}"
                }
            }
        else:
            logger.error(f"Full stack creation failed: {result}")
            return {'success': False, 'error': result.get('error', 'Unknown error')}

    async def create_stack(self, company_code: str, company_name: str, port_offset: int) -> Dict[str, Any]:
        """
        Create a new stack in Portainer for a company
        Uses docker-compose string method
        """
        stack_name = f"rentacar_{company_code}"
        compose_content = get_minimal_compose_template(company_code, company_name, port_offset)
        
        # Portainer expects multipart form data for stack creation
        data = {
            'Name': stack_name,
            'SwarmID': '',
            'Env': '[]'
        }
        
        # Use the stackFileContent method
        endpoint = f"stacks/create/standalone/string?endpointId={self.endpoint_id}"
        
        payload = {
            'name': stack_name,
            'stackFileContent': compose_content,
            'env': []
        }
        
        result = await self._request('POST', endpoint, data=payload)
        
        if 'error' not in result:
            logger.info(f"Stack created successfully: {stack_name}")
            return {
                'success': True,
                'stack_id': result.get('Id'),
                'stack_name': stack_name,
                'ports': {
                    'frontend': BASE_FRONTEND_PORT + port_offset,
                    'backend': BASE_BACKEND_PORT + port_offset,
                    'mongodb': BASE_MONGO_PORT + port_offset
                },
                'urls': {
                    'frontend': f"http://{SERVER_IP}:{BASE_FRONTEND_PORT + port_offset}",
                    'backend': f"http://{SERVER_IP}:{BASE_BACKEND_PORT + port_offset}",
                    'api': f"http://{SERVER_IP}:{BASE_BACKEND_PORT + port_offset}/api"
                }
            }
        else:
            logger.error(f"Stack creation failed: {result}")
            return {'success': False, 'error': result.get('error', 'Unknown error')}
    
    async def delete_stack(self, stack_id: int) -> Dict[str, Any]:
        """Delete a stack"""
        endpoint = f"stacks/{stack_id}?endpointId={self.endpoint_id}"
        result = await self._request('DELETE', endpoint)
        
        if 'error' not in result:
            return {'success': True}
        return {'success': False, 'error': result.get('error')}
    
    async def get_stack_status(self, stack_id: int) -> Dict[str, Any]:
        """Get stack status"""
        endpoint = f"stacks/{stack_id}"
        return await self._request('GET', endpoint)
    
    async def start_stack(self, stack_id: int) -> Dict[str, Any]:
        """Start a stack"""
        endpoint = f"stacks/{stack_id}/start?endpointId={self.endpoint_id}"
        return await self._request('POST', endpoint)
    
    async def stop_stack(self, stack_id: int) -> Dict[str, Any]:
        """Stop a stack"""
        endpoint = f"stacks/{stack_id}/stop?endpointId={self.endpoint_id}"
        return await self._request('POST', endpoint)

    async def stop_container(self, container_name: str) -> Dict[str, Any]:
        """
        Stop a container by name - CRITICAL for safe updates
        This prevents crash loops during template updates
        """
        container_id = await self.get_container_id(container_name)
        if not container_id:
            return {'error': f'Container {container_name} not found'}
        
        stop_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/{container_id}/stop"
        
        async with httpx.AsyncClient(verify=False, timeout=60.0) as client:
            try:
                url = f"{self.base_url}/api/{stop_endpoint}"
                response = await client.post(url, headers=self.headers)
                
                if response.status_code < 400 or response.status_code == 304:  # 304 = already stopped
                    logger.info(f"[CONTAINER] Stopped: {container_name}")
                    return {'success': True}
                else:
                    logger.error(f"[CONTAINER] Stop failed: {response.status_code} - {response.text}")
                    return {'error': response.text, 'status_code': response.status_code}
            except Exception as e:
                logger.error(f"[CONTAINER] Stop error: {str(e)}")
                return {'error': str(e)}

    async def start_container(self, container_name: str) -> Dict[str, Any]:
        """
        Start a container by name
        """
        container_id = await self.get_container_id(container_name)
        if not container_id:
            return {'error': f'Container {container_name} not found'}
        
        start_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/{container_id}/start"
        
        async with httpx.AsyncClient(verify=False, timeout=60.0) as client:
            try:
                url = f"{self.base_url}/api/{start_endpoint}"
                response = await client.post(url, headers=self.headers)
                
                if response.status_code < 400 or response.status_code == 304:  # 304 = already running
                    logger.info(f"[CONTAINER] Started: {container_name}")
                    return {'success': True}
                else:
                    logger.error(f"[CONTAINER] Start failed: {response.status_code} - {response.text}")
                    return {'error': response.text, 'status_code': response.status_code}
            except Exception as e:
                logger.error(f"[CONTAINER] Start error: {str(e)}")
                return {'error': str(e)}

    async def wait_for_container_state(self, container_name: str, desired_state: str, timeout: int = 30) -> bool:
        """
        Wait for container to reach desired state (running/exited)
        """
        import asyncio
        
        for _ in range(timeout):
            containers_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/json?all=true"
            containers = await self._request('GET', containers_endpoint)
            
            if isinstance(containers, list):
                for c in containers:
                    names = c.get('Names', [])
                    for name in names:
                        if container_name in name:
                            current_state = c.get('State', '').lower()
                            if current_state == desired_state.lower():
                                logger.info(f"[CONTAINER] {container_name} reached state: {desired_state}")
                                return True
                            break
            
            await asyncio.sleep(1)
        
        logger.warning(f"[CONTAINER] {container_name} did not reach state {desired_state} within {timeout}s")
        return False

    async def deploy_traefik(self, admin_email: str = "admin@rentafleet.com") -> Dict[str, Any]:
        """
        Deploy Traefik reverse proxy stack
        """
        stack_name = "traefik"
        compose_content = get_traefik_compose_template(admin_email)
        
        # Check if already exists
        existing_stacks = await self.get_stacks()
        for stack in existing_stacks:
            if isinstance(stack, dict) and stack.get("Name") == stack_name:
                return {
                    'success': True,
                    'message': 'Traefik already deployed',
                    'stack_id': stack.get('Id'),
                    'already_exists': True
                }
        
        endpoint = f"stacks/create/standalone/string?endpointId={self.endpoint_id}"
        
        payload = {
            'name': stack_name,
            'stackFileContent': compose_content,
            'env': []
        }
        
        result = await self._request('POST', endpoint, data=payload)
        
        if 'error' not in result:
            logger.info("Traefik stack deployed successfully")
            return {
                'success': True,
                'stack_id': result.get('Id'),
                'stack_name': stack_name,
                'dashboard_url': f"http://{SERVER_IP}:8080",
                'message': 'Traefik deployed successfully'
            }
        else:
            logger.error(f"Traefik deployment failed: {result}")
            return {'success': False, 'error': result.get('error', 'Unknown error')}

    async def check_traefik_status(self) -> Dict[str, Any]:
        """
        Check if Traefik is deployed and running
        """
        try:
            stacks = await self.get_stacks()
            traefik_stack = None
            for stack in stacks:
                if isinstance(stack, dict) and stack.get("Name") == "traefik":
                    traefik_stack = stack
                    break
            
            if traefik_stack:
                return {
                    'installed': True,
                    'stack_id': traefik_stack.get('Id'),
                    'status': 'active',
                    'dashboard_url': f"http://{SERVER_IP}:8080"
                }
            else:
                return {
                    'installed': False,
                    'status': 'not_installed'
                }
        except Exception as e:
            return {
                'installed': False,
                'status': 'error',
                'error': str(e)
            }

    async def create_superadmin_stack(self) -> Dict[str, Any]:
        """
        Create SuperAdmin stack in Portainer
        Ports: Frontend 9000, Backend 9001, MongoDB 27017
        """
        stack_name = "superadmin"
        compose_content = get_superadmin_compose_template()
        
        # Check if stack already exists
        existing_stacks = await self.get_stacks()
        for stack in existing_stacks:
            if isinstance(stack, dict) and stack.get("Name") == stack_name:
                return {
                    'success': False,
                    'error': 'SuperAdmin stack already exists',
                    'stack_id': stack.get('Id')
                }
        
        endpoint = f"stacks/create/standalone/string?endpointId={self.endpoint_id}"
        
        payload = {
            'name': stack_name,
            'stackFileContent': compose_content,
            'env': []
        }
        
        result = await self._request('POST', endpoint, data=payload)
        
        if 'error' not in result:
            logger.info(f"SuperAdmin stack created successfully")
            return {
                'success': True,
                'stack_id': result.get('Id'),
                'stack_name': stack_name,
                'ports': {
                    'frontend': 9000,
                    'backend': 9001,
                    'mongodb': 27017
                },
                'urls': {
                    'frontend': f"http://{SERVER_IP}:9000",
                    'backend': f"http://{SERVER_IP}:9001",
                    'api': f"http://{SERVER_IP}:9001/api",
                    'health': f"http://{SERVER_IP}:9001/api/health"
                }
            }
        else:
            logger.error(f"SuperAdmin stack creation failed: {result}")
            return {'success': False, 'error': result.get('error', 'Unknown error')}

    async def create_template_stack(self) -> Dict[str, Any]:
        """
        Create template stack with shared volumes for frontend and backend code.
        All tenant stacks will mount these volumes read-only.
        """
        stack_name = "rentacar_template"
        compose_content = get_template_stack_compose()
        
        # Check if stack already exists
        existing_stacks = await self.get_stacks()
        for stack in existing_stacks:
            if isinstance(stack, dict) and stack.get("Name") == stack_name:
                return {
                    'success': True,
                    'already_exists': True,
                    'stack_id': stack.get('Id'),
                    'stack_name': stack_name,
                    'message': 'Template stack already exists'
                }
        
        endpoint = f"stacks/create/standalone/string?endpointId={self.endpoint_id}"
        
        payload = {
            'name': stack_name,
            'stackFileContent': compose_content,
            'env': []
        }
        
        result = await self._request('POST', endpoint, data=payload)
        
        if 'error' not in result:
            logger.info(f"Template stack created successfully")
            return {
                'success': True,
                'stack_id': result.get('Id'),
                'stack_name': stack_name,
                'message': 'Template stack created. Now upload frontend build and backend code to the template containers.',
                'containers': {
                    'frontend': 'rentacar_template_frontend',
                    'backend': 'rentacar_template_backend'
                }
            }
        else:
            logger.error(f"Template stack creation failed: {result}")
            return {'success': False, 'error': result.get('error', 'Unknown error')}


    async def exec_in_container(self, container_name: str, command: str) -> Dict[str, Any]:
        """
        Execute a command inside a container via Portainer API
        """
        # First, get container ID
        containers_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/json"
        containers = await self._request('GET', containers_endpoint)
        
        container_id = None
        if isinstance(containers, list):
            for c in containers:
                names = c.get('Names', [])
                for name in names:
                    if container_name in name:
                        container_id = c.get('Id')
                        break
                if container_id:
                    break
        
        if not container_id:
            return {'error': f'Container {container_name} not found'}
        
        # Create exec instance
        exec_create_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/{container_id}/exec"
        exec_payload = {
            'Cmd': ['sh', '-c', command],
            'AttachStdout': True,
            'AttachStderr': True
        }
        
        result = await self._request('POST', exec_create_endpoint, data=exec_payload)
        
        if 'Id' in result:
            exec_id = result['Id']
            # Start exec
            exec_start_endpoint = f"endpoints/{self.endpoint_id}/docker/exec/{exec_id}/start"
            start_result = await self._request('POST', exec_start_endpoint, data={'Detach': False})
            return {'success': True, 'output': start_result}
        
        return {'success': False, 'error': result.get('error', 'Failed to create exec')}

    async def upload_to_container(self, container_name: str, tar_data: bytes, dest_path: str) -> Dict[str, Any]:
        """
        Upload a tar archive to a container via Portainer API
        """
        # First, get container ID
        containers_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/json"
        containers = await self._request('GET', containers_endpoint)
        
        container_id = None
        if isinstance(containers, list):
            for c in containers:
                names = c.get('Names', [])
                for name in names:
                    if container_name in name:
                        container_id = c.get('Id')
                        break
                if container_id:
                    break
        
        if not container_id:
            return {'error': f'Container {container_name} not found'}
        
        # Upload archive to container
        upload_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/{container_id}/archive?path={dest_path}"
        url = f"{self.base_url}/api/{upload_endpoint}"
        
        async with httpx.AsyncClient(verify=False, timeout=120.0) as client:
            try:
                headers = {
                    'X-API-Key': self.api_key,
                    'Content-Type': 'application/x-tar'
                }
                response = await client.put(url, headers=headers, content=tar_data)
                
                if response.status_code < 400:
                    return {'success': True}
                else:
                    return {'error': response.text, 'status_code': response.status_code}
            except Exception as e:
                return {'error': str(e)}


    async def configure_nginx_spa(self, container_name: str) -> Dict[str, Any]:
        """
        Configure Nginx for SPA routing in the specified container
        """
        nginx_conf = '''server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
'''
        
        import tarfile
        import io as std_io
        
        # Create tar with nginx config
        tar_buffer = std_io.BytesIO()
        with tarfile.open(fileobj=tar_buffer, mode='w') as tar:
            conf_info = tarfile.TarInfo(name="default.conf")
            conf_bytes = nginx_conf.encode('utf-8')
            conf_info.size = len(conf_bytes)
            tar.addfile(conf_info, std_io.BytesIO(conf_bytes))
        
        tar_data = tar_buffer.getvalue()
        
        # Upload config
        result = await self.upload_to_container(
            container_name=container_name,
            tar_data=tar_data,
            dest_path="/etc/nginx/conf.d"
        )
        
        if result.get('error'):
            return result
        
        # Reload nginx
        reload_result = await self.exec_in_container(
            container_name=container_name,
            command="nginx -s reload"
        )
        
        return {'success': True, 'message': 'Nginx configured for SPA routing'}

    async def restart_container(self, container_name: str) -> Dict[str, Any]:
        """
        Restart a container by name
        """
        # First, get container ID
        containers_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/json"
        containers = await self._request('GET', containers_endpoint)
        
        container_id = None
        if isinstance(containers, list):
            for c in containers:
                names = c.get('Names', [])
                for name in names:
                    if container_name in name:
                        container_id = c.get('Id')
                        break
                if container_id:
                    break
        
        if not container_id:
            return {'error': f'Container {container_name} not found'}
        
        # Restart container
        restart_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/{container_id}/restart"
        
        async with httpx.AsyncClient(verify=False, timeout=60.0) as client:
            try:
                url = f"{self.base_url}/api/{restart_endpoint}"
                response = await client.post(url, headers=self.headers)
                
                if response.status_code < 400:
                    return {'success': True}
                else:
                    return {'error': response.text, 'status_code': response.status_code}
            except Exception as e:
                return {'error': str(e)}

    async def restart_container_by_id(self, container_id: str) -> Dict[str, Any]:
        """
        Restart a container by its ID directly
        """
        restart_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/{container_id}/restart"
        
        async with httpx.AsyncClient(verify=False, timeout=60.0) as client:
            try:
                url = f"{self.base_url}/api/{restart_endpoint}"
                response = await client.post(url, headers=self.headers)
                
                if response.status_code < 400:
                    return {'success': True}
                else:
                    return {'error': response.text, 'status_code': response.status_code}
            except Exception as e:
                return {'error': str(e)}

    async def get_container_id(self, container_name: str) -> str:
        """Get container ID by name"""
        containers_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/json?all=true"
        containers = await self._request('GET', containers_endpoint)
        
        if isinstance(containers, list):
            for c in containers:
                names = c.get('Names', [])
                for name in names:
                    if container_name in name:
                        return c.get('Id')
        return None

    async def copy_from_template(self, template_container: str, target_container: str, source_path: str, dest_path: str, exclude_files: list = None, flatten_source: bool = False) -> Dict[str, Any]:
        """
        Copy files from template container to target container via Portainer API.
        This enables template-based deployment without external APIs.
        
        Args:
            exclude_files: List of filenames to exclude (e.g., ['config.js'] to preserve tenant config)
            flatten_source: If True, removes the source folder name from paths (e.g., /app/frontend/* -> /app/*)
        """
        logger.info(f"[TEMPLATE-COPY] {template_container}:{source_path} -> {target_container}:{dest_path}")
        if exclude_files:
            logger.info(f"[TEMPLATE-COPY] Excluding files: {exclude_files}")
        
        # Get container IDs
        template_id = await self.get_container_id(template_container)
        target_id = await self.get_container_id(target_container)
        
        if not template_id:
            return {'error': f'Template container {template_container} not found'}
        if not target_id:
            return {'error': f'Target container {target_container} not found'}
        
        async with httpx.AsyncClient(verify=False, timeout=120.0) as client:
            try:
                # Step 1: Download from template container
                download_url = f"{self.base_url}/api/endpoints/{self.endpoint_id}/docker/containers/{template_id}/archive?path={source_path}"
                download_resp = await client.get(download_url, headers=self.headers)
                
                if download_resp.status_code != 200:
                    return {'error': f'Failed to download from template: {download_resp.status_code}'}
                
                tar_data = download_resp.content
                logger.info(f"[TEMPLATE-COPY] Downloaded {len(tar_data)} bytes from template")
                
                # Step 2: Filter out excluded files and optionally flatten paths
                source_folder_name = os.path.basename(source_path.rstrip('/'))  # e.g., 'frontend'
                
                if exclude_files or flatten_source:
                    filtered_tar = std_io.BytesIO()
                    with tarfile.open(fileobj=std_io.BytesIO(tar_data), mode='r') as src_tar:
                        with tarfile.open(fileobj=filtered_tar, mode='w') as dst_tar:
                            for member in src_tar.getmembers():
                                # Check if this file should be excluded
                                filename = os.path.basename(member.name)
                                if exclude_files and filename in exclude_files:
                                    logger.info(f"[TEMPLATE-COPY] Excluding: {member.name}")
                                    continue
                                
                                # Flatten paths if needed (remove source folder prefix)
                                if flatten_source and member.name.startswith(source_folder_name + '/'):
                                    new_name = member.name[len(source_folder_name) + 1:]  # Remove 'frontend/'
                                    if not new_name:  # Skip the root folder itself
                                        continue
                                    member.name = new_name
                                elif flatten_source and member.name == source_folder_name:
                                    continue  # Skip the root folder entry
                                
                                # Copy the member
                                if member.isfile():
                                    dst_tar.addfile(member, src_tar.extractfile(member))
                                else:
                                    dst_tar.addfile(member)
                    tar_data = filtered_tar.getvalue()
                    logger.info(f"[TEMPLATE-COPY] Filtered tar size: {len(tar_data)} bytes")
                
                # Step 3: Upload to target container
                upload_url = f"{self.base_url}/api/endpoints/{self.endpoint_id}/docker/containers/{target_id}/archive?path={dest_path}"
                upload_headers = {**self.headers, 'Content-Type': 'application/x-tar'}
                upload_resp = await client.put(upload_url, headers=upload_headers, content=tar_data)
                
                if upload_resp.status_code != 200:
                    return {'error': f'Failed to upload to target: {upload_resp.status_code} - {upload_resp.text}'}
                
                logger.info(f"[TEMPLATE-COPY] Successfully copied to {target_container}")
                return {'success': True, 'bytes_copied': len(tar_data)}
                
            except Exception as e:
                logger.error(f"[TEMPLATE-COPY] Error: {str(e)}")
                return {'error': str(e)}

    async def _get_existing_config_url(self, container_name: str) -> Optional[str]:
        """
        Read existing config.js from container and extract the API URL.
        This is used to PRESERVE the API URL during template updates.
        """
        try:
            # Execute cat command to read config.js
            result = await self.exec_in_container(
                container_name, 
                "cat /usr/share/nginx/html/config.js 2>/dev/null || echo ''"
            )
            
            if result.get('success'):
                output = result.get('output', '')
                
                # Handle both string and dict output formats
                if isinstance(output, dict):
                    output = output.get('text', '') or output.get('output', '')
                
                if output:
                    # Clean any control characters
                    import re
                    output = re.sub(r'[\x00-\x1f]', '', str(output))
                    
                    # Parse: window.REACT_APP_BACKEND_URL = "https://api.example.com";
                    match = re.search(r'window\.REACT_APP_BACKEND_URL\s*=\s*["\']([^"\']+)["\']', output)
                    if match:
                        url = match.group(1)
                        logger.info(f"[CONFIG-READ] Found existing API URL in {container_name}: {url}")
                        return url
            
            logger.warning(f"[CONFIG-READ] No existing config.js found in {container_name}")
            return None
            
        except Exception as e:
            logger.error(f"[CONFIG-READ] Error reading config.js from {container_name}: {str(e)}")
            return None

    async def create_config_js(self, container_name: str, api_url: str) -> Dict[str, Any]:
        """
        Create config.js file with runtime API URL in frontend container
        """
        import tarfile
        import io as std_io
        
        config_content = f'window.REACT_APP_BACKEND_URL = "{api_url}";'
        
        tar_buffer = std_io.BytesIO()
        with tarfile.open(fileobj=tar_buffer, mode='w') as tar:
            config_info = tarfile.TarInfo(name="config.js")
            config_bytes = config_content.encode('utf-8')
            config_info.size = len(config_bytes)
            tar.addfile(config_info, std_io.BytesIO(config_bytes))
        
        tar_data = tar_buffer.getvalue()
        
        result = await self.upload_to_container(
            container_name=container_name,
            tar_data=tar_data,
            dest_path="/usr/share/nginx/html"
        )
        
        if result.get('success'):
            logger.info(f"[CONFIG] Created config.js for {container_name} with API_URL={api_url}")
        
        return result

    async def install_backend_dependencies(self, container_name: str) -> Dict[str, Any]:
        """
        Install Python dependencies in backend container via exec
        """
        logger.info(f"[DEPS] Installing dependencies in {container_name}")
        
        container_id = await self.get_container_id(container_name)
        if not container_id:
            return {'error': f'Container {container_name} not found'}
        
        # Wait for container to be running
        import asyncio
        for _ in range(10):
            containers = await self._request('GET', f"endpoints/{self.endpoint_id}/docker/containers/json")
            for c in containers:
                if c.get('Id') == container_id:
                    if c.get('State') == 'running':
                        break
            await asyncio.sleep(2)
        
        # Create and run exec - bcrypt version pinned to avoid passlib compatibility issues
        exec_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/{container_id}/exec"
        exec_payload = {
            'Cmd': ['pip', 'install', 'motor', 'python-jose', 'passlib[bcrypt]', 'python-dotenv', 'httpx', 'bcrypt==4.0.1', '--quiet'],
            'AttachStdout': True,
            'AttachStderr': True
        }
        
        result = await self._request('POST', exec_endpoint, data=exec_payload)
        
        if 'Id' in result:
            exec_id = result['Id']
            async with httpx.AsyncClient(verify=False, timeout=180.0) as client:
                start_url = f"{self.base_url}/api/endpoints/{self.endpoint_id}/docker/exec/{exec_id}/start"
                await client.post(start_url, headers=self.headers, json={'Detach': False})
            
            logger.info(f"[DEPS] Dependencies installed in {container_name}")
            return {'success': True}
        
        return {'error': 'Failed to create exec', 'details': result}

    async def full_tenant_deployment(self, company_code: str, domain: str, admin_email: str, admin_password: str, mongo_port: int, backend_port: int = None) -> Dict[str, Any]:
        """
        Complete tenant deployment after stack creation:
        1. Copy frontend from template
        2. Copy backend from template
        3. Install backend dependencies
        4. Create config.js with API URL
        5. Setup database with admin user
        6. Restart containers
        
        All operations via Portainer API - no external dependencies
        """
        safe_code = company_code.replace('-', '').replace('_', '')
        frontend_container = f"{safe_code}_frontend"
        backend_container = f"{safe_code}_backend"
        db_name = f"{safe_code}_db"
        
        # Use IP-based URL for API (domain DNS may not be configured)
        if backend_port:
            api_url = f"http://{SERVER_IP}:{backend_port}"
        else:
            api_url = f"https://api.{domain}"
        
        results = {
            'frontend_copy': None,
            'backend_copy': None,
            'deps_install': None,
            'config_js': None,
            'nginx_config': None,
            'db_setup': None
        }
        
        logger.info(f"[FULL-DEPLOY] Starting deployment for {company_code} ({domain})")
        
        # Wait for containers to start
        import asyncio
        await asyncio.sleep(10)
        
        try:
            # Step 1: Copy frontend from template (config.js will be created separately with correct URL)
            logger.info(f"[FULL-DEPLOY] Step 1: Copying frontend...")
            results['frontend_copy'] = await self.copy_from_template(
                template_container="rentacar_template_frontend",
                target_container=frontend_container,
                source_path="/usr/share/nginx/html",
                dest_path="/usr/share/nginx",
                exclude_files=["config.js"]
            )
            
            # Step 2: Copy backend from template (exclude .env - will be created with tenant settings)
            logger.info(f"[FULL-DEPLOY] Step 2: Copying backend...")
            results['backend_copy'] = await self.copy_from_template(
                template_container="rentacar_template_backend",
                target_container=backend_container,
                source_path="/app",
                dest_path="/",
                exclude_files=[".env"]
            )
            
            # Step 3: Install backend dependencies
            logger.info(f"[FULL-DEPLOY] Step 3: Installing dependencies...")
            results['deps_install'] = await self.install_backend_dependencies(backend_container)
            
            # Step 4: Create config.js
            logger.info(f"[FULL-DEPLOY] Step 4: Creating config.js...")
            results['config_js'] = await self.create_config_js(frontend_container, api_url)
            
            # Step 5: Configure Nginx for SPA
            logger.info(f"[FULL-DEPLOY] Step 5: Configuring Nginx...")
            results['nginx_config'] = await self.configure_nginx_spa(frontend_container)
            
            # Step 6: Setup database - this needs MongoDB connection
            logger.info(f"[FULL-DEPLOY] Step 6: Setting up database...")
            results['db_setup'] = await self.setup_tenant_database(
                mongo_port=mongo_port,
                db_name=db_name,
                admin_email=admin_email,
                admin_password=admin_password
            )
            
            # Step 7: Restart containers
            logger.info(f"[FULL-DEPLOY] Step 7: Restarting containers...")
            await self.restart_container(backend_container)
            await asyncio.sleep(3)
            await self.restart_container(frontend_container)
            
            logger.info(f"[FULL-DEPLOY] Deployment complete for {company_code}")
            
            return {
                'success': True,
                'message': f'Tenant {company_code} fully deployed',
                'results': results,
                'urls': {
                    'website': f'https://{domain}',
                    'panel': f'https://panel.{domain}',
                    'api': api_url
                },
                'credentials': {
                    'email': admin_email,
                    'password': admin_password
                }
            }
            
        except Exception as e:
            logger.error(f"[FULL-DEPLOY] Error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'results': results
            }

    async def setup_tenant_database(self, mongo_port: int, db_name: str, admin_email: str, admin_password: str) -> Dict[str, Any]:
        """
        Setup tenant MongoDB with admin user.
        Creates password hash inside the backend container for bcrypt compatibility.
        """
        import uuid
        from datetime import datetime, timezone
        
        try:
            # Generate user data
            user_id = str(uuid.uuid4())
            created_at = datetime.now(timezone.utc).isoformat()
            
            # Get backend container name from db_name
            safe_code = db_name.replace('_db', '')
            backend_container = f"{safe_code}_backend"
            
            container_id = await self.get_container_id(backend_container)
            if not container_id:
                # Fallback: hash locally
                from passlib.context import CryptContext
                pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                password_hash = pwd_context.hash(admin_password)
            else:
                # Create hash inside container for bcrypt compatibility
                import asyncio
                await asyncio.sleep(5)  # Wait for container to be ready
                
                exec_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/{container_id}/exec"
                hash_cmd = f"python3 -c \"from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('{admin_password}'))\""
                
                exec_result = await self._request('POST', exec_endpoint, data={
                    'Cmd': ['sh', '-c', hash_cmd],
                    'AttachStdout': True,
                    'AttachStderr': True
                })
                
                if 'Id' in exec_result:
                    exec_id = exec_result['Id']
                    async with httpx.AsyncClient(verify=False, timeout=30) as client:
                        start_resp = await client.post(
                            f"{self.base_url}/api/endpoints/{self.endpoint_id}/docker/exec/{exec_id}/start",
                            headers=self.headers,
                            json={"Detach": False}
                        )
                        # Parse hash from output
                        output = start_resp.text.strip()
                        # Find the bcrypt hash in output
                        import re
                        hash_match = re.search(r'\$2[aby]\$\d+\$[A-Za-z0-9./]{53}', output)
                        if hash_match:
                            password_hash = hash_match.group()
                        else:
                            # Fallback to local hash
                            from passlib.context import CryptContext
                            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                            password_hash = pwd_context.hash(admin_password)
                else:
                    from passlib.context import CryptContext
                    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                    password_hash = pwd_context.hash(admin_password)
            
            # Connect to tenant MongoDB and create user
            from motor.motor_asyncio import AsyncIOMotorClient
            
            mongo_url = f"mongodb://{SERVER_IP}:{mongo_port}"
            client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=30000)
            tenant_db = client[db_name]
            
            # Check if admin already exists
            existing = await tenant_db.users.find_one({"email": admin_email})
            
            if not existing:
                admin_user = {
                    "id": user_id,
                    "email": admin_email,
                    "password_hash": password_hash,
                    "full_name": "Firma Admin",
                    "role": "firma_admin",
                    "company_id": None,
                    "is_active": True,
                    "created_at": created_at
                }
                await tenant_db.users.insert_one(admin_user)
                logger.info(f"[DB-SETUP] Admin user created: {admin_email}")
                result = {'success': True, 'admin_email': admin_email, 'admin_password': admin_password, 'created': True}
            else:
                logger.info(f"[DB-SETUP] Admin user already exists: {admin_email}")
                result = {'success': True, 'admin_email': admin_email, 'created': False, 'already_exists': True}
            
            client.close()
            return result
            
        except Exception as e:
            logger.error(f"[DB-SETUP] Error: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def update_master_template_from_superadmin(self) -> Dict[str, Any]:
        """
        Update the master template containers by copying from superadmin frontend.
        This ensures the template has the latest code from the current deployment.
        """
        results = {
            'frontend_copy': None,
            'template_restart': None
        }
        
        logger.info("[MASTER-TEMPLATE] Starting master template update from superadmin...")
        
        try:
            # Step 1: Copy frontend files from superadmin_frontend to rentacar_template_frontend
            logger.info("[MASTER-TEMPLATE] Step 1: Copying frontend from superadmin to template...")
            
            # Get superadmin frontend container ID
            superadmin_frontend_id = await self.get_container_id("superadmin_frontend")
            template_frontend_id = await self.get_container_id("rentacar_template_frontend")
            
            if not superadmin_frontend_id:
                return {
                    'success': False,
                    'error': 'superadmin_frontend container bulunamadı'
                }
            
            if not template_frontend_id:
                return {
                    'success': False,
                    'error': 'rentacar_template_frontend container bulunamadı'
                }
            
            # Download from superadmin
            download_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/{superadmin_frontend_id}/archive?path=/usr/share/nginx/html"
            
            async with httpx.AsyncClient(verify=False, timeout=120.0) as client:
                # Download from superadmin
                download_response = await client.get(
                    f"{self.base_url}/api/{download_endpoint}",
                    headers=self.headers
                )
                
                if download_response.status_code != 200:
                    return {
                        'success': False,
                        'error': f'Superadmin frontend dosyaları alınamadı: {download_response.status_code}'
                    }
                
                tar_content = download_response.content
                logger.info(f"[MASTER-TEMPLATE] Downloaded {len(tar_content)} bytes from superadmin")
                
                # Upload to template
                upload_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/{template_frontend_id}/archive?path=/usr/share/nginx"
                upload_response = await client.put(
                    f"{self.base_url}/api/{upload_endpoint}",
                    headers={'X-API-Key': self.api_key, 'Content-Type': 'application/x-tar'},
                    content=tar_content
                )
                
                if upload_response.status_code in [200, 204]:
                    results['frontend_copy'] = {'success': True, 'size': len(tar_content)}
                    logger.info("[MASTER-TEMPLATE] Frontend files copied to template")
                else:
                    results['frontend_copy'] = {'success': False, 'error': upload_response.text}
            
            # Step 2: Restart template container
            logger.info("[MASTER-TEMPLATE] Step 2: Restarting template container...")
            results['template_restart'] = await self.restart_container("rentacar_template_frontend")
            
            logger.info("[MASTER-TEMPLATE] Master template update complete!")
            
            return {
                'success': True,
                'message': 'Master template güncellendi',
                'results': results
            }
            
        except Exception as e:
            logger.error(f"[MASTER-TEMPLATE] Error: {str(e)}")
            import traceback
            logger.error(f"[MASTER-TEMPLATE] Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': str(e),
                'results': results
            }

    async def update_master_template_from_local(self, frontend_build_path: str, backend_path: str) -> Dict[str, Any]:
        """
        Update master template container from local /app/template folder.
        This is used when template is synced from GitHub.
        
        Args:
            frontend_build_path: Path to frontend build folder (/app/frontend/build)
            backend_path: Path to backend code (/app/template/backend)
        """
        results = {
            'frontend_upload': None,
            'backend_upload': None,
            'template_restart': None
        }
        
        try:
            # Step 1: Find template container
            containers = await self._request('GET', f"endpoints/{self.endpoint_id}/docker/containers/json")
            template_frontend_id = None
            template_backend_id = None
            
            for c in containers:
                names = c.get('Names', [])
                for name in names:
                    if 'rentacar_template_frontend' in name:
                        template_frontend_id = c.get('Id')
                    elif 'rentacar_template_backend' in name:
                        template_backend_id = c.get('Id')
            
            # Step 2: Upload frontend build if path exists
            if os.path.exists(frontend_build_path) and template_frontend_id:
                logger.info(f"[MASTER-TEMPLATE-LOCAL] Uploading frontend from {frontend_build_path}")
                
                # Create tar of build folder
                tar_buffer = std_io.BytesIO()
                with tarfile.open(fileobj=tar_buffer, mode='w') as tar:
                    for root, dirs, files in os.walk(frontend_build_path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, frontend_build_path)
                            if not arcname.startswith('downloads/'):
                                tar.add(file_path, arcname=arcname)
                
                tar_data = tar_buffer.getvalue()
                logger.info(f"[MASTER-TEMPLATE-LOCAL] Frontend tar size: {len(tar_data)} bytes")
                
                # Clean and upload
                await self.exec_in_container("rentacar_template_frontend", 
                    "rm -rf /usr/share/nginx/html/* && mkdir -p /usr/share/nginx/html/static/js /usr/share/nginx/html/static/css")
                
                upload_result = await self.upload_to_container(
                    container_name="rentacar_template_frontend",
                    tar_data=tar_data,
                    dest_path="/usr/share/nginx/html"
                )
                results['frontend_upload'] = upload_result
            else:
                logger.warning(f"[MASTER-TEMPLATE-LOCAL] Frontend build not found at {frontend_build_path}")
                results['frontend_upload'] = {'skipped': True, 'reason': 'build not found'}
            
            # Step 3: Upload backend code if path exists
            if os.path.exists(backend_path) and template_backend_id:
                logger.info(f"[MASTER-TEMPLATE-LOCAL] Uploading backend from {backend_path}")
                
                # Create tar of backend folder
                tar_buffer = std_io.BytesIO()
                with tarfile.open(fileobj=tar_buffer, mode='w') as tar:
                    server_py = os.path.join(backend_path, 'server.py')
                    requirements = os.path.join(backend_path, 'requirements.txt')
                    
                    if os.path.exists(server_py):
                        tar.add(server_py, arcname='server.py')
                    if os.path.exists(requirements):
                        tar.add(requirements, arcname='requirements.txt')
                
                tar_data = tar_buffer.getvalue()
                
                upload_result = await self.upload_to_container(
                    container_name="rentacar_template_backend",
                    tar_data=tar_data,
                    dest_path="/app"
                )
                results['backend_upload'] = upload_result
            else:
                results['backend_upload'] = {'skipped': True, 'reason': 'backend not found'}
            
            # Step 4: Restart template containers
            if template_frontend_id:
                results['template_restart'] = await self.restart_container("rentacar_template_frontend")
            
            logger.info("[MASTER-TEMPLATE-LOCAL] Local template update complete!")
            
            return {
                'success': True,
                'message': 'Master template updated from local folder',
                'results': results
            }
            
        except Exception as e:
            logger.error(f"[MASTER-TEMPLATE-LOCAL] Error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'results': results
            }

    async def update_tenant_from_template(self, company_code: str, domain: str) -> Dict[str, Any]:
        """
        Update existing tenant from template WITHOUT touching database.
        
        SAFE UPDATE FLOW (prevents crash loops):
        1. STOP backend container first
        2. Copy backend code to volume
        3. Install dependencies
        4. START backend container
        5. Update frontend (Nginx stays running)
        6. Reload Nginx
        
        DOES NOT TOUCH:
        - MongoDB data (customers, vehicles, reservations, etc.)
        - Admin credentials
        - Theme settings stored in DB
        - config.js API URL (PRESERVED from existing config)
        """
        safe_code = company_code.replace('-', '').replace('_', '')
        frontend_container = f"{safe_code}_frontend"
        backend_container = f"{safe_code}_backend"
        
        # CRITICAL: First, read existing config.js to preserve API URL
        existing_api_url = await self._get_existing_config_url(frontend_container)
        
        # ALWAYS use HTTPS domain URL if domain exists - this is the PRIMARY rule
        if domain:
            api_url = f"https://api.{domain}"
            logger.info(f"[UPDATE-TEMPLATE] Using HTTPS domain URL (PRIMARY): {api_url}")
        elif existing_api_url and existing_api_url.startswith("https://"):
            # Fallback: PRESERVE existing HTTPS URL if no domain
            api_url = existing_api_url
            logger.info(f"[UPDATE-TEMPLATE] PRESERVING existing HTTPS URL: {api_url}")
        else:
            # Last resort fallback - should never happen for production tenants
            backend_port = await self._get_container_port(backend_container)
            if backend_port:
                api_url = f"http://72.61.158.147:{backend_port}"
            else:
                api_url = f"http://72.61.158.147:8001"
            logger.warning(f"[UPDATE-TEMPLATE] WARNING: No domain, using HTTP fallback: {api_url}")
        
        results = {
            'backend_stop': None,
            'backend_copy': None,
            'deps_install': None,
            'backend_start': None,
            'frontend_copy': None,
            'config_js': None,
            'nginx_config': None,
            'nginx_reload': None,
            'preserved_url': existing_api_url
        }
        
        logger.info(f"[UPDATE-TEMPLATE] Starting SAFE template update for {company_code} ({domain})")
        
        try:
            import asyncio
            
            # ===== BACKEND UPDATE (STOP -> COPY -> INSTALL -> START) =====
            
            # Step 1: STOP backend container FIRST to prevent crash loops
            logger.info(f"[UPDATE-TEMPLATE] Step 1: STOPPING backend container...")
            results['backend_stop'] = await self.stop_container(backend_container)
            
            # Wait for container to fully stop
            await self.wait_for_container_state(backend_container, 'exited', timeout=30)
            await asyncio.sleep(2)
            
            # Step 2: Copy backend code while container is STOPPED
            logger.info(f"[UPDATE-TEMPLATE] Step 2: Copying backend code (container stopped)...")
            results['backend_copy'] = await self.copy_from_template(
                template_container="rentacar_template_backend",
                target_container=backend_container,
                source_path="/app",
                dest_path="/",
                exclude_files=[".env"]
            )
            
            # Step 3: START backend container (it will install deps on startup via compose command)
            logger.info(f"[UPDATE-TEMPLATE] Step 3: STARTING backend container...")
            results['backend_start'] = await self.start_container(backend_container)
            
            # Wait for backend to be running
            await self.wait_for_container_state(backend_container, 'running', timeout=30)
            await asyncio.sleep(5)  # Extra wait for pip install in compose command
            
            # Step 4: Install/Update dependencies (if needed - belt and suspenders approach)
            logger.info(f"[UPDATE-TEMPLATE] Step 4: Ensuring dependencies installed...")
            results['deps_install'] = await self.install_backend_dependencies(backend_container)
            
            # ===== FRONTEND UPDATE (NO STOP NEEDED - Nginx handles gracefully) =====
            
            # Step 5: Copy frontend files (EXCLUDE config.js to preserve tenant API URL)
            logger.info(f"[UPDATE-TEMPLATE] Step 5: Copying frontend code (excluding config.js)...")
            results['frontend_copy'] = await self.copy_from_template(
                template_container="rentacar_template_frontend",
                target_container=frontend_container,
                source_path="/usr/share/nginx/html",
                dest_path="/usr/share/nginx",
                exclude_files=["config.js"]
            )
            
            # Step 6: Write config.js with correct URL
            logger.info(f"[UPDATE-TEMPLATE] Step 6: Writing config.js with URL: {api_url}")
            results['config_js'] = await self.create_config_js(frontend_container, api_url)
            
            # Step 7: Configure Nginx for SPA routing
            logger.info(f"[UPDATE-TEMPLATE] Step 7: Updating Nginx config...")
            results['nginx_config'] = await self.configure_nginx_spa(frontend_container)
            
            # Step 8: Reload nginx to pick up new config
            logger.info(f"[UPDATE-TEMPLATE] Step 8: Reloading Nginx...")
            await self.exec_in_container(frontend_container, "nginx -s reload")
            results['nginx_reload'] = {'success': True}
            
            # Step 9: Final verification
            await asyncio.sleep(2)
            final_url = await self._get_existing_config_url(frontend_container)
            results['final_config_url'] = final_url
            logger.info(f"[UPDATE-TEMPLATE] Final config.js URL: {final_url}")
            
            # Step 10: Verify backend is healthy
            backend_health = await self._check_backend_health(backend_container)
            results['backend_health'] = backend_health
            
            # Step 11: Optional - Update mobile apps if containers exist
            try:
                containers = await self.get_containers()
                container_names = [c.get('Names', [''])[0].replace('/', '') for c in containers]
                
                customer_app_container = f"{safe_code}_customer_app"
                operation_app_container = f"{safe_code}_operation_app"
                
                if customer_app_container in container_names:
                    logger.info(f"[UPDATE-TEMPLATE] Step 11a: Updating customer mobile app...")
                    company_name = os.environ.get('COMPANY_NAME', company_code.replace('_', ' ').title())
                    results['customer_app_copy'] = await self.copy_mobile_app_to_tenant(
                        company_code=company_code,
                        app_type='customer',
                        company_name=company_name,
                        domain=domain
                    )
                
                if operation_app_container in container_names:
                    logger.info(f"[UPDATE-TEMPLATE] Step 11b: Updating operation mobile app...")
                    company_name = os.environ.get('COMPANY_NAME', company_code.replace('_', ' ').title())
                    results['operation_app_copy'] = await self.copy_mobile_app_to_tenant(
                        company_code=company_code,
                        app_type='operation',
                        company_name=company_name,
                        domain=domain
                    )
            except Exception as mobile_error:
                logger.warning(f"[UPDATE-TEMPLATE] Mobile app update skipped: {mobile_error}")
            
            logger.info(f"[UPDATE-TEMPLATE] ✓ Template update COMPLETE for {company_code}")
            
            return {
                'success': True,
                'message': f'Tenant {company_code} updated from template successfully',
                'company_code': company_code,
                'domain': domain,
                'results': results,
                'note': 'Database verileri korundu. Sadece kod güncellendi. Backend güvenli şekilde güncellendi (stop->copy->start).'
            }
            
        except Exception as e:
            logger.error(f"[UPDATE-TEMPLATE] Error: {str(e)}")
            
            # Emergency recovery: try to start backend if it was stopped
            try:
                logger.info(f"[UPDATE-TEMPLATE] Emergency recovery: ensuring backend is running...")
                await self.start_container(backend_container)
            except:
                pass
            
            return {
                'success': False,
                'error': str(e),
                'company_code': company_code,
                'results': results,
                'recovery_attempted': True
            }

    async def _check_backend_health(self, container_name: str) -> Dict[str, Any]:
        """
        Check if backend container is healthy and responding
        """
        try:
            # Check container state
            containers_endpoint = f"endpoints/{self.endpoint_id}/docker/containers/json"
            containers = await self._request('GET', containers_endpoint)
            
            for c in containers:
                names = c.get('Names', [])
                for name in names:
                    if container_name in name:
                        state = c.get('State', '')
                        status = c.get('Status', '')
                        return {
                            'running': state == 'running',
                            'state': state,
                            'status': status
                        }
            
            return {'running': False, 'error': 'Container not found'}
        except Exception as e:
            return {'running': False, 'error': str(e)}

    async def update_master_template(self, frontend_tar_path: str = None, backend_files: dict = None) -> Dict[str, Any]:
        """
        Update the master template containers with new code.
        This is used to push updates that will then be available for tenant updates.
        
        Args:
            frontend_tar_path: Path to frontend build tar file
            backend_files: Dict of {filename: content} for backend files to update
        """
        template_frontend = "rentacar_template_frontend"
        template_backend = "rentacar_template_backend"
        
        results = {
            'frontend_update': None,
            'backend_update': None,
            'frontend_restart': None,
            'backend_restart': None
        }
        
        logger.info("[MASTER-TEMPLATE] Starting master template update...")
        
        try:
            # Update frontend if tar provided
            if frontend_tar_path:
                logger.info("[MASTER-TEMPLATE] Updating frontend template...")
                # Copy tar to container and extract
                copy_cmd = f"docker cp {frontend_tar_path} {template_frontend}:/tmp/frontend_update.tar.gz"
                extract_cmd = f"docker exec {template_frontend} sh -c 'cd /usr/share/nginx/html && tar -xzf /tmp/frontend_update.tar.gz --strip-components=1 && rm /tmp/frontend_update.tar.gz'"
                
                import subprocess
                copy_result = subprocess.run(copy_cmd, shell=True, capture_output=True, text=True)
                extract_result = subprocess.run(extract_cmd, shell=True, capture_output=True, text=True)
                
                results['frontend_update'] = {
                    'copy': copy_result.returncode == 0,
                    'extract': extract_result.returncode == 0
                }
            
            # Update backend files if provided
            if backend_files:
                logger.info("[MASTER-TEMPLATE] Updating backend template...")
                import subprocess
                import tempfile
                import os
                
                for filename, content in backend_files.items():
                    # Write to temp file
                    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                        f.write(content)
                        temp_path = f.name
                    
                    # Copy to container
                    dest_path = f"/app/{filename}"
                    copy_cmd = f"docker cp {temp_path} {template_backend}:{dest_path}"
                    result = subprocess.run(copy_cmd, shell=True, capture_output=True, text=True)
                    
                    # Cleanup temp file
                    os.unlink(temp_path)
                    
                    if result.returncode != 0:
                        logger.error(f"[MASTER-TEMPLATE] Failed to update {filename}: {result.stderr}")
                
                results['backend_update'] = True
            
            # Restart template containers
            logger.info("[MASTER-TEMPLATE] Restarting template containers...")
            if frontend_tar_path:
                results['frontend_restart'] = await self.restart_container(template_frontend)
            if backend_files:
                results['backend_restart'] = await self.restart_container(template_backend)
            
            logger.info("[MASTER-TEMPLATE] Master template update complete!")
            
            return {
                'success': True,
                'message': 'Master template updated successfully',
                'results': results,
                'note': 'Şimdi tenant\'ları güncellemek için "Template\'den Güncelle" butonunu kullanabilirsiniz.'
            }
            
        except Exception as e:
            logger.error(f"[MASTER-TEMPLATE] Error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'results': results
            }

    async def get_tenant_support_tickets(self, company_code: str) -> list:
        """Get support tickets from tenant's database via container exec"""
        try:
            backend_container = f"{company_code}_backend"
            mongo_host = f"{company_code}_mongodb"
            db_name = f"{company_code}_db"
            
            cmd = f'''python3 -c "
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio, json

async def get():
    c = AsyncIOMotorClient('mongodb://{mongo_host}:27017')
    db = c['{db_name}']
    tickets = await db.support_tickets.find({{}}, {{'_id': 0}}).to_list(50)
    print(json.dumps(tickets, default=str))

asyncio.run(get())
"'''
            
            result = await self.exec_in_container(backend_container, cmd)
            if result.get("success"):
                output = result.get("output", {}).get("text", "[]")
                # Clean control characters and find JSON array
                output = output.replace("\x01", " ").strip()
                import re
                match = re.search(r'\[.*\]', output, re.DOTALL)
                if match:
                    import json
                    return json.loads(match.group())
            return []
        except Exception as e:
            logger.warning(f"Error getting tickets from {company_code}: {e}")
            return []

    # ============== MOBILE APP TEMPLATE FUNCTIONS ==============
    
    async def update_mobile_template_from_github(self, app_type: str, github_repo: str) -> Dict[str, Any]:
        """
        Clone/pull mobile app from GitHub to template container.
        app_type: 'customer' or 'operation'
        github_repo: e.g., 'vegabyte-emre/vega-rent-customer-app'
        
        Uses git pull if .git exists, otherwise fresh clone.
        """
        container_name = f"rentacar_template_{app_type}_app"
        results = {
            'clone': None,
            'install': None,
            'eas_install': None
        }
        
        try:
            logger.info(f"[MOBILE-TEMPLATE] Updating {app_type} app from GitHub: {github_repo}")
            
            # Step 1: Check if .git exists and either pull or fresh clone
            clone_cmd = f"""
if [ -d "/app/.git" ]; then
    echo "Git repo exists, pulling latest..."
    cd /app && git fetch --all && git reset --hard origin/main 2>&1 || git reset --hard origin/master 2>&1
else
    echo "Fresh clone..."
    rm -rf /app/* /app/.* 2>/dev/null || true
    cd /app && git clone --depth 1 https://github.com/{github_repo}.git . 2>&1
fi
"""
            clone_result = await self.exec_in_container(container_name, clone_cmd)
            results['clone'] = clone_result
            
            # Check for actual errors (not just warnings)
            clone_output = str(clone_result.get('output', {}).get('text', ''))
            if 'fatal:' in clone_output and 'already exists' not in clone_output:
                return {'success': False, 'error': f'Git clone/pull failed: {clone_output}', 'results': results}
            
            # Step 2: Install dependencies
            logger.info(f"[MOBILE-TEMPLATE] Installing dependencies...")
            install_cmd = "cd /app && yarn install 2>&1 || npm install 2>&1"
            install_result = await self.exec_in_container(container_name, install_cmd)
            results['install'] = {'success': True} if install_result.get('success') else install_result
            
            # Step 3: Install EAS CLI globally
            logger.info(f"[MOBILE-TEMPLATE] Installing EAS CLI...")
            eas_cmd = "npm install -g eas-cli@latest 2>&1"
            eas_result = await self.exec_in_container(container_name, eas_cmd)
            results['eas_install'] = {'success': True} if eas_result.get('success') else eas_result
            
            logger.info(f"[MOBILE-TEMPLATE] {app_type} app template updated successfully")
            
            return {
                'success': True,
                'message': f'{app_type} app template updated from GitHub',
                'results': results
            }
            
        except Exception as e:
            logger.error(f"[MOBILE-TEMPLATE] Error updating {app_type} template: {e}")
            return {'success': False, 'error': str(e), 'results': results}

    async def copy_mobile_app_to_tenant(self, company_code: str, app_type: str, 
                                         company_name: str, domain: str) -> Dict[str, Any]:
        """
        Copy mobile app from template to tenant container with tenant-specific config.
        Note: The source code is in /app/frontend in the template container.
        """
        safe_code = company_code.replace('-', '').replace('_', '')
        template_container = f"rentacar_template_{app_type}_app"
        tenant_container = f"{safe_code}_{app_type}_app"
        
        results = {
            'code_copy': None,
            'config_write': None,
            'deps_install': None
        }
        
        try:
            logger.info(f"[MOBILE-COPY] Copying {app_type} app to {company_code}")
            
            # Step 1: Copy code from template/frontend to tenant /app (excluding node_modules and config)
            # The Expo app is in /app/frontend in the cloned repo
            # Use flatten_source=True to remove 'frontend/' prefix so files go directly to /app
            copy_result = await self.copy_from_template(
                template_container=template_container,
                target_container=tenant_container,
                source_path="/app/frontend",  # Expo app is in frontend subfolder
                dest_path="/app",  # Copy directly to /app in tenant container
                exclude_files=["node_modules", "app.config.js", ".env", ".expo", ".metro-cache"],
                flatten_source=True  # Remove 'frontend/' prefix from paths
            )
            results['code_copy'] = copy_result
            
            # Step 2: Write tenant-specific app.config.js
            api_url = f"https://api.{domain}"
            package_name = f"com.{safe_code}.rentacar"
            
            # Expo project IDs (hardcoded for reliability)
            # Note: We use the master project's slug but customize display name and package
            EXPO_PROJECT_IDS = {
                "customer": "11d08a0d-b759-4489-9e3f-fca7161a7029",
                "operation": "af4db31d-9d07-4872-9649-6743df13ba1e"
            }
            EXPO_SLUGS = {
                "customer": "vega-rent",
                "operation": "vega-rent-o-app"
            }
            project_id = EXPO_PROJECT_IDS.get(app_type, "")
            expo_slug = EXPO_SLUGS.get(app_type, f"{safe_code}-{app_type}")
            
            if app_type == "customer":
                app_name = company_name
            else:
                app_name = f"{company_name} Operasyon"
            
            config_content = f'''export default {{
  name: "{app_name}",
  slug: "{expo_slug}",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {{
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  }},
  ios: {{
    supportsTablet: true,
    bundleIdentifier: "{package_name}.{app_type}"
  }},
  android: {{
    adaptiveIcon: {{
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    }},
    package: "{package_name}.{app_type}"
  }},
  web: {{
    favicon: "./assets/favicon.png"
  }},
  extra: {{
    API_URL: "{api_url}",
    COMPANY_NAME: "{company_name}",
    COMPANY_CODE: "{company_code}",
    APP_TYPE: "{app_type}",
    eas: {{
      projectId: "{project_id}"
    }}
  }},
  owner: "emrenasir"
}};
'''
            
            # Write config to container
            config_result = await self.write_file_to_container(
                tenant_container, 
                "/app/app.config.js", 
                config_content
            )
            results['config_write'] = config_result
            
            # Step 2b: Create eas.json for EAS build with Node 22 to avoid engine compatibility issues
            # Use Node.js to write valid JSON (avoids shell/tar escaping issues)
            eas_write_cmd = '''node -e "require('fs').writeFileSync('/app/eas.json', JSON.stringify({cli:{version:'>=3.0.0'},build:{preview:{distribution:'internal',node:'22.12.0',env:{npm_config_engine_strict:'false'},android:{buildType:'apk',credentialsSource:'local'}},production:{node:'22.12.0',env:{npm_config_engine_strict:'false'},android:{credentialsSource:'local'}}}}, null, 2))"'''
            eas_result = await self.exec_in_container(tenant_container, eas_write_cmd)
            results['eas_json_write'] = {'success': eas_result.get('success', False)}
            
            # Step 2c: Create .npmrc to ignore engine checks
            npmrc_cmd = '''sh -c 'echo -e "engine-strict=false\\nignore-engines=true" > /app/.npmrc' '''
            npmrc_result = await self.exec_in_container(tenant_container, npmrc_cmd)
            results['npmrc_write'] = {'success': npmrc_result.get('success', False)}
            
            # Step 2d: Create credentials.json for local signing
            credentials_json = '''{
  "android": {
    "keystore": {
      "keystorePath": "keystore.jks",
      "keystorePassword": "vegarent123",
      "keyAlias": "key0",
      "keyPassword": "vegarent123"
    }
  }
}'''
            creds_result = await self.write_file_to_container(
                tenant_container,
                "/app/credentials.json",
                credentials_json
            )
            results['credentials_write'] = creds_result
            
            # Step 2e: Create default Expo assets if not exist
            logger.info(f"[MOBILE-COPY] Creating Expo assets...")
            assets_cmd = '''node -e "
const fs = require('fs');
const path = require('path');
const assetsDir = '/app/assets';
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, {recursive: true});
// Minimal valid PNG (1x1 transparent)
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAABhklEQVR4nO2aQQ6CMBRF/xtdexNvIG68hTfQhSu3egPcuJOlJ3DhBbiBK1ceQFeu3OgJWLjQGFESlkMNNDT+l7Sh0Pf6+qcQAgICAgICAgIC/gcAcAKA4dXXwRkArgBwAYBzb97cpD0BwB4ANi1T4QUAIwD4tEidMwCsAODY5/hxfPFpEe7LXkLYNAJwBoC3luZb+nRVPiNi/AYAEgCbtuabmq8dgHiVe2lYvq35pvJrA4DfMa7Kax3hM9C25r1z4yb/BABOF67qS2BXALAD8OTN+5r3yY+fmB8AgHnHeLzKrYGOXYGObQHLV3lDl+ATEJcA3Fx9nT8A/Iry1wI9uwJ9OwImnYDXWn7rGuQ9ATsAuGnZ/FYB/FoLOK0FrNb8ZmuB0wqgYUfA9FXesivQ0hVwfJU3dAVMXwGnV7n5KnfsCli+ys1X+fRVbnqVa8kfAcBxy+a3CuDXWsBpLWC15jdbc5xWAA07AqavcsutgJaugOOr3HAr0PIVcHqVG65yLfkDAgL+PO4kzPF+I0YAAAAASUVORK5CYII=', 'base64');
['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png'].forEach(f => {
    const fp = path.join(assetsDir, f);
    if (!fs.existsSync(fp)) fs.writeFileSync(fp, png);
});
console.log('Assets ready');
"'''
            assets_result = await self.exec_in_container(tenant_container, assets_cmd)
            results['assets_create'] = {'success': assets_result.get('success', False)}
            
            # Step 2f: Generate Android keystore if not exists
            logger.info(f"[MOBILE-COPY] Generating Android keystore...")
            keystore_cmd = f'''
if [ ! -f /app/keystore.jks ]; then
    apk add --no-cache openjdk17-jre-headless 2>/dev/null || true
    keytool -genkeypair -v -keystore /app/keystore.jks -alias key0 -keyalg RSA -keysize 2048 -validity 10000 -storepass vegarent123 -keypass vegarent123 -dname "CN={company_name}, OU=Mobile, O=Vega Byte, L=Istanbul, ST=Istanbul, C=TR" 2>&1
    echo "Keystore generated"
else
    echo "Keystore already exists"
fi
'''
            keystore_result = await self.exec_in_container(tenant_container, keystore_cmd)
            results['keystore_gen'] = {'success': keystore_result.get('success', False)}
            
            # Step 3: Install dependencies in tenant container (with --ignore-engines flag)
            logger.info(f"[MOBILE-COPY] Installing dependencies in {tenant_container}...")
            deps_result = await self.exec_in_container(
                tenant_container, 
                "cd /app && yarn install --ignore-engines 2>&1 || npm install --legacy-peer-deps 2>&1"
            )
            results['deps_install'] = {'success': deps_result.get('success', False)}
            
            # Step 4: Install EAS CLI
            await self.exec_in_container(tenant_container, "npm install -g eas-cli@latest 2>&1")
            
            logger.info(f"[MOBILE-COPY] {app_type} app copied to {company_code} successfully")
            
            return {
                'success': True,
                'message': f'{app_type} app copied to tenant with config',
                'results': results
            }
            
        except Exception as e:
            logger.error(f"[MOBILE-COPY] Error: {e}")
            return {'success': False, 'error': str(e), 'results': results}

    async def write_file_to_container(self, container_name: str, file_path: str, content: str) -> Dict[str, Any]:
        """Write a file to a container using tar upload"""
        try:
            # Create tar with the file
            tar_buffer = std_io.BytesIO()
            with tarfile.open(fileobj=tar_buffer, mode='w') as tar:
                file_data = content.encode('utf-8')
                file_info = tarfile.TarInfo(name=os.path.basename(file_path))
                file_info.size = len(file_data)
                tar.addfile(file_info, std_io.BytesIO(file_data))
            
            tar_data = tar_buffer.getvalue()
            dest_dir = os.path.dirname(file_path)
            
            result = await self.upload_to_container(container_name, tar_data, dest_dir)
            return result
            
        except Exception as e:
            logger.error(f"Error writing file to container: {e}")
            return {'success': False, 'error': str(e)}

    async def trigger_eas_build(self, company_code: str, app_type: str) -> Dict[str, Any]:
        """
        Trigger EAS build in tenant's mobile container.
        Returns build ID for status tracking.
        
        Steps:
        1. Install EAS CLI if not present
        2. Login to Expo with token
        3. Initialize EAS project if not configured
        4. Run eas build
        """
        safe_code = company_code.replace('-', '').replace('_', '')
        container_name = f"{safe_code}_{app_type}_app"
        
        # Get Expo credentials - use hardcoded values for reliability
        expo_token = os.environ.get("EXPO_TOKEN", "vIg74dANrrkDXdDtOl6jSOmGRkKld9EKBhBxfKM3")
        EXPO_PROJECT_IDS = {
            "customer": "11d08a0d-b759-4489-9e3f-fca7161a7029",
            "operation": "af4db31d-9d07-4872-9649-6743df13ba1e"
        }
        expo_project_id = EXPO_PROJECT_IDS.get(app_type, "")
        
        try:
            logger.info(f"[EAS-BUILD] Triggering build for {company_code} {app_type} app")
            
            # Step 1: Install EAS CLI if needed
            check_result = await self.exec_in_container(container_name, "which eas || echo 'not found'")
            if 'not found' in str(check_result.get('output', {})):
                logger.info(f"[EAS-BUILD] Installing EAS CLI...")
                await self.exec_in_container(container_name, "npm install -g eas-cli@latest 2>&1")
            
            # Step 2: Login to Expo with token (non-interactive)
            logger.info(f"[EAS-BUILD] Logging in to Expo...")
            login_cmd = f"EXPO_TOKEN={expo_token} eas whoami 2>&1"
            login_result = await self.exec_in_container(container_name, login_cmd)
            logger.info(f"[EAS-BUILD] Login result: {login_result}")
            
            # Step 3: Ensure eas.json has correct config with node version
            # Use Node.js to write valid JSON (avoids shell escaping issues)
            eas_write_cmd = '''node -e "require('fs').writeFileSync('/app/eas.json', JSON.stringify({cli:{version:'>=3.0.0'},build:{preview:{distribution:'internal',node:'22.12.0',env:{npm_config_engine_strict:'false'},android:{buildType:'apk',credentialsSource:'local'}},production:{node:'22.12.0',env:{npm_config_engine_strict:'false'},android:{credentialsSource:'local'}}}}, null, 2))"'''
            await self.exec_in_container(container_name, eas_write_cmd)
            
            # Also ensure .npmrc exists
            npmrc_cmd = '''echo -e "engine-strict=false\nignore-engines=true" > /app/.npmrc'''
            await self.exec_in_container(container_name, npmrc_cmd)
            
            # Step 4: Run EAS build with token (EAS_NO_VCS=1 since containers don't have git)
            # Use preview profile to generate APK with local credentials
            logger.info(f"[EAS-BUILD] Starting build...")
            build_cmd = f"""cd /app && EAS_NO_VCS=1 EXPO_TOKEN={expo_token} eas build --platform android --profile preview --non-interactive --no-wait 2>&1"""
            
            result = await self.exec_in_container(container_name, build_cmd)
            
            if result.get('success'):
                output = result.get('output', {}).get('text', '') if isinstance(result.get('output'), dict) else str(result.get('output', ''))
                
                # Parse build ID from output
                import re
                
                # Check for errors first
                if 'Error:' in output and 'Must configure EAS project' in output:
                    # Try eas init first
                    logger.info(f"[EAS-BUILD] Running eas init...")
                    init_cmd = f"cd /app && EAS_NO_VCS=1 EXPO_TOKEN={expo_token} eas init --id {expo_project_id} --non-interactive 2>&1"
                    init_result = await self.exec_in_container(container_name, init_cmd)
                    
                    # Retry build
                    result = await self.exec_in_container(container_name, build_cmd)
                    output = result.get('output', {}).get('text', '') if isinstance(result.get('output'), dict) else str(result.get('output', ''))
                
                # Try to find build ID in output
                id_match = re.search(r'Build ID:\s*([a-f0-9-]+)', output, re.IGNORECASE)
                if id_match:
                    return {
                        'success': True,
                        'build_id': id_match.group(1),
                        'message': 'EAS build started',
                        'raw_output': output[:500]
                    }
                
                # Check for build link in "See logs:" format
                see_logs_match = re.search(r'See logs:\s*(https://expo\.dev/[^\s]+)', output)
                if see_logs_match:
                    build_url = see_logs_match.group(1)
                    build_id_match = re.search(r'/builds/([a-f0-9-]+)', build_url)
                    return {
                        'success': True,
                        'build_id': build_id_match.group(1) if build_id_match else None,
                        'build_url': build_url,
                        'message': 'EAS build started successfully',
                        'raw_output': output[:500]
                    }
                
                # Check for build link in other formats
                link_match = re.search(r'https://expo\.dev/.*?/builds/([a-f0-9-]+)', output)
                if link_match:
                    return {
                        'success': True,
                        'build_id': link_match.group(1),
                        'build_url': link_match.group(0),
                        'message': 'EAS build started',
                        'raw_output': output[:500]
                    }
                
                # Check if build was submitted
                if 'Build details' in output or 'Submitted' in output or 'queued' in output.lower():
                    return {
                        'success': True,
                        'build_id': None,
                        'message': 'Build submitted to Expo, check dashboard for status',
                        'raw_output': output[:1000]
                    }
                
                return {
                    'success': True,
                    'build_id': None,
                    'message': 'Build command executed, check Expo dashboard',
                    'raw_output': output[:1000]
                }
            else:
                return {
                    'success': False,
                    'error': 'EAS build command failed',
                    'details': result
                }
                
        except Exception as e:
            logger.error(f"[EAS-BUILD] Error: {e}")
            return {'success': False, 'error': str(e)}

    async def get_eas_build_status(self, build_id: str) -> Dict[str, Any]:
        """
        Get EAS build status using Expo API.
        """
        expo_token = os.environ.get('EXPO_TOKEN', '')
        
        if not expo_token:
            return {'success': False, 'error': 'EXPO_TOKEN not configured'}
        
        try:
            graphql_query = """
            query GetBuild($buildId: ID!) {
                builds {
                    byId(buildId: $buildId) {
                        id
                        status
                        platform
                        artifacts {
                            buildUrl
                        }
                        error {
                            message
                        }
                    }
                }
            }
            """
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.expo.dev/graphql",
                    headers={
                        "Authorization": f"Bearer {expo_token}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "query": graphql_query,
                        "variables": {"buildId": build_id}
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    build_data = data.get('data', {}).get('builds', {}).get('byId', {})
                    
                    if build_data:
                        return {
                            'success': True,
                            'build_id': build_data.get('id'),
                            'status': build_data.get('status', 'unknown').lower(),
                            'platform': build_data.get('platform'),
                            'download_url': build_data.get('artifacts', {}).get('buildUrl'),
                            'error': build_data.get('error', {}).get('message')
                        }
                    else:
                        return {'success': False, 'error': 'Build not found'}
                else:
                    return {'success': False, 'error': f'API error: {response.status_code}'}
                    
        except Exception as e:
            logger.error(f"[EAS-STATUS] Error: {e}")
            return {'success': False, 'error': str(e)}


    async def deploy_code_to_superadmin(self, frontend_build_path: str = None, backend_path: str = None) -> Dict[str, Any]:
        """
        Deploy code to SuperAdmin stack containers.
        
        YENİ YAPI:
        - Backend: Sadece container restart (git pull yapacak)
        - Frontend: Build'i superadmin_nginx container'ına yükle
        
        Args:
            frontend_build_path: Path to frontend build folder (default: /app/frontend/build)
            backend_path: Path to backend code (default: /app/backend)
        """
        if not frontend_build_path:
            frontend_build_path = "/app/frontend/build"
        if not backend_path:
            backend_path = "/app/backend"
        
        results = {
            'frontend_upload': None,
            'config_js': None,
            'backend_restart': None
        }
        
        superadmin_nginx = "superadmin_nginx"
        superadmin_backend = "superadmin_backend"
        
        # SuperAdmin API URL - always use IP:9001 for the Portainer stack
        api_url = f"http://{SERVER_IP}:9001"
        
        logger.info(f"[SUPERADMIN-DEPLOY] Starting code deployment to SuperAdmin stack...")
        
        try:
            import asyncio
            
            # Step 1: Check if containers exist
            nginx_id = await self.get_container_id(superadmin_nginx)
            backend_id = await self.get_container_id(superadmin_backend)
            
            if not nginx_id:
                return {
                    'success': False,
                    'error': 'SuperAdmin nginx container not found. Create the stack first.',
                    'nginx_found': bool(nginx_id),
                    'backend_found': bool(backend_id)
                }
            
            # Step 2: Upload frontend build to Nginx
            if os.path.exists(frontend_build_path):
                logger.info(f"[SUPERADMIN-DEPLOY] Step 1: Uploading frontend build from {frontend_build_path}")
                
                # Create tar of build folder
                tar_buffer = std_io.BytesIO()
                with tarfile.open(fileobj=tar_buffer, mode='w') as tar:
                    for root, dirs, files in os.walk(frontend_build_path):
                        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '__pycache__']]
                        for file in files:
                            file_path = os.path.join(root, file)
                            arcname = os.path.relpath(file_path, frontend_build_path)
                            try:
                                tar.add(file_path, arcname=arcname)
                            except Exception as e:
                                logger.warning(f"[SUPERADMIN-DEPLOY] Could not add file {file_path}: {e}")
                
                tar_data = tar_buffer.getvalue()
                logger.info(f"[SUPERADMIN-DEPLOY] Frontend tar size: {len(tar_data)} bytes")
                
                # Upload to nginx
                results['frontend_upload'] = await self.upload_to_container(
                    container_name=superadmin_nginx,
                    tar_data=tar_data,
                    dest_path="/usr/share/nginx/html"
                )
            else:
                logger.warning(f"[SUPERADMIN-DEPLOY] Frontend build not found at {frontend_build_path}")
                results['frontend_upload'] = {'skipped': True, 'reason': f'Build not found at {frontend_build_path}'}
            
            # Step 3: Create config.js for SuperAdmin
            logger.info(f"[SUPERADMIN-DEPLOY] Step 2: Creating config.js with API URL: {api_url}")
            results['config_js'] = await self.create_config_js(superadmin_nginx, api_url)
            
            # Step 4: Restart backend to pull latest code from GitHub
            if backend_id:
                logger.info(f"[SUPERADMIN-DEPLOY] Step 3: Restarting backend (will pull from GitHub)...")
                results['backend_restart'] = await self.restart_container(superadmin_backend)
                await asyncio.sleep(5)
            
            logger.info(f"[SUPERADMIN-DEPLOY] ✓ Code deployment complete!")
            
            return {
                'success': True,
                'message': 'SuperAdmin stack code deployed successfully',
                'results': results,
                'urls': {
                    'frontend': f'http://{SERVER_IP}:9000',
                    'backend': f'http://{SERVER_IP}:9001',
                    'api': f'http://{SERVER_IP}:9001/api'
                },
                'note': 'Backend GitHub\'dan kod çeker. Frontend build yüklendi.'
            }
            
        except Exception as e:
            logger.error(f"[SUPERADMIN-DEPLOY] Error: {str(e)}")
            import traceback
            logger.error(f"[SUPERADMIN-DEPLOY] Traceback: {traceback.format_exc()}")
            
            return {
                'success': False,
                'error': str(e),
                'results': results
            }


# Singleton instance
portainer_service = PortainerService()
