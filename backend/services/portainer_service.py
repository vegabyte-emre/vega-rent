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
    """
    safe_code = company_code.replace('-', '').replace('_', '')
    
    frontend_port = BASE_FRONTEND_PORT + port_offset
    backend_port = BASE_BACKEND_PORT + port_offset
    mongo_port = BASE_MONGO_PORT + port_offset
    
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

volumes:
  rentacar_template_frontend:
    name: rentacar_template_frontend
  rentacar_template_backend:
    name: rentacar_template_backend

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
      - PORTAINER_URL=https://host.docker.internal:9443
      - PORTAINER_API_KEY=ptr_XwtYmxpR0KCkqMLsPLGMM4mHQS5Q75gupgBcCGqRUEY=
      - SERVER_IP=72.61.158.147
    volumes:
      - superadmin_backend_app:/app
    networks:
      - superadmin_network
    depends_on:
      - superadmin_mongodb
    extra_hosts:
      - "host.docker.internal:host-gateway"

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

    async def copy_from_template(self, template_container: str, target_container: str, source_path: str, dest_path: str) -> Dict[str, Any]:
        """
        Copy files from template container to target container via Portainer API.
        This enables template-based deployment without external APIs.
        """
        logger.info(f"[TEMPLATE-COPY] {template_container}:{source_path} -> {target_container}:{dest_path}")
        
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
                
                # Step 2: Upload to target container
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

    async def create_config_js(self, container_name: str, api_url: str) -> Dict[str, Any]:
        """
        Create config.js file with runtime API URL in frontend container
        """
        import tarfile
        import io as std_io
        
        config_content = f'window.__RUNTIME_CONFIG__ = {{ API_URL: "{api_url}" }};'
        
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

    async def full_tenant_deployment(self, company_code: str, domain: str, admin_email: str, admin_password: str, mongo_port: int) -> Dict[str, Any]:
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
            # Step 1: Copy frontend from template
            logger.info(f"[FULL-DEPLOY] Step 1: Copying frontend...")
            results['frontend_copy'] = await self.copy_from_template(
                template_container="rentacar_template_frontend",
                target_container=frontend_container,
                source_path="/usr/share/nginx/html",
                dest_path="/usr/share/nginx"
            )
            
            # Step 2: Copy backend from template
            logger.info(f"[FULL-DEPLOY] Step 2: Copying backend...")
            results['backend_copy'] = await self.copy_from_template(
                template_container="rentacar_template_backend",
                target_container=backend_container,
                source_path="/app",
                dest_path="/"
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

    async def update_tenant_from_template(self, company_code: str, domain: str) -> Dict[str, Any]:
        """
        Update existing tenant from template WITHOUT touching database.
        Only updates:
        1. Frontend code (new features, UI updates)
        2. Backend code (new API endpoints, bug fixes)
        3. Nginx configuration
        
        DOES NOT TOUCH:
        - MongoDB data (customers, vehicles, reservations, etc.)
        - Admin credentials
        - Theme settings stored in DB
        """
        safe_code = company_code.replace('-', '').replace('_', '')
        frontend_container = f"{safe_code}_frontend"
        backend_container = f"{safe_code}_backend"
        api_url = f"https://api.{domain}"
        
        results = {
            'frontend_copy': None,
            'backend_copy': None,
            'deps_install': None,
            'config_js': None,
            'nginx_config': None,
            'frontend_restart': None,
            'backend_restart': None
        }
        
        logger.info(f"[UPDATE-TEMPLATE] Starting template update for {company_code} ({domain})")
        
        try:
            import asyncio
            
            # Step 1: Copy frontend from template
            logger.info(f"[UPDATE-TEMPLATE] Step 1: Copying frontend code...")
            results['frontend_copy'] = await self.copy_from_template(
                template_container="rentacar_template_frontend",
                target_container=frontend_container,
                source_path="/usr/share/nginx/html",
                dest_path="/usr/share/nginx"
            )
            
            # Step 2: Copy backend from template
            logger.info(f"[UPDATE-TEMPLATE] Step 2: Copying backend code...")
            results['backend_copy'] = await self.copy_from_template(
                template_container="rentacar_template_backend",
                target_container=backend_container,
                source_path="/app",
                dest_path="/"
            )
            
            # Step 3: Install/Update backend dependencies
            logger.info(f"[UPDATE-TEMPLATE] Step 3: Installing dependencies...")
            results['deps_install'] = await self.install_backend_dependencies(backend_container)
            
            # Step 4: Recreate config.js with correct API URL
            logger.info(f"[UPDATE-TEMPLATE] Step 4: Updating config.js...")
            results['config_js'] = await self.create_config_js(frontend_container, api_url)
            
            # Step 5: Re-configure Nginx for SPA
            logger.info(f"[UPDATE-TEMPLATE] Step 5: Updating Nginx config...")
            results['nginx_config'] = await self.configure_nginx_spa(frontend_container)
            
            # Step 6: Restart containers to apply changes
            logger.info(f"[UPDATE-TEMPLATE] Step 6: Restarting containers...")
            results['backend_restart'] = await self.restart_container(backend_container)
            await asyncio.sleep(3)
            results['frontend_restart'] = await self.restart_container(frontend_container)
            
            logger.info(f"[UPDATE-TEMPLATE] Template update complete for {company_code}")
            
            return {
                'success': True,
                'message': f'Tenant {company_code} updated from template successfully',
                'company_code': company_code,
                'domain': domain,
                'results': results,
                'note': 'Database verileri korundu. Sadece kod güncellendi.'
            }
            
        except Exception as e:
            logger.error(f"[UPDATE-TEMPLATE] Error: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'company_code': company_code,
                'results': results
            }

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


# Singleton instance
portainer_service = PortainerService()
