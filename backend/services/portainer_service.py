"""
Portainer Integration Service
Handles automatic deployment of company stacks to Portainer
"""

import os
import httpx
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Portainer Configuration
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
    Generate Docker Compose for a complete company stack with Traefik SSL
    ALL names use safe_code (no dashes/underscores) for consistency
    Uses shared template volumes for frontend and backend code
    """
    safe_code = company_code.replace('-', '').replace('_', '')
    
    frontend_port = BASE_FRONTEND_PORT + port_offset
    backend_port = BASE_BACKEND_PORT + port_offset
    mongo_port = BASE_MONGO_PORT + port_offset
    
    # API URL for this tenant
    api_url = f"https://api.{domain}"
    
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
    volumes:
      - rentacar_template_backend:/app:ro
      - {safe_code}_backend_env:/app/env
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
    volumes:
      - rentacar_template_frontend:/usr/share/nginx/html:ro
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

volumes:
  {safe_code}_mongo_data:
  {safe_code}_backend_env:
  rentacar_template_frontend:
    external: true
  rentacar_template_backend:
    external: true

networks:
  {safe_code}_network:
    driver: bridge
  traefik_network:
    external: true
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


def get_superadmin_compose_template() -> str:
    """
    Generate Docker Compose YAML for SuperAdmin stack
    Ports: Frontend 9000, Backend 9001, MongoDB 27017
    """
    yaml_content = """version: "3.8"

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
    image: tiangolo/uvicorn-gunicorn-fastapi:python3.11-slim
    container_name: superadmin_backend
    restart: unless-stopped
    ports:
      - "9001:80"
    environment:
      - MONGO_URL=mongodb://superadmin_mongodb:27017
      - DB_NAME=superadmin_db
    volumes:
      - superadmin_backend_app:/app
    networks:
      - superadmin_network
    depends_on:
      - superadmin_mongodb

  superadmin_frontend:
    image: nginx:alpine
    container_name: superadmin_frontend
    restart: unless-stopped
    ports:
      - "9000:80"
    volumes:
      - superadmin_frontend_html:/usr/share/nginx/html
    networks:
      - superadmin_network
    depends_on:
      - superadmin_backend

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
        
        async with httpx.AsyncClient(verify=False, timeout=60.0) as client:
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
                return {'error': str(e)}
    
    async def get_stacks(self) -> list:
        """Get all stacks"""
        result = await self._request('GET', 'stacks')
        if isinstance(result, list):
            return result
        return []
    
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


# Singleton instance
portainer_service = PortainerService()
