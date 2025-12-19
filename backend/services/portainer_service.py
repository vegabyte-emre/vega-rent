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
    Generate minimal Docker Compose YAML - just MongoDB + simple API
    Better for initial testing without pre-built images
    """
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
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/{company_code}_db --quiet
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  {company_code}_mongo_data:

networks:
  {company_code}_network:
    driver: bridge
"""


def get_superadmin_compose_template() -> str:
    """
    Generate Docker Compose YAML for SuperAdmin stack
    Ports: Frontend 9000, Backend 9001, MongoDB 27017
    """
    return """version: '3.8'

services:
  superadmin_mongodb:
    image: mongo:6.0
    container_name: superadmin_mongodb
    restart: unless-stopped
    environment:
      - MONGO_INITDB_DATABASE=superadmin_db
    volumes:
      - superadmin_mongo_data:/data/db
    ports:
      - "27017:27017"
    networks:
      - superadmin_network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/superadmin_db --quiet
      interval: 10s
      timeout: 5s
      retries: 5

  superadmin_backend:
    image: python:3.11-slim
    container_name: superadmin_backend
    restart: unless-stopped
    working_dir: /app
    command: >
      bash -c "
        apt-get update && apt-get install -y git curl &&
        pip install fastapi uvicorn motor pydantic python-jose passlib python-dotenv bcrypt httpx email-validator &&
        if [ ! -f /app/server.py ]; then
          echo 'from fastapi import FastAPI' > /app/server.py &&
          echo 'app = FastAPI()' >> /app/server.py &&
          echo '@app.get(\"/api/health\")' >> /app/server.py &&
          echo 'def health(): return {\"status\": \"healthy\", \"service\": \"superadmin\"}' >> /app/server.py
        fi &&
        uvicorn server:app --host 0.0.0.0 --port 8001 --reload
      "
    environment:
      - MONGO_URL=mongodb://superadmin_mongodb:27017
      - DB_NAME=superadmin_db
      - JWT_SECRET=superadmin_jwt_secret_key_2024_secure
      - CORS_ORIGINS=*
      - PORTAINER_URL=https://72.61.158.147:9443
      - PORTAINER_API_KEY=ptr_XwtYmxpR0KCkqMLsPLGMM4mHQS5Q75gupgBcCGqRUEY=
      - PORTAINER_ENDPOINT_ID=3
      - SERVER_IP=72.61.158.147
    ports:
      - "9001:8001"
    depends_on:
      superadmin_mongodb:
        condition: service_healthy
    networks:
      - superadmin_network
    volumes:
      - superadmin_backend_code:/app

  superadmin_frontend:
    image: node:20-alpine
    container_name: superadmin_frontend
    restart: unless-stopped
    working_dir: /app
    command: >
      sh -c "
        npm install -g serve &&
        if [ ! -f /app/index.html ]; then
          mkdir -p /app &&
          echo '<!DOCTYPE html><html><head><title>SuperAdmin Panel</title><style>body{font-family:system-ui;background:#0f172a;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;}.container{text-align:center;padding:40px;background:#1e293b;border-radius:16px;border:1px solid #334155;}.status{color:#22c55e;font-size:24px;margin-bottom:16px;}h1{margin:0 0 8px 0;}p{color:#94a3b8;margin:0;}a{color:#a78bfa;}</style></head><body><div class=\"container\"><div class=\"status\">✅</div><h1>SuperAdmin Panel</h1><p>Backend API: <a href=\"http://72.61.158.147:9001/api/health\">http://72.61.158.147:9001/api/health</a></p><p style=\"margin-top:16px;\">Tam uygulama icin kod deploy edilmeli</p></div></body></html>' > /app/index.html
        fi &&
        serve -s /app -l 3000
      "
    environment:
      - REACT_APP_BACKEND_URL=http://72.61.158.147:9001
    ports:
      - "9000:3000"
    depends_on:
      - superadmin_backend
    networks:
      - superadmin_network
    volumes:
      - superadmin_frontend_code:/app

volumes:
  superadmin_mongo_data:
  superadmin_backend_code:
  superadmin_frontend_code:

networks:
  superadmin_network:
    driver: bridge
"""


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
