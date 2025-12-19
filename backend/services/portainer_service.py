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
    Generate full Rent A Car stack with Traefik labels for domain routing
    Includes: MongoDB + Backend + Frontend with SSL support
    """
    frontend_port = BASE_FRONTEND_PORT + port_offset
    backend_port = BASE_BACKEND_PORT + port_offset
    mongo_port = BASE_MONGO_PORT + port_offset
    
    # Sanitize company code for container names
    safe_code = company_code.replace('-', '').replace('_', '')
    
    return f"""version: '3.8'

services:
  {safe_code}_mongodb:
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
      - traefik_network

  {safe_code}_backend:
    image: tiangolo/uvicorn-gunicorn-fastapi:python3.11-slim
    container_name: {company_code}_backend
    restart: unless-stopped
    environment:
      - MONGO_URL=mongodb://{safe_code}_mongodb:27017
      - DB_NAME={company_code}_db
      - JWT_SECRET={company_code}_jwt_secret_2024
      - COMPANY_CODE={company_code}
      - COMPANY_NAME={company_name}
    ports:
      - "{backend_port}:80"
    depends_on:
      - {safe_code}_mongodb
    networks:
      - {company_code}_network
      - traefik_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.{safe_code}-api.rule=Host(`api.{domain}`)"
      - "traefik.http.routers.{safe_code}-api.entrypoints=websecure"
      - "traefik.http.routers.{safe_code}-api.tls.certresolver=letsencrypt"
      - "traefik.http.services.{safe_code}-api.loadbalancer.server.port=80"

  {safe_code}_frontend:
    image: nginx:alpine
    container_name: {company_code}_frontend
    restart: unless-stopped
    ports:
      - "{frontend_port}:80"
    depends_on:
      - {safe_code}_backend
    networks:
      - {company_code}_network
      - traefik_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.{safe_code}-web.rule=Host(`{domain}`) || Host(`www.{domain}`)"
      - "traefik.http.routers.{safe_code}-web.entrypoints=websecure"
      - "traefik.http.routers.{safe_code}-web.tls.certresolver=letsencrypt"
      - "traefik.http.services.{safe_code}-web.loadbalancer.server.port=80"
      - "traefik.http.routers.{safe_code}-panel.rule=Host(`panel.{domain}`)"
      - "traefik.http.routers.{safe_code}-panel.entrypoints=websecure"
      - "traefik.http.routers.{safe_code}-panel.tls.certresolver=letsencrypt"

volumes:
  {company_code}_mongo_data:

networks:
  {company_code}_network:
    driver: bridge
  traefik_network:
    external: true
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
    
    async def get_next_port_offset(self, db) -> int:
        """Get next available port offset based on existing companies"""
        # Find the highest port_offset used
        companies = await db.companies.find(
            {'port_offset': {'$exists': True}},
            {'port_offset': 1}
        ).to_list(1000)
        
        if not companies:
            return 1
        
        max_offset = max(c.get('port_offset', 0) for c in companies)
        return max_offset + 1
    
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


# Singleton instance
portainer_service = PortainerService()
