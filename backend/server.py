from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks, UploadFile, File, Form, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
from passlib.context import CryptContext
from jose import JWTError, jwt
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import Portainer service
from services.portainer_service import portainer_service
import subprocess
import tarfile
import io

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = os.environ.get('JWT_SECRET', secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI(title="FleetEase - Kurumsal Rent a Car Platform")
api_router = APIRouter(prefix="/api")

# ============== ENUMS ==============
class UserRole(str, Enum):
    SUPERADMIN = "superadmin"
    FIRMA_ADMIN = "firma_admin"
    OPERASYON = "operasyon"
    MUHASEBE = "muhasebe"
    PERSONEL = "personel"
    MUSTERI = "musteri"

class VehicleStatus(str, Enum):
    AVAILABLE = "available"
    RENTED = "rented"
    SERVICE = "service"
    RESERVED = "reserved"

class ReservationStatus(str, Enum):
    CREATED = "created"
    CONFIRMED = "confirmed"
    DELIVERED = "delivered"
    RETURNED = "returned"
    CLOSED = "closed"
    CANCELLED = "cancelled"

class FuelType(str, Enum):
    BENZIN = "benzin"
    DIZEL = "dizel"
    ELEKTRIK = "elektrik"
    HIBRIT = "hibrit"
    LPG = "lpg"

class TransmissionType(str, Enum):
    MANUEL = "manuel"
    OTOMATIK = "otomatik"
    YARI_OTOMATIK = "yari_otomatik"

# ============== MODELS ==============
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.PERSONEL
    company_id: Optional[str] = None
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    company_id: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class CompanyStatus(str, Enum):
    PENDING_APPROVAL = "pending_approval"  # Demo request, awaiting approval
    PENDING_PAYMENT = "pending_payment"    # Approved, awaiting first payment
    PENDING = "pending"                    # Payment received, pending provisioning
    PROVISIONING = "provisioning"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DELETED = "deleted"

class SubscriptionPlan(str, Enum):
    FREE = "free"           # Trial - 14 days
    STARTER = "starter"     # 10 vehicles - ₺999/month
    PROFESSIONAL = "professional"  # 50 vehicles - ₺2,499/month
    ENTERPRISE = "enterprise"      # Unlimited - ₺4,999/month

class BillingCycle(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"

class PaymentMethod(str, Enum):
    BANK_TRANSFER = "bank_transfer"
    CREDIT_CARD = "credit_card"
    IYZICO = "iyzico"
    PAYTR = "paytr"
    PARATIKA = "paratika"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

# Subscription Plan Details
SUBSCRIPTION_PLANS = {
    "free": {
        "name": "Deneme",
        "name_en": "Trial",
        "max_vehicles": 5,
        "max_users": 2,
        "price_monthly": 0,
        "price_yearly": 0,
        "trial_days": 14,
        "features": ["online_booking", "basic_reports"],
        "description": "14 gün ücretsiz deneme"
    },
    "starter": {
        "name": "Başlangıç",
        "name_en": "Starter",
        "max_vehicles": 10,
        "max_users": 5,
        "price_monthly": 999,
        "price_yearly": 9590,  # 2 months free
        "trial_days": 0,
        "features": ["online_booking", "basic_reports", "customer_management", "email_support"],
        "description": "Küçük filolar için ideal"
    },
    "professional": {
        "name": "Profesyonel",
        "name_en": "Professional",
        "max_vehicles": 50,
        "max_users": 15,
        "price_monthly": 2499,
        "price_yearly": 23990,  # 2 months free
        "trial_days": 0,
        "features": ["online_booking", "advanced_reports", "customer_management", "sms_notifications", "e_invoice", "priority_support"],
        "description": "Büyüyen işletmeler için"
    },
    "enterprise": {
        "name": "Kurumsal",
        "name_en": "Enterprise",
        "max_vehicles": -1,  # Unlimited
        "max_users": -1,     # Unlimited
        "price_monthly": 4999,
        "price_yearly": 47990,  # 2 months free
        "trial_days": 0,
        "features": ["online_booking", "advanced_reports", "customer_management", "sms_notifications", "whatsapp", "e_invoice", "gps_tracking", "api_access", "dedicated_support", "custom_training"],
        "description": "Büyük filolar için"
    }
}

class CompanyCreate(BaseModel):
    name: str
    code: str
    domain: Optional[str] = None  # Custom domain (e.g., abcrentacar.com)
    subdomain: Optional[str] = None  # Subdomain (e.g., abc for abc.rentafleet.com)
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    tax_number: Optional[str] = None
    subscription_plan: SubscriptionPlan = SubscriptionPlan.FREE
    # Admin user info for automatic creation
    admin_email: Optional[EmailStr] = None
    admin_password: Optional[str] = None
    admin_full_name: Optional[str] = None

class PortainerPorts(BaseModel):
    frontend: Optional[int] = None
    backend: Optional[int] = None
    mongodb: Optional[int] = None

class PortainerUrls(BaseModel):
    frontend: Optional[str] = None
    backend: Optional[str] = None
    api: Optional[str] = None

class CompanyResponse(BaseModel):
    id: str
    name: str
    code: str
    domain: Optional[str] = None
    subdomain: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    tax_number: Optional[str] = None
    subscription_plan: SubscriptionPlan = SubscriptionPlan.FREE
    status: CompanyStatus = CompanyStatus.PENDING
    is_active: bool = True
    vehicle_count: int = 0
    customer_count: int = 0
    admin_email: Optional[str] = None
    portainer_stack_id: Optional[int] = None  # Portainer returns integer ID
    stack_name: Optional[str] = None
    ports: Optional[PortainerPorts] = None
    urls: Optional[PortainerUrls] = None
    port_offset: Optional[int] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

class VehicleCreate(BaseModel):
    plate: str
    brand: str
    model: str
    year: int
    segment: str
    transmission: TransmissionType
    fuel_type: FuelType
    seat_count: int = 5
    door_count: int = 4
    daily_rate: float
    color: Optional[str] = None
    mileage: int = 0
    image_url: Optional[str] = None

class VehicleResponse(BaseModel):
    id: str
    company_id: Optional[str] = None
    plate: str
    brand: str
    model: str
    year: int
    segment: str
    transmission: TransmissionType
    fuel_type: FuelType
    seat_count: int
    door_count: int
    daily_rate: float
    color: Optional[str] = None
    mileage: int
    status: VehicleStatus
    image_url: Optional[str] = None
    created_at: datetime

class CustomerCreate(BaseModel):
    tc_no: str
    full_name: str
    email: EmailStr
    phone: str
    address: Optional[str] = None
    license_no: Optional[str] = None
    license_class: Optional[str] = None

class CustomerResponse(BaseModel):
    id: str
    company_id: Optional[str] = None
    tc_no: str
    full_name: str
    email: str
    phone: str
    address: Optional[str] = None
    license_no: Optional[str] = None
    license_class: Optional[str] = None
    created_at: datetime

class ReservationCreate(BaseModel):
    vehicle_id: str
    customer_id: str
    start_date: datetime
    end_date: datetime
    pickup_location: Optional[str] = None
    return_location: Optional[str] = None
    notes: Optional[str] = None

class ReservationResponse(BaseModel):
    id: str
    company_id: Optional[str] = None
    vehicle_id: str
    customer_id: str
    start_date: datetime
    end_date: datetime
    pickup_location: Optional[str] = None
    return_location: Optional[str] = None
    status: ReservationStatus
    total_amount: float
    notes: Optional[str] = None
    created_at: datetime
    vehicle: Optional[dict] = None
    customer: Optional[dict] = None

class DeliveryCreate(BaseModel):
    reservation_id: str
    delivery_mileage: int
    fuel_level: str
    notes: Optional[str] = None

class ReturnCreate(BaseModel):
    reservation_id: str
    return_mileage: int
    fuel_level: str
    damage_notes: Optional[str] = None
    extra_charges: float = 0

class PaymentCreate(BaseModel):
    reservation_id: str
    amount: float
    payment_type: str = "card"
    card_holder: Optional[str] = None

class DashboardStats(BaseModel):
    total_vehicles: int
    available_vehicles: int
    rented_vehicles: int
    service_vehicles: int
    total_customers: int
    active_reservations: int
    total_revenue: float
    pending_returns: int

# ============== AUTH HELPERS ==============
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_role(allowed_roles: List[UserRole]):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in [r.value for r in allowed_roles]:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

# ============== AUTH ROUTES ==============
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": get_password_hash(user_data.password),
        "full_name": user_data.full_name,
        "role": user_data.role.value,
        "company_id": user_data.company_id,
        "phone": user_data.phone,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_access_token({"sub": user_id, "role": user_data.role.value})
    user_response = UserResponse(
        id=user_id,
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        company_id=user_data.company_id,
        phone=user_data.phone,
        is_active=True,
        created_at=datetime.fromisoformat(user_doc["created_at"])
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is disabled")
    
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        company_id=user.get("company_id"),
        phone=user.get("phone"),
        is_active=user.get("is_active", True),
        created_at=datetime.fromisoformat(user["created_at"]) if isinstance(user["created_at"], str) else user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        full_name=user["full_name"],
        role=UserRole(user["role"]),
        company_id=user.get("company_id"),
        phone=user.get("phone"),
        is_active=user.get("is_active", True),
        created_at=datetime.fromisoformat(user["created_at"]) if isinstance(user["created_at"], str) else user["created_at"]
    )

# ============== SUPERADMIN COMPANY ROUTES ==============
@api_router.post("/superadmin/companies", response_model=CompanyResponse)
async def create_company_superadmin(company: CompanyCreate, user: dict = Depends(get_current_user)):
    """SuperAdmin: Create a new company with auto-provisioning"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can create companies")
    
    # Check if code or subdomain already exists
    existing = await db.companies.find_one({"$or": [{"code": company.code}, {"subdomain": company.subdomain}]})
    if existing:
        raise HTTPException(status_code=400, detail="Company code or subdomain already exists")
    
    company_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    company_doc = {
        "id": company_id,
        "name": company.name,
        "code": company.code,
        "domain": company.domain,
        "subdomain": company.subdomain or company.code,
        "address": company.address,
        "phone": company.phone,
        "email": company.email,
        "tax_number": company.tax_number,
        "subscription_plan": company.subscription_plan.value,
        "status": CompanyStatus.PENDING.value,
        "is_active": True,
        "vehicle_count": 0,
        "customer_count": 0,
        "admin_email": company.admin_email,
        "admin_password": company.admin_password,  # Store for provision step
        "admin_full_name": company.admin_full_name,
        "portainer_stack_id": None,
        "created_by": user["id"],
        "created_at": now,
        "updated_at": now
    }
    await db.companies.insert_one(company_doc)
    
    # Auto-create admin user for the company if credentials provided
    if company.admin_email and company.admin_password:
        existing_user = await db.users.find_one({"email": company.admin_email})
        if not existing_user:
            admin_user_id = str(uuid.uuid4())
            admin_user_doc = {
                "id": admin_user_id,
                "email": company.admin_email,
                "password_hash": get_password_hash(company.admin_password),
                "full_name": company.admin_full_name or f"{company.name} Admin",
                "role": UserRole.FIRMA_ADMIN.value,
                "company_id": company_id,
                "phone": company.phone,
                "is_active": True,
                "created_at": now
            }
            await db.users.insert_one(admin_user_doc)
    
    company_response_data = {k: v for k, v in company_doc.items() if k != "_id"}
    company_response_data["created_at"] = datetime.fromisoformat(company_doc["created_at"])
    company_response_data["updated_at"] = datetime.fromisoformat(company_doc["updated_at"])
    company_response_data["subscription_plan"] = SubscriptionPlan(company_doc["subscription_plan"])
    company_response_data["status"] = CompanyStatus(company_doc["status"])
    return CompanyResponse(**company_response_data)

@api_router.get("/superadmin/companies", response_model=List[CompanyResponse])
async def list_companies_superadmin(user: dict = Depends(get_current_user)):
    """SuperAdmin: List all companies with stats"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view all companies")
    
    companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
    result = []
    for c in companies:
        company_data = dict(c)
        # Get vehicle and customer counts
        vehicle_count = await db.vehicles.count_documents({"company_id": c["id"]})
        customer_count = await db.customers.count_documents({"company_id": c["id"]})
        company_data["vehicle_count"] = vehicle_count
        company_data["customer_count"] = customer_count
        company_data["created_at"] = datetime.fromisoformat(c["created_at"]) if isinstance(c["created_at"], str) else c["created_at"]
        if c.get("updated_at"):
            company_data["updated_at"] = datetime.fromisoformat(c["updated_at"]) if isinstance(c["updated_at"], str) else c["updated_at"]
        company_data["subscription_plan"] = SubscriptionPlan(c.get("subscription_plan", "free"))
        company_data["status"] = CompanyStatus(c.get("status", "active"))
        # Handle ports and urls as nested objects
        if c.get("ports") and isinstance(c["ports"], dict):
            company_data["ports"] = PortainerPorts(**c["ports"])
        if c.get("urls") and isinstance(c["urls"], dict):
            company_data["urls"] = PortainerUrls(**c["urls"])
        result.append(CompanyResponse(**company_data))
    return result

@api_router.get("/superadmin/companies/{company_id}", response_model=CompanyResponse)
async def get_company_superadmin(company_id: str, user: dict = Depends(get_current_user)):
    """SuperAdmin: Get company details"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view company details")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    company_data = dict(company)
    vehicle_count = await db.vehicles.count_documents({"company_id": company_id})
    customer_count = await db.customers.count_documents({"company_id": company_id})
    company_data["vehicle_count"] = vehicle_count
    company_data["customer_count"] = customer_count
    company_data["created_at"] = datetime.fromisoformat(company["created_at"]) if isinstance(company["created_at"], str) else company["created_at"]
    if company.get("updated_at"):
        company_data["updated_at"] = datetime.fromisoformat(company["updated_at"]) if isinstance(company["updated_at"], str) else company["updated_at"]
    company_data["subscription_plan"] = SubscriptionPlan(company.get("subscription_plan", "free"))
    company_data["status"] = CompanyStatus(company.get("status", "active"))
    # Handle ports and urls as nested objects
    if company.get("ports") and isinstance(company["ports"], dict):
        company_data["ports"] = PortainerPorts(**company["ports"])
    if company.get("urls") and isinstance(company["urls"], dict):
        company_data["urls"] = PortainerUrls(**company["urls"])
    return CompanyResponse(**company_data)

@api_router.put("/superadmin/companies/{company_id}", response_model=CompanyResponse)
async def update_company_superadmin(company_id: str, company: CompanyCreate, user: dict = Depends(get_current_user)):
    """SuperAdmin: Update company details"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can update companies")
    
    existing = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Company not found")
    
    update_doc = {
        "name": company.name,
        "code": company.code,
        "domain": company.domain,
        "subdomain": company.subdomain or company.code,
        "address": company.address,
        "phone": company.phone,
        "email": company.email,
        "tax_number": company.tax_number,
        "subscription_plan": company.subscription_plan.value,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.companies.update_one({"id": company_id}, {"$set": update_doc})
    return await get_company_superadmin(company_id, user)

@api_router.patch("/superadmin/companies/{company_id}/status")
async def update_company_status(company_id: str, status: CompanyStatus, user: dict = Depends(get_current_user)):
    """SuperAdmin: Update company status (activate/suspend/delete)"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can change company status")
    
    result = await db.companies.update_one(
        {"id": company_id},
        {"$set": {
            "status": status.value,
            "is_active": status == CompanyStatus.ACTIVE,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
    return {"message": "Company status updated", "status": status.value}

@api_router.delete("/superadmin/companies/{company_id}")
async def delete_company_superadmin(company_id: str, hard_delete: bool = False, user: dict = Depends(get_current_user)):
    """SuperAdmin: Delete a company - removes from Portainer and database"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can delete companies")
    
    # Get company details
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    deleted_resources = []
    errors = []
    
    # 1. Delete Portainer stack if exists
    if company.get("portainer_stack_id"):
        try:
            stack_result = await portainer_service.delete_stack(company["portainer_stack_id"])
            if stack_result.get("success"):
                deleted_resources.append(f"Portainer Stack (ID: {company['portainer_stack_id']})")
            else:
                errors.append(f"Portainer stack silme hatası: {stack_result.get('error')}")
        except Exception as e:
            errors.append(f"Portainer hatası: {str(e)}")
    
    # 2. Delete all company data from database
    try:
        # Delete vehicles
        vehicles_result = await db.vehicles.delete_many({"company_id": company_id})
        if vehicles_result.deleted_count > 0:
            deleted_resources.append(f"{vehicles_result.deleted_count} araç")
        
        # Delete customers
        customers_result = await db.customers.delete_many({"company_id": company_id})
        if customers_result.deleted_count > 0:
            deleted_resources.append(f"{customers_result.deleted_count} müşteri")
        
        # Delete reservations
        reservations_result = await db.reservations.delete_many({"company_id": company_id})
        if reservations_result.deleted_count > 0:
            deleted_resources.append(f"{reservations_result.deleted_count} rezervasyon")
        
        # Delete payments
        payments_result = await db.payments.delete_many({"company_id": company_id})
        if payments_result.deleted_count > 0:
            deleted_resources.append(f"{payments_result.deleted_count} ödeme")
        
        # Delete company users
        users_result = await db.users.delete_many({"company_id": company_id})
        if users_result.deleted_count > 0:
            deleted_resources.append(f"{users_result.deleted_count} kullanıcı")
        
        # Delete company record
        await db.companies.delete_one({"id": company_id})
        deleted_resources.append("Firma kaydı")
        
    except Exception as e:
        errors.append(f"Veritabanı hatası: {str(e)}")
    
    return {
        "message": "Firma ve tüm verileri silindi" if not errors else "Firma kısmen silindi",
        "company_name": company.get("name"),
        "deleted_resources": deleted_resources,
        "errors": errors if errors else None
    }

@api_router.get("/superadmin/stats")
async def get_superadmin_stats(user: dict = Depends(get_current_user)):
    """SuperAdmin: Get platform-wide statistics"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view platform stats")
    
    total_companies = await db.companies.count_documents({"status": {"$ne": CompanyStatus.DELETED.value}})
    active_companies = await db.companies.count_documents({"status": CompanyStatus.ACTIVE.value})
    pending_companies = await db.companies.count_documents({"status": CompanyStatus.PENDING.value})
    total_vehicles = await db.vehicles.count_documents({})
    total_customers = await db.customers.count_documents({})
    total_reservations = await db.reservations.count_documents({})
    total_users = await db.users.count_documents({})
    
    return {
        "total_companies": total_companies,
        "active_companies": active_companies,
        "pending_companies": pending_companies,
        "total_vehicles": total_vehicles,
        "total_customers": total_customers,
        "total_reservations": total_reservations,
        "total_users": total_users
    }

# ============== COMPANY FRONTEND DEPLOYMENT ==============
async def deploy_company_frontend(company_code: str, backend_url: str, container_name: str):
    """
    Background task to build and deploy frontend to a company's container
    Uses HTTPS API URL for proper browser communication
    """
    import asyncio
    
    logger.info(f"[FRONTEND-DEPLOY] Starting frontend deployment for {company_code}")
    logger.info(f"[FRONTEND-DEPLOY] Backend URL: {backend_url}")
    logger.info(f"[FRONTEND-DEPLOY] Container: {container_name}")
    
    try:
        # Wait for container to be ready
        await asyncio.sleep(15)
        
        frontend_dir = "/app/frontend"
        build_dir = f"{frontend_dir}/build"
        
        # Build frontend with company's backend URL (should be HTTPS for domains)
        env = os.environ.copy()
        env["REACT_APP_BACKEND_URL"] = backend_url
        env["CI"] = "false"
        
        logger.info(f"[FRONTEND-DEPLOY] Building frontend with REACT_APP_BACKEND_URL={backend_url}")
        
        result = subprocess.run(
            ["yarn", "build"],
            cwd=frontend_dir,
            env=env,
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if result.returncode != 0:
            logger.error(f"[FRONTEND-DEPLOY] Build failed for {company_code}: {result.stderr}")
            return {"success": False, "error": result.stderr}
        
        logger.info(f"[FRONTEND-DEPLOY] Build completed successfully for {company_code}")
        
        # Create tar archive
        tar_buffer = io.BytesIO()
        with tarfile.open(fileobj=tar_buffer, mode='w') as tar:
            for root, dirs, files in os.walk(build_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, build_dir)
                    tar.add(file_path, arcname=arcname)
        
        tar_data = tar_buffer.getvalue()
        
        logger.info(f"[FRONTEND-DEPLOY] Uploading build to container {container_name}...")
        
        # Upload to container
        upload_result = await portainer_service.upload_to_container(
            container_name=container_name,
            tar_data=tar_data,
            dest_path="/usr/share/nginx/html"
        )
        
        if upload_result.get('error'):
            logger.error(f"[FRONTEND-DEPLOY] Upload failed for {company_code}: {upload_result.get('error')}")
            return {"success": False, "error": upload_result.get('error')}
        
        logger.info(f"[FRONTEND-DEPLOY] Upload successful, configuring Nginx...")
        
        # Configure Nginx for SPA routing
        nginx_result = await portainer_service.configure_nginx_spa(container_name)
        
        if nginx_result.get('error'):
            logger.error(f"[FRONTEND-DEPLOY] Nginx config failed for {company_code}: {nginx_result.get('error')}")
            return {"success": False, "error": nginx_result.get('error')}
        
        logger.info(f"[FRONTEND-DEPLOY] Frontend deployed successfully for {company_code}")
        return {"success": True}
            
    except Exception as e:
        logger.error(f"[FRONTEND-DEPLOY] Error for {company_code}: {str(e)}")
        return {"success": False, "error": str(e)}

async def deploy_company_backend(company_code: str, container_name: str, mongo_service_name: str, db_name: str):
    """
    Background task to deploy backend code to company container
    """
    import asyncio
    
    logger.info(f"[BACKEND-DEPLOY] Starting backend deployment for {company_code}")
    logger.info(f"[BACKEND-DEPLOY] Container: {container_name}")
    logger.info(f"[BACKEND-DEPLOY] MongoDB service: {mongo_service_name}")
    logger.info(f"[BACKEND-DEPLOY] Database: {db_name}")
    
    try:
        # Wait for container to be ready
        await asyncio.sleep(5)
        
        backend_dir = "/app/backend"
        
        # Create tar with backend files
        tar_buffer = io.BytesIO()
        with tarfile.open(fileobj=tar_buffer, mode='w') as tar:
            # Add server.py
            tar.add(f"{backend_dir}/server.py", arcname="server.py")
            tar.add(f"{backend_dir}/requirements.txt", arcname="requirements.txt")
            
            # Add services folder
            services_dir = f"{backend_dir}/services"
            if os.path.exists(services_dir):
                for root, dirs, files in os.walk(services_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, backend_dir)
                        tar.add(file_path, arcname=arcname)
            
            # Add .env with correct settings
            env_content = f"""MONGO_URL=mongodb://{mongo_service_name}:27017
DB_NAME={db_name}
JWT_SECRET={company_code}_jwt_secret_2024
"""
            env_info = tarfile.TarInfo(name=".env")
            env_bytes = env_content.encode('utf-8')
            env_info.size = len(env_bytes)
            tar.addfile(env_info, io.BytesIO(env_bytes))
            
            # Add main.py
            main_py = "from server import app\n"
            main_info = tarfile.TarInfo(name="main.py")
            main_bytes = main_py.encode('utf-8')
            main_info.size = len(main_bytes)
            tar.addfile(main_info, io.BytesIO(main_bytes))
        
        tar_data = tar_buffer.getvalue()
        
        logger.info(f"[BACKEND-DEPLOY] Uploading backend code to {container_name}...")
        
        # Upload to container
        upload_result = await portainer_service.upload_to_container(
            container_name=container_name,
            tar_data=tar_data,
            dest_path="/app"
        )
        
        if upload_result.get('error'):
            logger.error(f"[BACKEND-DEPLOY] Upload failed for {company_code}: {upload_result.get('error')}")
            return {"success": False, "error": upload_result.get('error')}
        
        logger.info(f"[BACKEND-DEPLOY] Upload successful, installing dependencies...")
        
        # Install dependencies
        install_result = await portainer_service.exec_in_container(
            container_name=container_name,
            command='pip install "bcrypt>=4.0.0,<4.1.0" "passlib[bcrypt]>=1.7.4" motor python-jose python-dotenv httpx --quiet'
        )
        
        logger.info(f"[BACKEND-DEPLOY] Dependencies installed, restarting container...")
        
        # Restart container to load new code
        restart_result = await portainer_service.restart_container(container_name)
        
        if restart_result.get('error'):
            logger.error(f"[BACKEND-DEPLOY] Restart failed for {company_code}: {restart_result.get('error')}")
            return {"success": False, "error": restart_result.get('error')}
        
        logger.info(f"[BACKEND-DEPLOY] Backend deployed successfully for {company_code}")
        return {"success": True}
        
    except Exception as e:
        logger.error(f"[BACKEND-DEPLOY] Error for {company_code}: {str(e)}")
        return {"success": False, "error": str(e)}

async def setup_company_database(company: dict, mongo_port: int, db_name: str = None):
    """
    Setup company database with admin user
    """
    from motor.motor_asyncio import AsyncIOMotorClient
    
    # Use provided db_name or calculate from company code
    if not db_name:
        company_code = company.get("code", "").replace("-", "").replace("_", "")
        db_name = f"{company_code}_db"
    
    logger.info(f"[DB-SETUP] Setting up database for {company['name']} on port {mongo_port}")
    logger.info(f"[DB-SETUP] Database name: {db_name}")
    
    try:
        # Connect to company's MongoDB
        mongo_url = f"mongodb://72.61.158.147:{mongo_port}"
        logger.info(f"[DB-SETUP] Connecting to MongoDB at {mongo_url}")
        
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=15000)
        company_db = client[db_name]
        
        # Create company record
        company_id = company.get("id")
        existing = await company_db.companies.find_one({"id": company_id})
        if not existing:
            await company_db.companies.insert_one({
                "id": company_id,
                "name": company.get("name"),
                "code": company.get("code"),
                "domain": company.get("domain"),
                "status": "active",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"[DB-SETUP] Company record created in {db_name}")
        else:
            logger.info(f"[DB-SETUP] Company record already exists in {db_name}")
        
        # Create admin user
        admin_email = company.get("admin_email")
        if not admin_email:
            domain = company.get("domain", "company.com")
            admin_email = f"admin@{domain}"
        
        admin_password = company.get("admin_password") or "admin123"
        admin_name = company.get("admin_full_name") or f"{company.get('name')} Admin"
        
        existing_user = await company_db.users.find_one({"email": admin_email})
        if not existing_user:
            admin_user = {
                "id": str(uuid.uuid4()),
                "email": admin_email,
                "password_hash": pwd_context.hash(admin_password),
                "full_name": admin_name,
                "role": "firma_admin",
                "company_id": company_id,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await company_db.users.insert_one(admin_user)
            logger.info(f"[DB-SETUP] Admin user created: {admin_email} with password: {admin_password}")
        else:
            logger.info(f"[DB-SETUP] Admin user already exists: {admin_email}")
        
        client.close()
        logger.info(f"[DB-SETUP] Database setup completed for {company['name']}")
        return {"success": True, "admin_email": admin_email, "admin_password": admin_password}
        
    except Exception as e:
        logger.error(f"[DB-SETUP] Error for {company['name']}: {str(e)}")
        return {"success": False, "error": str(e)}

# ============== PORTAINER PROVISIONING ROUTES ==============
async def full_auto_provision(company: dict, result: dict, port_offset: int):
    """
    Background task for full automatic provisioning:
    1. Deploy backend code
    2. Deploy frontend code with correct HTTPS API URL
    3. Configure Nginx
    4. Setup database with admin user
    """
    import asyncio
    
    company_code = company["code"]
    safe_code = company_code.replace('-', '').replace('_', '')
    domain = company.get("domain")
    
    logger.info(f"[AUTO-PROVISION] Starting full auto provision for {company['name']}")
    logger.info(f"[AUTO-PROVISION] Company code: {company_code}, Safe code: {safe_code}")
    
    try:
        # Wait for containers to start
        logger.info(f"[AUTO-PROVISION] Waiting for containers to start...")
        await asyncio.sleep(45)
        
        # Step 1: Deploy backend code
        # Container names use safe_code (no dashes/underscores)
        logger.info(f"[AUTO-PROVISION] Step 1: Deploying backend code...")
        backend_container = f"{safe_code}_backend"
        mongo_service_name = f"{safe_code}_mongodb"
        db_name = f"{safe_code}_db"
        
        logger.info(f"[AUTO-PROVISION] Backend container: {backend_container}")
        logger.info(f"[AUTO-PROVISION] MongoDB service: {mongo_service_name}")
        logger.info(f"[AUTO-PROVISION] Database: {db_name}")
        
        await deploy_company_backend(
            company_code=company_code,
            container_name=backend_container,
            mongo_service_name=mongo_service_name,
            db_name=db_name
        )
        
        # Wait for backend to restart
        await asyncio.sleep(15)
        
        # Step 2: Deploy frontend with HTTPS API URL
        logger.info(f"[AUTO-PROVISION] Step 2: Deploying frontend code...")
        frontend_container = f"{safe_code}_frontend"
        
        logger.info(f"[AUTO-PROVISION] Frontend container: {frontend_container}")
        
        # Use HTTPS API URL for frontend
        if domain:
            api_url = f"https://api.{domain}"
        else:
            api_url = f"http://72.61.158.147:{result.get('ports', {}).get('backend', 11000)}"
        
        await deploy_company_frontend(
            company_code=company_code,
            backend_url=api_url,
            container_name=frontend_container
        )
        
        # Step 3: Setup database with admin user
        logger.info(f"[AUTO-PROVISION] Step 3: Setting up database and admin user...")
        mongo_port = result.get('ports', {}).get('mongodb', 21000 + port_offset)
        await setup_company_database(company, mongo_port, db_name)
        
        # Step 4: Restart Traefik to pick up new labels
        logger.info(f"[AUTO-PROVISION] Step 4: Refreshing Traefik routing...")
        await restart_traefik_for_new_labels()
        
        logger.info(f"[AUTO-PROVISION] Full auto provision completed for {company['name']}")
        
        # Update company status to fully active
        await db.companies.update_one(
            {"id": company["id"]},
            {"$set": {
                "provisioning_complete": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
    except Exception as e:
        logger.error(f"[AUTO-PROVISION] Error during auto provision for {company['name']}: {str(e)}")


async def restart_traefik_for_new_labels():
    """
    Restart Traefik container to pick up new Docker labels from newly created containers
    """
    try:
        # Find and restart Traefik container
        containers = await portainer_service._request('GET', f"endpoints/{portainer_service.endpoint_id}/docker/containers/json")
        
        traefik_id = None
        if isinstance(containers, list):
            for c in containers:
                names = c.get('Names', [])
                for name in names:
                    if 'traefik' in name.lower():
                        traefik_id = c.get('Id')
                        break
                if traefik_id:
                    break
        
        if traefik_id:
            restart_result = await portainer_service.restart_container_by_id(traefik_id)
            if restart_result.get('success'):
                logger.info("[AUTO-PROVISION] Traefik restarted successfully")
                # Wait for Traefik to be ready
                import asyncio
                await asyncio.sleep(5)
            else:
                logger.warning(f"[AUTO-PROVISION] Traefik restart warning: {restart_result.get('error')}")
        else:
            logger.warning("[AUTO-PROVISION] Traefik container not found")
            
    except Exception as e:
        logger.warning(f"[AUTO-PROVISION] Traefik restart error (non-critical): {str(e)}")


@api_router.post("/superadmin/companies/{company_id}/provision")
async def provision_company(company_id: str, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """SuperAdmin: Provision a company stack in Portainer - FULL AUTOMATIC"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can provision companies")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if company.get("portainer_stack_id"):
        raise HTTPException(status_code=400, detail="Company already has a provisioned stack")
    
    # Get next available port offset
    port_offset = await portainer_service.get_next_port_offset(db)
    
    # Update status to provisioning
    await db.companies.update_one(
        {"id": company_id},
        {"$set": {
            "status": CompanyStatus.PROVISIONING.value,
            "port_offset": port_offset,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Check if domain is set - use full stack if domain exists
    domain = company.get("domain")
    
    if domain:
        # Create full stack with Traefik labels for domain routing
        result = await portainer_service.create_full_stack(
            company_code=company["code"],
            company_name=company["name"],
            domain=domain,
            port_offset=port_offset
        )
    else:
        # Create minimal stack (MongoDB only) for IP-based access
        result = await portainer_service.create_stack(
            company_code=company["code"],
            company_name=company["name"],
            port_offset=port_offset
        )
    
    if result.get("success"):
        # Update company with stack info
        await db.companies.update_one(
            {"id": company_id},
            {"$set": {
                "status": CompanyStatus.ACTIVE.value,
                "portainer_stack_id": result.get("stack_id"),
                "stack_name": result.get("stack_name"),
                "ports": result.get("ports"),
                "urls": result.get("urls"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # FULL TENANT DEPLOYMENT via Portainer API
        # This copies from template, installs deps, creates config, and sets up DB
        if domain:
            logger.info(f"[PROVISION] Starting full deployment for {company['code']}")
            
            admin_email = company.get("admin_email", f"admin@{domain}")
            admin_password = company.get("admin_password", "admin123")
            mongo_port = result.get("ports", {}).get("mongodb")
            
            # Run full deployment via Portainer API
            deploy_result = await portainer_service.full_tenant_deployment(
                company_code=company["code"],
                domain=domain,
                admin_email=admin_email,
                admin_password=admin_password,
                mongo_port=mongo_port
            )
            
            logger.info(f"[PROVISION] Full deployment result: {deploy_result.get('success')}")
            
            return {
                "message": "Company provisioned and deployed successfully",
                "stack_id": result.get("stack_id"),
                "stack_name": result.get("stack_name"),
                "urls": result.get("urls"),
                "ports": result.get("ports"),
                "deployment": deploy_result,
                "admin_email": admin_email,
                "note": "Stack oluşturuldu, template'den kod kopyalandı, database kuruldu."
            }
        else:
            # No domain - just MongoDB setup
            return {
                "message": "Company provisioned (MongoDB only)",
                "stack_id": result.get("stack_id"),
                "stack_name": result.get("stack_name"),
                "urls": result.get("urls"),
                "ports": result.get("ports"),
                "note": "Domain belirtilmediği için sadece MongoDB kuruldu."
            }
    else:
        # Revert status
        await db.companies.update_one(
            {"id": company_id},
            {"$set": {
                "status": CompanyStatus.PENDING.value,
                "provisioning_error": result.get("error"),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        raise HTTPException(status_code=500, detail=f"Provisioning failed: {result.get('error')}")

@api_router.delete("/superadmin/companies/{company_id}/provision")
async def deprovision_company(company_id: str, user: dict = Depends(get_current_user)):
    """SuperAdmin: Remove a company stack from Portainer"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can deprovision companies")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    stack_id = company.get("portainer_stack_id")
    if not stack_id:
        raise HTTPException(status_code=400, detail="Company has no provisioned stack")
    
    # Delete stack from Portainer
    result = await portainer_service.delete_stack(stack_id)
    
    if result.get("success"):
        await db.companies.update_one(
            {"id": company_id},
            {"$set": {
                "status": CompanyStatus.PENDING.value,
                "portainer_stack_id": None,
                "stack_name": None,
                "ports": None,
                "urls": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Company stack removed successfully"}
    else:
        raise HTTPException(status_code=500, detail=f"Deprovisioning failed: {result.get('error')}")

@api_router.post("/superadmin/companies/{company_id}/update-from-template")
async def update_company_from_template(company_id: str, user: dict = Depends(get_current_user)):
    """
    SuperAdmin: Update company code from template WITHOUT touching database.
    This updates Frontend and Backend code while preserving all customer data.
    """
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can update companies")
    
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Check if company has a stack
    if not company.get("portainer_stack_id"):
        raise HTTPException(status_code=400, detail="Bu firma henüz deploy edilmemiş. Önce deploy edin.")
    
    # Get domain
    domain = company.get("domain")
    if not domain:
        raise HTTPException(status_code=400, detail="Firma domain bilgisi bulunamadı")
    
    company_code = company.get("code")
    
    logger.info(f"[UPDATE-TEMPLATE] Starting template update for {company['name']} ({company_code})")
    
    # Update from template
    result = await portainer_service.update_tenant_from_template(
        company_code=company_code,
        domain=domain
    )
    
    if result.get("success"):
        # Update company record
        await db.companies.update_one(
            {"id": company_id},
            {"$set": {
                "last_template_update": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": f"{company['name']} template'den güncellendi",
            "company_name": company['name'],
            "domain": domain,
            "results": result.get("results"),
            "note": "Veritabanı verileri korundu. Sadece kod güncellendi."
        }
    else:
        raise HTTPException(
            status_code=500, 
            detail=f"Güncelleme başarısız: {result.get('error')}"
        )

@api_router.post("/superadmin/companies/update-all-from-template")
async def update_all_companies_from_template(user: dict = Depends(get_current_user)):
    """
    SuperAdmin: Update ALL active companies from template.
    This is a batch operation that updates all deployed companies.
    """
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can perform batch updates")
    
    # Get all active companies with stacks
    companies = await db.companies.find({
        "status": CompanyStatus.ACTIVE.value,
        "portainer_stack_id": {"$ne": None},
        "domain": {"$ne": None}
    }, {"_id": 0}).to_list(1000)
    
    if not companies:
        raise HTTPException(status_code=404, detail="Güncellenecek aktif firma bulunamadı")
    
    logger.info(f"[BATCH-UPDATE] Starting batch update for {len(companies)} companies")
    
    results = []
    success_count = 0
    fail_count = 0
    
    for company in companies:
        company_code = company.get("code")
        domain = company.get("domain")
        
        try:
            result = await portainer_service.update_tenant_from_template(
                company_code=company_code,
                domain=domain
            )
            
            if result.get("success"):
                success_count += 1
                # Update company record
                await db.companies.update_one(
                    {"id": company["id"]},
                    {"$set": {
                        "last_template_update": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                results.append({
                    "company": company["name"],
                    "code": company_code,
                    "success": True
                })
            else:
                fail_count += 1
                results.append({
                    "company": company["name"],
                    "code": company_code,
                    "success": False,
                    "error": result.get("error")
                })
        except Exception as e:
            fail_count += 1
            results.append({
                "company": company["name"],
                "code": company_code,
                "success": False,
                "error": str(e)
            })
    
    logger.info(f"[BATCH-UPDATE] Completed: {success_count} success, {fail_count} failed")
    
    return {
        "success": fail_count == 0,
        "message": f"Toplu güncelleme tamamlandı: {success_count} başarılı, {fail_count} başarısız",
        "total_companies": len(companies),
        "success_count": success_count,
        "fail_count": fail_count,
        "results": results,
        "note": "Veritabanı verileri korundu. Sadece kodlar güncellendi."
    }

@api_router.get("/superadmin/portainer/stacks")
async def get_portainer_stacks(user: dict = Depends(get_current_user)):
    """SuperAdmin: Get all stacks from Portainer"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view Portainer stacks")
    
    stacks = await portainer_service.get_stacks()
    return {"stacks": stacks}

@api_router.get("/superadmin/portainer/containers")
async def get_portainer_containers(user: dict = Depends(get_current_user)):
    """SuperAdmin: Get all containers from Portainer"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view Portainer containers")
    
    containers = await portainer_service.get_containers()
    return {"containers": containers}

@api_router.get("/superadmin/portainer/status")
async def get_portainer_status(user: dict = Depends(get_current_user)):
    """SuperAdmin: Check Portainer connection status"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can check Portainer status")
    
    try:
        stacks = await portainer_service.get_stacks()
        return {
            "connected": True,
            "url": portainer_service.base_url,
            "endpoint_id": portainer_service.endpoint_id,
            "stack_count": len(stacks) if isinstance(stacks, list) else 0
        }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e)
        }

@api_router.post("/superadmin/deploy-superadmin-stack")
async def deploy_superadmin_stack(user: dict = Depends(get_current_user)):
    """SuperAdmin: Deploy SuperAdmin stack to Portainer"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can deploy SuperAdmin stack")
    
    result = await portainer_service.create_superadmin_stack()
    
    if result.get("success"):
        return {
            "message": "SuperAdmin stack deployed successfully",
            "stack_id": result.get("stack_id"),
            "stack_name": result.get("stack_name"),
            "urls": result.get("urls"),
            "ports": result.get("ports")
        }
    else:
        raise HTTPException(status_code=500, detail=f"Deployment failed: {result.get('error')}")

@api_router.get("/superadmin/traefik/status")
async def get_traefik_status(user: dict = Depends(get_current_user)):
    """SuperAdmin: Check Traefik installation status"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can check Traefik status")
    
    return await portainer_service.check_traefik_status()

@api_router.post("/superadmin/traefik/deploy")
async def deploy_traefik(user: dict = Depends(get_current_user), admin_email: str = "admin@rentafleet.com"):
    """SuperAdmin: Deploy Traefik reverse proxy to Portainer"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can deploy Traefik")
    
    result = await portainer_service.deploy_traefik(admin_email)
    
    if result.get("success"):
        return {
            "message": result.get("message", "Traefik deployed successfully"),
            "stack_id": result.get("stack_id"),
            "dashboard_url": result.get("dashboard_url"),
            "already_exists": result.get("already_exists", False)
        }
    else:
        raise HTTPException(status_code=500, detail=f"Traefik deployment failed: {result.get('error')}")

@api_router.post("/superadmin/template/create")
async def create_template_stack(user: dict = Depends(get_current_user)):
    """SuperAdmin: Create template stack with shared volumes for tenant deployments"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can create template stack")
    
    result = await portainer_service.create_template_stack()
    
    if result.get("success"):
        return result
    else:
        raise HTTPException(status_code=500, detail=f"Template stack creation failed: {result.get('error')}")

@api_router.post("/superadmin/template/deploy-code")
async def deploy_code_to_template(user: dict = Depends(get_current_user)):
    """
    SuperAdmin: Deploy frontend build and backend code to template containers.
    This is done once, then all new tenants will use these shared volumes.
    """
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can deploy template code")
    
    results = {"frontend": None, "backend": None}
    
    try:
        # Step 1: Build frontend with runtime config (no hardcoded API URL)
        logger.info("[TEMPLATE] Building frontend...")
        env = os.environ.copy()
        env["REACT_APP_BACKEND_URL"] = ""  # Empty - will use runtime config
        env["CI"] = "false"
        
        build_result = subprocess.run(
            ["yarn", "build"],
            cwd="/app/frontend",
            env=env,
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if build_result.returncode != 0:
            return {"success": False, "error": "Frontend build failed", "details": build_result.stderr}
        
        logger.info("[TEMPLATE] Frontend build successful, uploading...")
        
        # Upload to template frontend container
        build_dir = "/app/frontend/build"
        tar_buffer = io.BytesIO()
        with tarfile.open(fileobj=tar_buffer, mode='w') as tar:
            for root, dirs, files in os.walk(build_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, build_dir)
                    tar.add(file_path, arcname=arcname)
        
        tar_data = tar_buffer.getvalue()
        
        frontend_upload = await portainer_service.upload_to_container(
            container_name="rentacar_template_frontend",
            tar_data=tar_data,
            dest_path="/usr/share/nginx/html"
        )
        results["frontend"] = {"success": not frontend_upload.get("error"), "error": frontend_upload.get("error")}
        
        # Step 2: Upload backend code to template backend container
        logger.info("[TEMPLATE] Uploading backend code...")
        backend_dir = "/app/backend"
        
        backend_tar = io.BytesIO()
        with tarfile.open(fileobj=backend_tar, mode='w') as tar:
            tar.add(f"{backend_dir}/server.py", arcname="server.py")
            tar.add(f"{backend_dir}/requirements.txt", arcname="requirements.txt")
            
            services_dir = f"{backend_dir}/services"
            if os.path.exists(services_dir):
                for root, dirs, files in os.walk(services_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, backend_dir)
                        tar.add(file_path, arcname=arcname)
            
            # Add main.py
            main_content = b"from server import app\n"
            main_info = tarfile.TarInfo(name="main.py")
            main_info.size = len(main_content)
            tar.addfile(main_info, io.BytesIO(main_content))
        
        backend_tar_data = backend_tar.getvalue()
        
        backend_upload = await portainer_service.upload_to_container(
            container_name="rentacar_template_backend",
            tar_data=backend_tar_data,
            dest_path="/app"
        )
        results["backend"] = {"success": not backend_upload.get("error"), "error": backend_upload.get("error")}
        
        # Install dependencies in template backend
        await portainer_service.exec_in_container(
            container_name="rentacar_template_backend",
            command="pip install motor python-jose passlib[bcrypt] python-dotenv httpx bcrypt>=4.0.0,<4.1.0 --quiet"
        )
        
        logger.info("[TEMPLATE] Template code deployed successfully")
        
        return {
            "success": True,
            "message": "Template code deployed. All new tenants will use this code.",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"[TEMPLATE] Deploy error: {str(e)}")
        return {"success": False, "error": str(e), "results": results}

@api_router.post("/superadmin/deploy-frontend-to-kvm")
async def deploy_frontend_to_kvm(background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """
    SuperAdmin: Build and deploy frontend to KVM server's SuperAdmin container
    This builds the React app with correct REACT_APP_BACKEND_URL and uploads to Nginx container
    """
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can deploy frontend")
    
    import subprocess
    import tarfile
    import io
    import shutil
    
    kvm_backend_url = "http://72.61.158.147:9001"
    frontend_dir = "/app/frontend"
    build_dir = f"{frontend_dir}/build"
    
    try:
        # Step 1: Build frontend with correct backend URL
        env = os.environ.copy()
        env["REACT_APP_BACKEND_URL"] = kvm_backend_url
        env["CI"] = "true"  # Skip warnings as errors
        
        # Run yarn build (CI=false to avoid treating warnings as errors)
        env["CI"] = "false"
        result = subprocess.run(
            ["yarn", "build"],
            cwd=frontend_dir,
            env=env,
            capture_output=True,
            text=True,
            timeout=180
        )
        
        if result.returncode != 0:
            return {
                "success": False,
                "error": "Build failed",
                "details": result.stderr
            }
        
        # Step 2: Create tar archive of build folder
        tar_buffer = io.BytesIO()
        with tarfile.open(fileobj=tar_buffer, mode='w') as tar:
            for root, dirs, files in os.walk(build_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, build_dir)
                    tar.add(file_path, arcname=arcname)
        
        tar_data = tar_buffer.getvalue()
        
        # Step 3: Upload to Portainer container
        upload_result = await portainer_service.upload_to_container(
            container_name="superadmin_frontend",
            tar_data=tar_data,
            dest_path="/usr/share/nginx/html"
        )
        
        if upload_result.get('error'):
            return {
                "success": False,
                "error": "Upload to container failed",
                "details": upload_result.get('error')
            }
        
        return {
            "success": True,
            "message": "Frontend deployed successfully to KVM server",
            "backend_url": kvm_backend_url,
            "frontend_url": "http://72.61.158.147:9000",
            "files_uploaded": len([f for r, d, files in os.walk(build_dir) for f in files])
        }
        
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Build timed out (180s)"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@api_router.post("/superadmin/deploy-backend-to-kvm")
async def deploy_backend_to_kvm(user: dict = Depends(get_current_user)):
    """
    SuperAdmin: Deploy backend code to KVM server's SuperAdmin container
    Uploads server.py, requirements.txt and services folder to the backend container
    """
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can deploy backend")
    
    import tarfile
    import io
    
    backend_dir = "/app/backend"
    
    try:
        # Create tar archive of backend files
        tar_buffer = io.BytesIO()
        with tarfile.open(fileobj=tar_buffer, mode='w') as tar:
            # Add server.py
            tar.add(f"{backend_dir}/server.py", arcname="server.py")
            
            # Add requirements.txt
            tar.add(f"{backend_dir}/requirements.txt", arcname="requirements.txt")
            
            # Add services folder
            services_dir = f"{backend_dir}/services"
            if os.path.exists(services_dir):
                for root, dirs, files in os.walk(services_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, backend_dir)
                        tar.add(file_path, arcname=arcname)
            
            # Add .env file for KVM
            env_content = """MONGO_URL=mongodb://superadmin_mongodb:27017
DB_NAME=superadmin_db
JWT_SECRET=kvm_superadmin_jwt_secret_2024
"""
            env_info = tarfile.TarInfo(name=".env")
            env_bytes = env_content.encode('utf-8')
            env_info.size = len(env_bytes)
            tar.addfile(env_info, io.BytesIO(env_bytes))
        
        tar_data = tar_buffer.getvalue()
        
        # Upload to backend container
        upload_result = await portainer_service.upload_to_container(
            container_name="superadmin_backend",
            tar_data=tar_data,
            dest_path="/app"
        )
        
        if upload_result.get('error'):
            return {
                "success": False,
                "error": "Upload to container failed",
                "details": upload_result.get('error')
            }
        
        # Install requirements and restart uvicorn via exec
        install_cmd = "cd /app && pip install -r requirements.txt --quiet && pkill -f uvicorn; sleep 2"
        exec_result = await portainer_service.exec_in_container(
            container_name="superadmin_backend",
            command=install_cmd
        )
        
        return {
            "success": True,
            "message": "Backend deployed successfully to KVM server",
            "backend_url": "http://72.61.158.147:9001",
            "note": "Container may take 30-60 seconds to restart with new code"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@api_router.post("/superadmin/seed-kvm-database")
async def seed_kvm_database(user: dict = Depends(get_current_user)):
    """
    SuperAdmin: Seed initial admin user to KVM MongoDB
    Creates admin@fleetease.com user in KVM's MongoDB
    """
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can seed database")
    
    from motor.motor_asyncio import AsyncIOMotorClient
    
    try:
        # Connect to KVM MongoDB
        kvm_mongo_url = "mongodb://72.61.158.147:27017"
        kvm_client = AsyncIOMotorClient(kvm_mongo_url, serverSelectionTimeoutMS=5000)
        kvm_db = kvm_client["superadmin_db"]
        
        # Check if admin exists
        existing = await kvm_db.users.find_one({"email": "admin@fleetease.com"})
        if existing:
            return {
                "success": True,
                "message": "Admin user already exists",
                "email": "admin@fleetease.com"
            }
        
        # Create admin user
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": "admin@fleetease.com",
            "password_hash": pwd_context.hash("admin123"),
            "full_name": "Super Admin",
            "role": "superadmin",
            "company_id": None,
            "phone": None,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await kvm_db.users.insert_one(admin_user)
        
        kvm_client.close()
        
        return {
            "success": True,
            "message": "Admin user created successfully",
            "email": "admin@fleetease.com",
            "password": "admin123"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

# ============== TENANT DEPLOYMENT ENDPOINT ==============
@api_router.post("/superadmin/companies/{company_id}/deploy-code")
async def deploy_code_to_tenant(company_id: str, user: dict = Depends(get_current_user)):
    """
    Deploy frontend and backend code to a tenant's containers.
    This endpoint builds frontend locally and uploads to the tenant's Nginx container.
    """
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can deploy code")
    
    # Get company from database
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if not company.get("portainer_stack_id"):
        raise HTTPException(status_code=400, detail="Company stack not provisioned yet")
    
    company_code = company["code"]
    safe_code = company_code.replace('-', '').replace('_', '')
    domain = company.get("domain")
    ports = company.get("ports", {})
    
    results = {"frontend": None, "backend": None, "database": None}
    
    try:
        # Step 1: Deploy Backend
        logger.info(f"[DEPLOY-CODE] Deploying backend for {company['name']}...")
        backend_container = f"{safe_code}_backend"
        mongo_service = f"{safe_code}_mongodb"
        db_name = f"{safe_code}_db"
        
        backend_result = await deploy_company_backend(
            company_code=company_code,
            container_name=backend_container,
            mongo_service_name=mongo_service,
            db_name=db_name
        )
        results["backend"] = backend_result
        
        # Step 2: Deploy Frontend
        logger.info(f"[DEPLOY-CODE] Deploying frontend for {company['name']}...")
        frontend_container = f"{safe_code}_frontend"
        
        if domain:
            api_url = f"https://api.{domain}"
        else:
            api_url = f"http://72.61.158.147:{ports.get('backend', 11000)}"
        
        frontend_result = await deploy_company_frontend(
            company_code=company_code,
            backend_url=api_url,
            container_name=frontend_container
        )
        results["frontend"] = frontend_result
        
        # Step 3: Setup Database
        logger.info(f"[DEPLOY-CODE] Setting up database for {company['name']}...")
        mongo_port = ports.get("mongodb", 12000)
        db_result = await setup_company_database(company, mongo_port, db_name)
        results["database"] = db_result
        
        # Update company status
        await db.companies.update_one(
            {"id": company_id},
            {"$set": {
                "provisioning_complete": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": f"Code deployed to {company['name']}",
            "results": results,
            "urls": {
                "frontend": f"https://{domain}" if domain else f"http://72.61.158.147:{ports.get('frontend')}",
                "panel": f"https://panel.{domain}" if domain else None,
                "api": f"https://api.{domain}" if domain else f"http://72.61.158.147:{ports.get('backend')}"
            }
        }
        
    except Exception as e:
        logger.error(f"[DEPLOY-CODE] Error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "results": results
        }


# ============== LEGACY COMPANY ROUTES (for backward compatibility) ==============
@api_router.post("/companies", response_model=CompanyResponse)
async def create_company(company: CompanyCreate, user: dict = Depends(get_current_user)):
    return await create_company_superadmin(company, user)

@api_router.get("/companies", response_model=List[CompanyResponse])
async def list_companies(user: dict = Depends(get_current_user)):
    return await list_companies_superadmin(user)

@api_router.get("/companies/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: str, user: dict = Depends(get_current_user)):
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    company_data = dict(company)
    company_data["created_at"] = datetime.fromisoformat(company["created_at"]) if isinstance(company["created_at"], str) else company["created_at"]
    if company.get("updated_at"):
        company_data["updated_at"] = datetime.fromisoformat(company["updated_at"]) if isinstance(company["updated_at"], str) else company["updated_at"]
    company_data["subscription_plan"] = SubscriptionPlan(company.get("subscription_plan", "free"))
    company_data["status"] = CompanyStatus(company.get("status", "active"))
    return CompanyResponse(**company_data)

# ============== VEHICLE ROUTES ==============
@api_router.post("/vehicles", response_model=VehicleResponse)
async def create_vehicle(vehicle: VehicleCreate, user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.SUPERADMIN.value, UserRole.FIRMA_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    company_id = user.get("company_id")
    # SuperAdmin can create vehicles without company_id (manages all companies)
    # FirmaAdmin must have a company_id
    if user["role"] == UserRole.FIRMA_ADMIN.value and not company_id:
        raise HTTPException(status_code=400, detail="Company ID required for Firma Admin")
    
    vehicle_id = str(uuid.uuid4())
    vehicle_doc = {
        "id": vehicle_id,
        "company_id": company_id,
        "plate": vehicle.plate.upper(),
        "brand": vehicle.brand,
        "model": vehicle.model,
        "year": vehicle.year,
        "segment": vehicle.segment,
        "transmission": vehicle.transmission.value,
        "fuel_type": vehicle.fuel_type.value,
        "seat_count": vehicle.seat_count,
        "door_count": vehicle.door_count,
        "daily_rate": vehicle.daily_rate,
        "color": vehicle.color,
        "mileage": vehicle.mileage,
        "status": VehicleStatus.AVAILABLE.value,
        "image_url": vehicle.image_url,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.vehicles.insert_one(vehicle_doc)
    vehicle_response_data = {k: v for k, v in vehicle_doc.items() if k != "_id"}
    vehicle_response_data["transmission"] = TransmissionType(vehicle_doc["transmission"])
    vehicle_response_data["fuel_type"] = FuelType(vehicle_doc["fuel_type"])
    vehicle_response_data["status"] = VehicleStatus(vehicle_doc["status"])
    vehicle_response_data["created_at"] = datetime.fromisoformat(vehicle_doc["created_at"])
    return VehicleResponse(**vehicle_response_data)

@api_router.get("/vehicles", response_model=List[VehicleResponse])
async def list_vehicles(status: Optional[VehicleStatus] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] != UserRole.SUPERADMIN.value:
        query["company_id"] = user.get("company_id")
    if status:
        query["status"] = status.value
    
    vehicles = await db.vehicles.find(query, {"_id": 0}).to_list(1000)
    result = []
    for v in vehicles:
        vehicle_data = dict(v)
        vehicle_data["transmission"] = TransmissionType(v["transmission"])
        vehicle_data["fuel_type"] = FuelType(v["fuel_type"])
        vehicle_data["status"] = VehicleStatus(v["status"])
        vehicle_data["created_at"] = datetime.fromisoformat(v["created_at"]) if isinstance(v["created_at"], str) else v["created_at"]
        result.append(VehicleResponse(**vehicle_data))
    return result

@api_router.get("/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(vehicle_id: str, user: dict = Depends(get_current_user)):
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    vehicle_data = dict(vehicle)
    vehicle_data["transmission"] = TransmissionType(vehicle["transmission"])
    vehicle_data["fuel_type"] = FuelType(vehicle["fuel_type"])
    vehicle_data["status"] = VehicleStatus(vehicle["status"])
    vehicle_data["created_at"] = datetime.fromisoformat(vehicle["created_at"]) if isinstance(vehicle["created_at"], str) else vehicle["created_at"]
    return VehicleResponse(**vehicle_data)

@api_router.put("/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(vehicle_id: str, vehicle: VehicleCreate, user: dict = Depends(get_current_user)):
    existing = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    update_doc = vehicle.model_dump()
    update_doc["transmission"] = vehicle.transmission.value
    update_doc["fuel_type"] = vehicle.fuel_type.value
    update_doc["plate"] = vehicle.plate.upper()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.vehicles.update_one({"id": vehicle_id}, {"$set": update_doc})
    updated = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    return VehicleResponse(**updated,
                          transmission=TransmissionType(updated["transmission"]),
                          fuel_type=FuelType(updated["fuel_type"]),
                          status=VehicleStatus(updated["status"]),
                          created_at=datetime.fromisoformat(updated["created_at"]) if isinstance(updated["created_at"], str) else updated["created_at"])

@api_router.patch("/vehicles/{vehicle_id}/status")
async def update_vehicle_status(vehicle_id: str, status: VehicleStatus, user: dict = Depends(get_current_user)):
    result = await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$set": {"status": status.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Status updated", "status": status.value}

@api_router.delete("/vehicles/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user: dict = Depends(get_current_user)):
    """Delete a vehicle"""
    if user["role"] not in [UserRole.SUPERADMIN.value, UserRole.FIRMA_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    # Check if vehicle exists
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    # Check company ownership for firma_admin
    if user["role"] == UserRole.FIRMA_ADMIN.value:
        if vehicle.get("company_id") != user.get("company_id"):
            raise HTTPException(status_code=403, detail="Cannot delete another company's vehicle")
    
    # Check if vehicle has active reservations
    active_reservation = await db.reservations.find_one({
        "vehicle_id": vehicle_id,
        "status": {"$in": ["pending", "confirmed", "active"]}
    })
    if active_reservation:
        raise HTTPException(status_code=400, detail="Cannot delete vehicle with active reservations")
    
    # Delete the vehicle
    result = await db.vehicles.delete_one({"id": vehicle_id})
    
    if result.deleted_count > 0:
        logger.info(f"Vehicle {vehicle_id} deleted by {user['email']}")
        return {"message": "Vehicle deleted successfully", "vehicle_id": vehicle_id}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete vehicle")

# ============== CUSTOMER ROUTES ==============
@api_router.post("/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, user: dict = Depends(get_current_user)):
    company_id = user.get("company_id")
    
    customer_id = str(uuid.uuid4())
    customer_doc = {
        "id": customer_id,
        "company_id": company_id,
        "tc_no": customer.tc_no,
        "full_name": customer.full_name,
        "email": customer.email,
        "phone": customer.phone,
        "address": customer.address,
        "license_no": customer.license_no,
        "license_class": customer.license_class,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customers.insert_one(customer_doc)
    customer_response_data = {k: v for k, v in customer_doc.items() if k != "_id"}
    customer_response_data["created_at"] = datetime.fromisoformat(customer_doc["created_at"])
    return CustomerResponse(**customer_response_data)

@api_router.get("/customers", response_model=List[CustomerResponse])
async def list_customers(user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] != UserRole.SUPERADMIN.value:
        query["company_id"] = user.get("company_id")
    
    customers = await db.customers.find(query, {"_id": 0}).to_list(1000)
    result = []
    for c in customers:
        customer_data = dict(c)
        customer_data["created_at"] = datetime.fromisoformat(c["created_at"]) if isinstance(c["created_at"], str) else c["created_at"]
        result.append(CustomerResponse(**customer_data))
    return result

@api_router.get("/customers/{customer_id}", response_model=CustomerResponse)
async def get_customer(customer_id: str, user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return CustomerResponse(**customer, created_at=datetime.fromisoformat(customer["created_at"]) if isinstance(customer["created_at"], str) else customer["created_at"])

# ============== RESERVATION ROUTES ==============
@api_router.post("/reservations", response_model=ReservationResponse)
async def create_reservation(reservation: ReservationCreate, user: dict = Depends(get_current_user)):
    company_id = user.get("company_id")
    
    # Get vehicle for daily rate
    vehicle = await db.vehicles.find_one({"id": reservation.vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    if vehicle["status"] != VehicleStatus.AVAILABLE.value:
        raise HTTPException(status_code=400, detail="Vehicle is not available")
    
    # Calculate total amount
    days = (reservation.end_date - reservation.start_date).days
    if days < 1:
        days = 1
    total_amount = days * vehicle["daily_rate"]
    
    reservation_id = str(uuid.uuid4())
    reservation_doc = {
        "id": reservation_id,
        "company_id": company_id,
        "vehicle_id": reservation.vehicle_id,
        "customer_id": reservation.customer_id,
        "start_date": reservation.start_date.isoformat(),
        "end_date": reservation.end_date.isoformat(),
        "pickup_location": reservation.pickup_location,
        "return_location": reservation.return_location,
        "status": ReservationStatus.CREATED.value,
        "total_amount": total_amount,
        "notes": reservation.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reservations.insert_one(reservation_doc)
    
    # Update vehicle status
    await db.vehicles.update_one({"id": reservation.vehicle_id}, {"$set": {"status": VehicleStatus.RESERVED.value}})
    
    reservation_response_data = {k: v for k, v in reservation_doc.items() if k != "_id"}
    reservation_response_data["status"] = ReservationStatus(reservation_doc["status"])
    reservation_response_data["start_date"] = datetime.fromisoformat(reservation_doc["start_date"])
    reservation_response_data["end_date"] = datetime.fromisoformat(reservation_doc["end_date"])
    reservation_response_data["created_at"] = datetime.fromisoformat(reservation_doc["created_at"])
    return ReservationResponse(**reservation_response_data)

@api_router.get("/reservations", response_model=List[ReservationResponse])
async def list_reservations(status: Optional[ReservationStatus] = None, user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] != UserRole.SUPERADMIN.value:
        query["company_id"] = user.get("company_id")
    if status:
        query["status"] = status.value
    
    reservations = await db.reservations.find(query, {"_id": 0}).to_list(1000)
    result = []
    for r in reservations:
        # Get vehicle and customer info
        vehicle = await db.vehicles.find_one({"id": r["vehicle_id"]}, {"_id": 0})
        customer = await db.customers.find_one({"id": r["customer_id"]}, {"_id": 0})
        
        result.append(ReservationResponse(
            **{k: v for k, v in r.items() if k not in ["_id", "status", "start_date", "end_date", "created_at"]},
            status=ReservationStatus(r["status"]),
            start_date=datetime.fromisoformat(r["start_date"]) if isinstance(r["start_date"], str) else r["start_date"],
            end_date=datetime.fromisoformat(r["end_date"]) if isinstance(r["end_date"], str) else r["end_date"],
            created_at=datetime.fromisoformat(r["created_at"]) if isinstance(r["created_at"], str) else r["created_at"],
            vehicle=vehicle,
            customer=customer
        ))
    return result

@api_router.get("/reservations/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(reservation_id: str, user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    vehicle = await db.vehicles.find_one({"id": reservation["vehicle_id"]}, {"_id": 0})
    customer = await db.customers.find_one({"id": reservation["customer_id"]}, {"_id": 0})
    
    return ReservationResponse(
        **{k: v for k, v in reservation.items() if k not in ["_id", "status", "start_date", "end_date", "created_at"]},
        status=ReservationStatus(reservation["status"]),
        start_date=datetime.fromisoformat(reservation["start_date"]) if isinstance(reservation["start_date"], str) else reservation["start_date"],
        end_date=datetime.fromisoformat(reservation["end_date"]) if isinstance(reservation["end_date"], str) else reservation["end_date"],
        created_at=datetime.fromisoformat(reservation["created_at"]) if isinstance(reservation["created_at"], str) else reservation["created_at"],
        vehicle=vehicle,
        customer=customer
    )

@api_router.patch("/reservations/{reservation_id}/status")
async def update_reservation_status(reservation_id: str, status: ReservationStatus, user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    current_status = reservation["status"]
    
    # State machine validation
    valid_transitions = {
        ReservationStatus.CREATED.value: [ReservationStatus.CONFIRMED.value, ReservationStatus.CANCELLED.value],
        ReservationStatus.CONFIRMED.value: [ReservationStatus.DELIVERED.value, ReservationStatus.CANCELLED.value],
        ReservationStatus.DELIVERED.value: [ReservationStatus.RETURNED.value],
        ReservationStatus.RETURNED.value: [ReservationStatus.CLOSED.value],
        ReservationStatus.CLOSED.value: [],
        ReservationStatus.CANCELLED.value: []
    }
    
    if status.value not in valid_transitions.get(current_status, []):
        raise HTTPException(status_code=400, detail=f"Invalid status transition from {current_status} to {status.value}")
    
    await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": {"status": status.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update vehicle status based on reservation status
    if status == ReservationStatus.DELIVERED:
        await db.vehicles.update_one({"id": reservation["vehicle_id"]}, {"$set": {"status": VehicleStatus.RENTED.value}})
    elif status in [ReservationStatus.RETURNED, ReservationStatus.CLOSED, ReservationStatus.CANCELLED]:
        await db.vehicles.update_one({"id": reservation["vehicle_id"]}, {"$set": {"status": VehicleStatus.AVAILABLE.value}})
    
    return {"message": "Status updated", "status": status.value}

# ============== DELIVERY & RETURN ROUTES ==============
@api_router.post("/deliveries")
async def create_delivery(delivery: DeliveryCreate, user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({"id": delivery.reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if reservation["status"] != ReservationStatus.CONFIRMED.value:
        raise HTTPException(status_code=400, detail="Reservation must be confirmed before delivery")
    
    delivery_id = str(uuid.uuid4())
    delivery_doc = {
        "id": delivery_id,
        "company_id": user.get("company_id"),
        "reservation_id": delivery.reservation_id,
        "vehicle_id": reservation["vehicle_id"],
        "delivered_by": user["id"],
        "delivery_mileage": delivery.delivery_mileage,
        "fuel_level": delivery.fuel_level,
        "notes": delivery.notes,
        "delivered_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.deliveries.insert_one(delivery_doc)
    
    # Update reservation and vehicle status
    await db.reservations.update_one({"id": delivery.reservation_id}, {"$set": {"status": ReservationStatus.DELIVERED.value}})
    await db.vehicles.update_one({"id": reservation["vehicle_id"]}, {"$set": {"status": VehicleStatus.RENTED.value, "mileage": delivery.delivery_mileage}})
    
    return {"message": "Delivery completed", "delivery_id": delivery_id}

@api_router.post("/returns")
async def create_return(return_data: ReturnCreate, user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({"id": return_data.reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    if reservation["status"] != ReservationStatus.DELIVERED.value:
        raise HTTPException(status_code=400, detail="Vehicle must be delivered before return")
    
    return_id = str(uuid.uuid4())
    return_doc = {
        "id": return_id,
        "company_id": user.get("company_id"),
        "reservation_id": return_data.reservation_id,
        "vehicle_id": reservation["vehicle_id"],
        "returned_by": user["id"],
        "return_mileage": return_data.return_mileage,
        "fuel_level": return_data.fuel_level,
        "damage_notes": return_data.damage_notes,
        "extra_charges": return_data.extra_charges,
        "returned_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.returns.insert_one(return_doc)
    
    # Update reservation and vehicle status
    await db.reservations.update_one({"id": return_data.reservation_id}, {"$set": {"status": ReservationStatus.RETURNED.value}})
    await db.vehicles.update_one({"id": reservation["vehicle_id"]}, {"$set": {"status": VehicleStatus.AVAILABLE.value, "mileage": return_data.return_mileage}})
    
    return {"message": "Return completed", "return_id": return_id}

# ============== PAYMENT ROUTES ==============
@api_router.post("/payments")
async def create_payment(payment: PaymentCreate, user: dict = Depends(get_current_user)):
    reservation = await db.reservations.find_one({"id": payment.reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "company_id": user.get("company_id"),
        "reservation_id": payment.reservation_id,
        "amount": payment.amount,
        "payment_type": payment.payment_type,
        "card_holder": payment.card_holder,
        "status": "completed",  # Mock - in real implementation, integrate with iyzico
        "processed_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_doc)
    
    return {"message": "Payment processed", "payment_id": payment_id, "status": "completed"}

@api_router.get("/payments")
async def list_payments(user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] != UserRole.SUPERADMIN.value:
        query["company_id"] = user.get("company_id")
    
    payments = await db.payments.find(query, {"_id": 0}).to_list(1000)
    return payments

# ============== DASHBOARD ROUTES ==============
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    query = {}
    if user["role"] != UserRole.SUPERADMIN.value:
        query["company_id"] = user.get("company_id")
    
    # Vehicle stats
    total_vehicles = await db.vehicles.count_documents(query)
    available_vehicles = await db.vehicles.count_documents({**query, "status": VehicleStatus.AVAILABLE.value})
    rented_vehicles = await db.vehicles.count_documents({**query, "status": VehicleStatus.RENTED.value})
    service_vehicles = await db.vehicles.count_documents({**query, "status": VehicleStatus.SERVICE.value})
    
    # Customer stats
    total_customers = await db.customers.count_documents(query)
    
    # Reservation stats
    active_reservations = await db.reservations.count_documents({
        **query,
        "status": {"$in": [ReservationStatus.CREATED.value, ReservationStatus.CONFIRMED.value, ReservationStatus.DELIVERED.value]}
    })
    pending_returns = await db.reservations.count_documents({**query, "status": ReservationStatus.DELIVERED.value})
    
    # Revenue
    payments = await db.payments.find({**query, "status": "completed"}, {"_id": 0, "amount": 1}).to_list(10000)
    total_revenue = sum(p.get("amount", 0) for p in payments)
    
    return DashboardStats(
        total_vehicles=total_vehicles,
        available_vehicles=available_vehicles,
        rented_vehicles=rented_vehicles,
        service_vehicles=service_vehicles,
        total_customers=total_customers,
        active_reservations=active_reservations,
        total_revenue=total_revenue,
        pending_returns=pending_returns
    )

# ============== GPS MOCK ROUTES ==============
@api_router.get("/gps/vehicles")
async def get_vehicle_locations(user: dict = Depends(get_current_user)):
    """Mock GPS data for vehicles"""
    query = {"status": VehicleStatus.RENTED.value}
    if user["role"] != UserRole.SUPERADMIN.value:
        query["company_id"] = user.get("company_id")
    
    vehicles = await db.vehicles.find(query, {"_id": 0}).to_list(100)
    
    # Mock GPS coordinates (Istanbul area)
    import random
    locations = []
    for v in vehicles:
        locations.append({
            "vehicle_id": v["id"],
            "plate": v["plate"],
            "lat": 41.0082 + random.uniform(-0.1, 0.1),
            "lng": 28.9784 + random.uniform(-0.1, 0.1),
            "speed": random.randint(0, 120),
            "last_update": datetime.now(timezone.utc).isoformat()
        })
    return locations

# ============== AUDIT LOG ==============
@api_router.get("/audit-logs")
async def get_audit_logs(limit: int = 100, user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.SUPERADMIN.value, UserRole.FIRMA_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    query = {}
    if user["role"] != UserRole.SUPERADMIN.value:
        query["company_id"] = user.get("company_id")
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return logs

# ============== ROOT & HEALTH ==============
@api_router.get("/")
async def root():
    return {"message": "FleetEase API v1.0", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
# ============== PUBLIC ROUTES (No Auth Required) ==============
@api_router.get("/public/vehicles")
async def list_public_vehicles(limit: Optional[int] = None, segment: Optional[str] = None):
    """List available vehicles for public (customers)"""
    query = {"status": VehicleStatus.AVAILABLE.value}
    if segment:
        query["segment"] = segment
    
    cursor = db.vehicles.find(query, {"_id": 0})
    if limit:
        cursor = cursor.limit(limit)
    
    vehicles = await cursor.to_list(1000)
    result = []
    for v in vehicles:
        vehicle_data = dict(v)
        vehicle_data["transmission"] = TransmissionType(v["transmission"])
        vehicle_data["fuel_type"] = FuelType(v["fuel_type"])
        vehicle_data["status"] = VehicleStatus(v["status"])
        vehicle_data["created_at"] = datetime.fromisoformat(v["created_at"]) if isinstance(v["created_at"], str) else v["created_at"]
        result.append(VehicleResponse(**vehicle_data))
    return result

@api_router.get("/public/vehicles/{vehicle_id}")
async def get_public_vehicle(vehicle_id: str):
    """Get single vehicle details for public"""
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    vehicle_data = dict(vehicle)
    vehicle_data["transmission"] = TransmissionType(vehicle["transmission"])
    vehicle_data["fuel_type"] = FuelType(vehicle["fuel_type"])
    vehicle_data["status"] = VehicleStatus(vehicle["status"])
    vehicle_data["created_at"] = datetime.fromisoformat(vehicle["created_at"]) if isinstance(vehicle["created_at"], str) else vehicle["created_at"]
    return VehicleResponse(**vehicle_data)

# ============== THEME MANAGEMENT ==============
PREDEFINED_THEMES = [
    {
        "id": "classic-blue",
        "name": "Klasik Mavi",
        "description": "Profesyonel ve güvenilir kurumsal görünüm",
        "preview_image": "https://images.unsplash.com/photo-1557683316-973673bdar59?w=400",
        "colors": {
            "primary": "#3B82F6",
            "secondary": "#1E40AF",
            "accent": "#60A5FA",
            "background": "#FFFFFF",
            "text": "#1F2937",
            "hero_overlay": "rgba(30, 64, 175, 0.8)"
        },
        "hero_image": "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1920",
        "style": "modern",
        "is_premium": False
    },
    {
        "id": "elegant-dark",
        "name": "Elegant Koyu",
        "description": "Lüks ve sofistike karanlık tema",
        "preview_image": "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400",
        "colors": {
            "primary": "#F59E0B",
            "secondary": "#D97706",
            "accent": "#FBBF24",
            "background": "#111827",
            "text": "#F9FAFB",
            "hero_overlay": "rgba(17, 24, 39, 0.9)"
        },
        "hero_image": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920",
        "style": "luxury",
        "is_premium": False
    },
    {
        "id": "fresh-green",
        "name": "Taze Yeşil",
        "description": "Eko-dostu ve modern görünüm",
        "preview_image": "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400",
        "colors": {
            "primary": "#10B981",
            "secondary": "#059669",
            "accent": "#34D399",
            "background": "#FFFFFF",
            "text": "#1F2937",
            "hero_overlay": "rgba(5, 150, 105, 0.8)"
        },
        "hero_image": "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1920",
        "style": "eco",
        "is_premium": False
    },
    {
        "id": "royal-purple",
        "name": "Royal Mor",
        "description": "Premium ve dikkat çekici tasarım",
        "preview_image": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400",
        "colors": {
            "primary": "#8B5CF6",
            "secondary": "#7C3AED",
            "accent": "#A78BFA",
            "background": "#FFFFFF",
            "text": "#1F2937",
            "hero_overlay": "rgba(124, 58, 237, 0.8)"
        },
        "hero_image": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=1920",
        "style": "premium",
        "is_premium": True
    },
    {
        "id": "sunset-orange",
        "name": "Gün Batımı",
        "description": "Sıcak ve enerjik turuncu tema",
        "preview_image": "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400",
        "colors": {
            "primary": "#F97316",
            "secondary": "#EA580C",
            "accent": "#FB923C",
            "background": "#FFFBEB",
            "text": "#1F2937",
            "hero_overlay": "rgba(234, 88, 12, 0.8)"
        },
        "hero_image": "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=1920",
        "style": "energetic",
        "is_premium": False
    },
    {
        "id": "minimalist-gray",
        "name": "Minimalist Gri",
        "description": "Sade ve şık minimalist tasarım",
        "preview_image": "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400",
        "colors": {
            "primary": "#6B7280",
            "secondary": "#4B5563",
            "accent": "#9CA3AF",
            "background": "#F9FAFB",
            "text": "#111827",
            "hero_overlay": "rgba(75, 85, 99, 0.85)"
        },
        "hero_image": "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=1920",
        "style": "minimal",
        "is_premium": False
    }
]

class ThemeSettingsUpdate(BaseModel):
    active_theme_id: str
    custom_hero_title: Optional[str] = None
    custom_hero_subtitle: Optional[str] = None
    custom_logo_url: Optional[str] = None
    show_stats: bool = True
    show_features: bool = True
    show_popular_vehicles: bool = True
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    social_facebook: Optional[str] = None
    social_instagram: Optional[str] = None
    social_twitter: Optional[str] = None

class LandingPageContent(BaseModel):
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    about_text: Optional[str] = None
    features: Optional[List[dict]] = None

@api_router.get("/themes")
async def list_themes(user: dict = Depends(get_current_user)):
    """List all available themes"""
    return PREDEFINED_THEMES

@api_router.get("/themes/{theme_id}")
async def get_theme(theme_id: str):
    """Get specific theme details"""
    for theme in PREDEFINED_THEMES:
        if theme["id"] == theme_id:
            return theme
    raise HTTPException(status_code=404, detail="Theme not found")

@api_router.get("/theme-settings")
async def get_theme_settings(user: dict = Depends(get_current_user)):
    """Get current theme settings for the company"""
    company_id = user.get("company_id")
    
    settings = await db.theme_settings.find_one(
        {"company_id": company_id} if company_id else {"is_default": True},
        {"_id": 0}
    )
    
    if not settings:
        # Return default settings
        return {
            "active_theme_id": "classic-blue",
            "custom_hero_title": "Hayalinizdeki Aracı Kiralayın",
            "custom_hero_subtitle": "Geniş araç filomuz ve uygun fiyatlarımızla seyahatlerinizi konforlu hale getiriyoruz.",
            "custom_logo_url": None,
            "show_stats": True,
            "show_features": True,
            "show_popular_vehicles": True,
            "contact_phone": "0850 123 4567",
            "contact_email": "info@fleetease.com",
            "social_facebook": None,
            "social_instagram": None,
            "social_twitter": None
        }
    return settings

@api_router.put("/theme-settings")
async def update_theme_settings(settings: ThemeSettingsUpdate, user: dict = Depends(get_current_user)):
    """Update theme settings"""
    if user["role"] not in [UserRole.SUPERADMIN.value, UserRole.FIRMA_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Only admins can update theme settings")
    
    company_id = user.get("company_id")
    
    settings_doc = settings.model_dump()
    settings_doc["company_id"] = company_id
    settings_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    settings_doc["updated_by"] = user["id"]
    
    await db.theme_settings.update_one(
        {"company_id": company_id} if company_id else {"is_default": True},
        {"$set": settings_doc},
        upsert=True
    )
    
    return {"message": "Theme settings updated successfully", "settings": settings_doc}

@api_router.get("/public/theme-settings")
async def get_public_theme_settings():
    """Get theme settings for public landing page (no auth required)"""
    settings = await db.theme_settings.find_one({"is_default": True}, {"_id": 0})
    
    if not settings:
        settings = {
            "active_theme_id": "classic-blue",
            "custom_hero_title": "Hayalinizdeki Aracı Kiralayın",
            "custom_hero_subtitle": "Geniş araç filomuz ve uygun fiyatlarımızla seyahatlerinizi konforlu hale getiriyoruz.",
            "show_stats": True,
            "show_features": True,
            "show_popular_vehicles": True,
            "contact_phone": "0850 123 4567",
            "contact_email": "info@fleetease.com"
        }
    
    # Get theme details
    active_theme = None
    for theme in PREDEFINED_THEMES:
        if theme["id"] == settings.get("active_theme_id", "classic-blue"):
            active_theme = theme
            break
    
    return {
        "settings": settings,
        "theme": active_theme or PREDEFINED_THEMES[0]
    }

@api_router.put("/landing-content")
async def update_landing_content(content: LandingPageContent, user: dict = Depends(get_current_user)):
    """Update landing page content"""
    if user["role"] not in [UserRole.SUPERADMIN.value, UserRole.FIRMA_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Only admins can update landing content")
    
    company_id = user.get("company_id")
    
    content_doc = content.model_dump()
    content_doc["company_id"] = company_id
    content_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.landing_content.update_one(
        {"company_id": company_id} if company_id else {"is_default": True},
        {"$set": content_doc},
        upsert=True
    )
    
    return {"message": "Landing content updated successfully"}

# ============== IMAGE UPLOAD (MongoDB Storage) ==============
@api_router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    type: str = Form("general"),
    user: dict = Depends(get_current_user)
):
    """
    Upload image file (logo, slider, vehicle, etc.)
    Max size: 2MB for logo, 5MB for sliders
    Stores image in MongoDB as base64 for persistent storage across containers
    """
    if user["role"] not in [UserRole.SUPERADMIN.value, UserRole.FIRMA_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Only admins can upload images")
    
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Geçersiz dosya türü. İzin verilenler: JPEG, PNG, GIF, WebP, SVG")
    
    # Read file content
    content = await file.read()
    
    # Check file size based on type
    max_size = 2 * 1024 * 1024 if type == "logo" else 5 * 1024 * 1024  # 2MB for logo, 5MB for others
    if len(content) > max_size:
        max_mb = max_size // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Dosya boyutu {max_mb}MB sınırını aşıyor")
    
    # Generate unique ID
    image_id = str(uuid.uuid4())
    
    # Convert to base64 for storage
    base64_content = base64.b64encode(content).decode('utf-8')
    
    # Create data URI for direct embedding in HTML/CSS
    data_uri = f"data:{file.content_type};base64,{base64_content}"
    
    # Store in MongoDB
    company_id = user.get("company_id")
    image_doc = {
        "id": image_id,
        "company_id": company_id,
        "type": type,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(content),
        "data": base64_content,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    
    await db.uploaded_images.insert_one(image_doc)
    
    logger.info(f"Image uploaded to MongoDB: {image_id} ({len(content)} bytes) by {user['email']}")
    
    return {
        "success": True,
        "id": image_id,
        "url": f"/api/images/{image_id}",
        "data_uri": data_uri,
        "filename": file.filename,
        "size": len(content)
    }

@api_router.get("/images/{image_id}")
async def get_image(image_id: str):
    """Serve uploaded images from MongoDB"""
    from fastapi.responses import Response
    
    image = await db.uploaded_images.find_one({"id": image_id}, {"_id": 0})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Decode base64 content
    content = base64.b64decode(image["data"])
    
    return Response(
        content=content,
        media_type=image.get("content_type", "image/jpeg"),
        headers={
            "Cache-Control": "public, max-age=31536000",
            "Content-Disposition": f"inline; filename={image.get('filename', 'image')}"
        }
    )

@api_router.delete("/images/{image_id}")
async def delete_image(image_id: str, user: dict = Depends(get_current_user)):
    """Delete an uploaded image"""
    if user["role"] not in [UserRole.SUPERADMIN.value, UserRole.FIRMA_ADMIN.value]:
        raise HTTPException(status_code=403, detail="Only admins can delete images")
    
    company_id = user.get("company_id")
    
    # Find and delete the image
    result = await db.uploaded_images.delete_one({
        "id": image_id,
        "$or": [{"company_id": company_id}, {"company_id": None}]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Image not found or no permission")
    
    logger.info(f"Image deleted: {image_id} by {user['email']}")
    
    return {"success": True, "message": "Image deleted successfully"}

# ============== DEMO REQUEST ==============
class DemoRequestCreate(BaseModel):
    name: str
    email: str
    phone: str
    company: str = ""
    vehicles: str = ""
    message: str = ""

@api_router.post("/demo-requests")
async def create_demo_request(request: DemoRequestCreate):
    """
    Public: Submit a demo request from landing page
    Stores request and creates a company entry with 'pending' status
    """
    demo_request = {
        "id": str(uuid.uuid4()),
        "name": request.name,
        "email": request.email,
        "phone": request.phone,
        "company": request.company,
        "vehicles": request.vehicles,
        "message": request.message,
        "status": "pending",  # pending, contacted, converted, rejected
        "source": "landing_page",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.demo_requests.insert_one(demo_request)
    
    # Also create a company entry with pending_approval status
    if request.company:
        company_code = request.company.lower().replace(" ", "_").replace("-", "_")[:20]
        existing = await db.companies.find_one({"code": company_code})
        
        if not existing:
            company_doc = {
                "id": str(uuid.uuid4()),
                "name": request.company,
                "code": company_code,
                "status": CompanyStatus.PENDING_APPROVAL.value,
                "admin_email": request.email,
                "admin_phone": request.phone,
                "admin_name": request.name,
                "vehicle_count": request.vehicles,
                "notes": request.message,
                "source": "demo_request",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.companies.insert_one(company_doc)
            logger.info(f"New company created from demo request: {request.company}")
    
    logger.info(f"Demo request received: {request.email}")
    
    return {"success": True, "message": "Demo request submitted successfully"}

@api_router.get("/superadmin/demo-requests")
async def get_demo_requests(user: dict = Depends(get_current_user)):
    """SuperAdmin: Get all demo requests"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view demo requests")
    
    requests = await db.demo_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return requests

# ============== SUBSCRIPTION MANAGEMENT ==============

@api_router.get("/subscription/plans")
async def get_subscription_plans():
    """Public: Get all available subscription plans"""
    return SUBSCRIPTION_PLANS

@api_router.get("/superadmin/subscriptions")
async def get_all_subscriptions(user: dict = Depends(get_current_user)):
    """SuperAdmin: Get all company subscriptions with payment history"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view subscriptions")
    
    # Get all companies with subscription info
    companies = await db.companies.find(
        {},
        {"_id": 0, "id": 1, "name": 1, "code": 1, "status": 1, "subscription_plan": 1, 
         "billing_cycle": 1, "subscription_start": 1, "subscription_end": 1,
         "trial_end": 1, "admin_email": 1, "created_at": 1}
    ).to_list(1000)
    
    # Get payment summary for each company
    for company in companies:
        payments = await db.subscription_payments.find(
            {"company_id": company["id"]},
            {"_id": 0}
        ).sort("created_at", -1).to_list(10)
        company["recent_payments"] = payments
        
        # Calculate total revenue from this company
        total = await db.subscription_payments.aggregate([
            {"$match": {"company_id": company["id"], "status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(1)
        company["total_revenue"] = total[0]["total"] if total else 0
    
    return companies

@api_router.post("/superadmin/subscriptions/{company_id}/activate")
async def activate_subscription(
    company_id: str,
    plan: str,
    billing_cycle: str = "monthly",
    user: dict = Depends(get_current_user)
):
    """SuperAdmin: Manually activate a subscription for a company"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can activate subscriptions")
    
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if plan not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")
    
    plan_details = SUBSCRIPTION_PLANS[plan]
    
    # Calculate subscription period
    now = datetime.now(timezone.utc)
    if billing_cycle == "yearly":
        end_date = now + timedelta(days=365)
        amount = plan_details["price_yearly"]
    else:
        end_date = now + timedelta(days=30)
        amount = plan_details["price_monthly"]
    
    # Update company subscription
    await db.companies.update_one(
        {"id": company_id},
        {"$set": {
            "subscription_plan": plan,
            "billing_cycle": billing_cycle,
            "subscription_start": now.isoformat(),
            "subscription_end": end_date.isoformat(),
            "max_vehicles": plan_details["max_vehicles"],
            "max_users": plan_details["max_users"],
            "features": plan_details["features"],
            "status": CompanyStatus.PENDING.value if company.get("status") == CompanyStatus.PENDING_PAYMENT.value else company.get("status"),
            "updated_at": now.isoformat()
        }}
    )
    
    # Create payment record (manual activation)
    payment_record = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "company_name": company["name"],
        "plan": plan,
        "billing_cycle": billing_cycle,
        "amount": amount,
        "currency": "TRY",
        "payment_method": "manual",
        "status": PaymentStatus.COMPLETED.value,
        "notes": f"Manually activated by {user['email']}",
        "created_at": now.isoformat(),
        "created_by": user["id"]
    }
    await db.subscription_payments.insert_one(payment_record)
    
    logger.info(f"Subscription activated for {company['name']}: {plan} ({billing_cycle})")
    
    return {
        "success": True,
        "message": f"Subscription activated: {plan_details['name']} ({billing_cycle})",
        "subscription_end": end_date.isoformat(),
        "amount": amount
    }

@api_router.post("/superadmin/subscriptions/{company_id}/extend")
async def extend_subscription(
    company_id: str,
    months: int = 1,
    user: dict = Depends(get_current_user)
):
    """SuperAdmin: Extend a company's subscription"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can extend subscriptions")
    
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Calculate new end date
    current_end = company.get("subscription_end")
    if current_end:
        current_end = datetime.fromisoformat(current_end.replace('Z', '+00:00'))
    else:
        current_end = datetime.now(timezone.utc)
    
    new_end = current_end + timedelta(days=30 * months)
    
    await db.companies.update_one(
        {"id": company_id},
        {"$set": {
            "subscription_end": new_end.isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"Subscription extended for {company['name']}: +{months} months")
    
    return {
        "success": True,
        "message": f"Subscription extended by {months} month(s)",
        "new_end_date": new_end.isoformat()
    }

@api_router.post("/superadmin/subscriptions/{company_id}/suspend")
async def suspend_subscription(company_id: str, reason: str = "", user: dict = Depends(get_current_user)):
    """SuperAdmin: Suspend a company's subscription"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can suspend subscriptions")
    
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    await db.companies.update_one(
        {"id": company_id},
        {"$set": {
            "status": CompanyStatus.SUSPENDED.value,
            "suspension_reason": reason,
            "suspended_at": datetime.now(timezone.utc).isoformat(),
            "suspended_by": user["id"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    logger.info(f"Subscription suspended for {company['name']}: {reason}")
    
    return {"success": True, "message": "Subscription suspended"}

# ============== PAYMENT RECORDS ==============

class PaymentRecordCreate(BaseModel):
    company_id: str
    amount: float
    payment_method: str
    reference_no: Optional[str] = None
    notes: Optional[str] = None

@api_router.post("/superadmin/payments")
async def record_payment(payment: PaymentRecordCreate, user: dict = Depends(get_current_user)):
    """SuperAdmin: Record a manual payment (bank transfer, etc.)"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can record payments")
    
    company = await db.companies.find_one({"id": payment.company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    now = datetime.now(timezone.utc)
    
    payment_record = {
        "id": str(uuid.uuid4()),
        "company_id": payment.company_id,
        "company_name": company["name"],
        "plan": company.get("subscription_plan", "unknown"),
        "billing_cycle": company.get("billing_cycle", "monthly"),
        "amount": payment.amount,
        "currency": "TRY",
        "payment_method": payment.payment_method,
        "reference_no": payment.reference_no,
        "status": PaymentStatus.COMPLETED.value,
        "notes": payment.notes,
        "created_at": now.isoformat(),
        "created_by": user["id"]
    }
    
    await db.subscription_payments.insert_one(payment_record)
    
    # Extend subscription based on payment
    plan = company.get("subscription_plan", "starter")
    plan_details = SUBSCRIPTION_PLANS.get(plan, SUBSCRIPTION_PLANS["starter"])
    
    billing_cycle = company.get("billing_cycle", "monthly")
    expected_amount = plan_details["price_yearly"] if billing_cycle == "yearly" else plan_details["price_monthly"]
    
    # Calculate months to extend (based on payment amount)
    if expected_amount > 0:
        months = int(payment.amount / (expected_amount / (12 if billing_cycle == "yearly" else 1)))
        months = max(1, months)  # At least 1 month
    else:
        months = 1
    
    # Extend subscription
    current_end = company.get("subscription_end")
    if current_end:
        current_end = datetime.fromisoformat(current_end.replace('Z', '+00:00'))
    else:
        current_end = now
    
    new_end = current_end + timedelta(days=30 * months)
    
    # Update company status if pending payment
    new_status = company.get("status")
    if new_status == CompanyStatus.PENDING_PAYMENT.value:
        new_status = CompanyStatus.PENDING.value
    
    await db.companies.update_one(
        {"id": payment.company_id},
        {"$set": {
            "subscription_end": new_end.isoformat(),
            "status": new_status,
            "last_payment_date": now.isoformat(),
            "updated_at": now.isoformat()
        }}
    )
    
    logger.info(f"Payment recorded for {company['name']}: ₺{payment.amount} ({payment.payment_method})")
    
    return {
        "success": True,
        "message": f"Payment of ₺{payment.amount} recorded",
        "payment_id": payment_record["id"],
        "subscription_extended_to": new_end.isoformat(),
        "months_added": months
    }

@api_router.get("/superadmin/payments")
async def get_all_payments(
    user: dict = Depends(get_current_user),
    limit: int = 100,
    skip: int = 0
):
    """SuperAdmin: Get all payment records"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view payments")
    
    payments = await db.subscription_payments.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    total = await db.subscription_payments.count_documents({})
    
    return {
        "payments": payments,
        "total": total,
        "limit": limit,
        "skip": skip
    }

@api_router.get("/superadmin/finance/summary")
async def get_finance_summary(user: dict = Depends(get_current_user)):
    """SuperAdmin: Get financial summary and statistics"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view finance summary")
    
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Total revenue
    total_revenue = await db.subscription_payments.aggregate([
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    # This month revenue
    monthly_revenue = await db.subscription_payments.aggregate([
        {"$match": {"status": "completed", "created_at": {"$gte": start_of_month.isoformat()}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    # This year revenue
    yearly_revenue = await db.subscription_payments.aggregate([
        {"$match": {"status": "completed", "created_at": {"$gte": start_of_year.isoformat()}}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    # Revenue by plan
    revenue_by_plan = await db.subscription_payments.aggregate([
        {"$match": {"status": "completed"}},
        {"$group": {"_id": "$plan", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]).to_list(10)
    
    # Active subscriptions count by plan
    subscriptions_by_plan = await db.companies.aggregate([
        {"$match": {"status": {"$in": ["active", "pending"]}}},
        {"$group": {"_id": "$subscription_plan", "count": {"$sum": 1}}}
    ]).to_list(10)
    
    # Companies with expiring subscriptions (next 30 days)
    expiring_soon = await db.companies.find({
        "status": "active",
        "subscription_end": {
            "$lte": (now + timedelta(days=30)).isoformat(),
            "$gte": now.isoformat()
        }
    }, {"_id": 0, "id": 1, "name": 1, "subscription_end": 1, "subscription_plan": 1}).to_list(100)
    
    # Recent payments
    recent_payments = await db.subscription_payments.find(
        {"status": "completed"},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "total_revenue": total_revenue[0]["total"] if total_revenue else 0,
        "monthly_revenue": monthly_revenue[0]["total"] if monthly_revenue else 0,
        "yearly_revenue": yearly_revenue[0]["total"] if yearly_revenue else 0,
        "revenue_by_plan": {item["_id"]: {"total": item["total"], "count": item["count"]} for item in revenue_by_plan},
        "subscriptions_by_plan": {item["_id"]: item["count"] for item in subscriptions_by_plan},
        "expiring_soon": expiring_soon,
        "recent_payments": recent_payments,
        "currency": "TRY"
    }

# ============== IYZICO PAYMENT INTEGRATION ==============

from services.iyzico_service import iyzico_service

class IyzicoCheckoutRequest(BaseModel):
    company_id: str
    plan: str  # starter, professional, enterprise
    billing_cycle: str = "monthly"  # monthly, yearly

class IyzicoCallbackPayload(BaseModel):
    token: str
    conversationId: Optional[str] = None

@api_router.get("/payment/iyzico/status")
async def get_iyzico_status():
    """Check if iyzico is configured"""
    return {
        "configured": iyzico_service.is_configured,
        "base_url": iyzico_service.base_url if iyzico_service.is_configured else None
    }

@api_router.post("/payment/iyzico/checkout/initialize")
async def initialize_iyzico_checkout(
    request: IyzicoCheckoutRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user)
):
    """Initialize iyzico checkout form for subscription payment"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can initialize payments")
    
    if not iyzico_service.is_configured:
        raise HTTPException(
            status_code=400, 
            detail="iyzico API keys not configured. Please add IYZICO_API_KEY and IYZICO_SECRET_KEY to backend/.env"
        )
    
    company = await db.companies.find_one({"id": request.company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Calculate price based on plan
    plan_prices = {
        "starter": {"monthly": 999.00, "yearly": 9990.00},
        "professional": {"monthly": 2499.00, "yearly": 24990.00},
        "enterprise": {"monthly": 4999.00, "yearly": 49990.00}
    }
    
    price_info = plan_prices.get(request.plan, plan_prices["starter"])
    price = price_info.get(request.billing_cycle, price_info["monthly"])
    
    # Get company admin info for buyer
    admin = await db.users.find_one({"company_id": request.company_id, "role": "firma_admin"})
    if not admin:
        admin = {"email": company.get("email", "admin@example.com"), "full_name": company["name"]}
    
    # Prepare buyer info
    buyer = {
        "id": request.company_id,
        "name": admin.get("full_name", company["name"]).split()[0] if admin.get("full_name") else "Admin",
        "surname": admin.get("full_name", company["name"]).split()[-1] if admin.get("full_name") and len(admin.get("full_name", "").split()) > 1 else "User",
        "gsmNumber": company.get("phone", "+905000000000"),
        "email": admin.get("email", company.get("email", "admin@example.com")),
        "identityNumber": "11111111111",  # TC Kimlik No (test)
        "registrationAddress": company.get("address", "İstanbul, Türkiye"),
        "ip": "85.34.78.112",
        "city": "Istanbul",
        "country": "Turkey"
    }
    
    address = {
        "contactName": buyer["name"] + " " + buyer["surname"],
        "city": "Istanbul",
        "country": "Turkey",
        "address": company.get("address", "İstanbul, Türkiye")
    }
    
    basket_items = [
        {
            "id": f"SUB_{request.plan.upper()}_{request.billing_cycle.upper()}",
            "name": f"FleetEase {request.plan.title()} Plan ({request.billing_cycle.title()})",
            "category1": "SaaS Subscription",
            "category2": "Car Rental Software",
            "itemType": "VIRTUAL",
            "price": str(price)
        }
    ]
    
    # Get callback URL from environment
    frontend_url = os.environ.get("FRONTEND_URL", "https://carfleet-hub-5.preview.emergentagent.com")
    callback_url = f"{frontend_url}/superadmin/payment/callback"
    
    result = await iyzico_service.create_checkout_form(
        price=price,
        paid_price=price,
        basket_id=f"BASKET_{request.company_id}_{request.plan}",
        buyer=buyer,
        shipping_address=address,
        billing_address=address,
        basket_items=basket_items,
        callback_url=callback_url
    )
    
    if result.get("status") == "success":
        # Store checkout session
        session_doc = {
            "id": str(uuid.uuid4()),
            "conversation_id": result.get("conversationId"),
            "token": result.get("token"),
            "company_id": request.company_id,
            "plan": request.plan,
            "billing_cycle": request.billing_cycle,
            "amount": price,
            "status": "initiated",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user["id"]
        }
        await db.iyzico_sessions.insert_one(session_doc)
        
        return {
            "success": True,
            "token": result.get("token"),
            "checkoutFormContent": result.get("checkoutFormContent"),
            "paymentPageUrl": result.get("paymentPageUrl"),
            "tokenExpireTime": result.get("tokenExpireTime"),
            "conversationId": result.get("conversationId")
        }
    else:
        logger.error(f"iyzico checkout init failed: {result}")
        raise HTTPException(
            status_code=400, 
            detail=result.get("errorMessage", "Failed to initialize checkout")
        )

@api_router.post("/payment/iyzico/callback")
async def iyzico_payment_callback(request: Request):
    """Handle iyzico payment callback"""
    try:
        # Get token from form data or JSON
        content_type = request.headers.get("content-type", "")
        
        if "application/x-www-form-urlencoded" in content_type:
            form_data = await request.form()
            token = form_data.get("token")
        else:
            body = await request.json()
            token = body.get("token")
        
        if not token:
            raise HTTPException(status_code=400, detail="Token is required")
        
        # Retrieve checkout result
        result = await iyzico_service.retrieve_checkout_result(token)
        
        # Find the session
        session = await db.iyzico_sessions.find_one({"token": token})
        
        if result.get("status") == "success" and result.get("paymentStatus") == "SUCCESS":
            # Payment successful
            now = datetime.now(timezone.utc)
            
            # Update session
            await db.iyzico_sessions.update_one(
                {"token": token},
                {"$set": {
                    "status": "completed",
                    "payment_id": result.get("paymentId"),
                    "completed_at": now.isoformat()
                }}
            )
            
            if session:
                company_id = session["company_id"]
                plan = session["plan"]
                billing_cycle = session["billing_cycle"]
                amount = session["amount"]
                
                # Calculate subscription period
                if billing_cycle == "yearly":
                    months = 12
                else:
                    months = 1
                
                new_end = now + timedelta(days=30 * months)
                
                # Update company subscription
                await db.companies.update_one(
                    {"id": company_id},
                    {"$set": {
                        "status": CompanyStatus.ACTIVE.value,
                        "subscription_plan": plan,
                        "billing_cycle": billing_cycle,
                        "subscription_start": now.isoformat(),
                        "subscription_end": new_end.isoformat(),
                        "last_payment_date": now.isoformat(),
                        "updated_at": now.isoformat()
                    }}
                )
                
                # Record payment
                payment_record = {
                    "id": str(uuid.uuid4()),
                    "company_id": company_id,
                    "plan": plan,
                    "billing_cycle": billing_cycle,
                    "amount": amount,
                    "currency": "TRY",
                    "payment_method": "iyzico",
                    "payment_id": result.get("paymentId"),
                    "status": PaymentStatus.COMPLETED.value,
                    "created_at": now.isoformat()
                }
                await db.subscription_payments.insert_one(payment_record)
                
                logger.info(f"iyzico payment completed for company {company_id}: ₺{amount}")
            
            return {"status": "success", "message": "Payment completed successfully"}
        else:
            # Payment failed
            await db.iyzico_sessions.update_one(
                {"token": token},
                {"$set": {
                    "status": "failed",
                    "error": result.get("errorMessage"),
                    "failed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.error(f"iyzico payment failed: {result}")
            return {"status": "failed", "message": result.get("errorMessage", "Payment failed")}
    
    except Exception as e:
        logger.error(f"iyzico callback error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/payment/iyzico/webhook")
async def iyzico_webhook(request: Request):
    """Handle iyzico webhooks for subscription events"""
    try:
        payload = await request.body()
        signature = request.headers.get("X-IYZ-SIGNATURE-V3", "")
        
        # Verify signature
        if not iyzico_service.verify_webhook_signature(payload, signature):
            logger.warning("Invalid iyzico webhook signature")
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        body = json.loads(payload)
        event_type = body.get("iyziEventType")
        
        logger.info(f"iyzico webhook received: {event_type}")
        
        if event_type == "SUBSCRIPTION_PAYMENT_SUCCESS":
            # Handle recurring payment success
            subscription_ref = body.get("subscriptionReferenceCode")
            payment_id = body.get("paymentId")
            
            # Find company by subscription reference
            company = await db.companies.find_one({"iyzico_subscription_ref": subscription_ref})
            if company:
                now = datetime.now(timezone.utc)
                
                # Extend subscription
                current_end = datetime.fromisoformat(company.get("subscription_end", now.isoformat()).replace("Z", "+00:00"))
                new_end = max(current_end, now) + timedelta(days=30)
                
                await db.companies.update_one(
                    {"id": company["id"]},
                    {"$set": {
                        "subscription_end": new_end.isoformat(),
                        "last_payment_date": now.isoformat(),
                        "updated_at": now.isoformat()
                    }}
                )
                
                # Record payment
                payment_record = {
                    "id": str(uuid.uuid4()),
                    "company_id": company["id"],
                    "plan": company.get("subscription_plan", "starter"),
                    "billing_cycle": "monthly",
                    "amount": body.get("paidPrice", 0),
                    "currency": "TRY",
                    "payment_method": "iyzico_recurring",
                    "payment_id": payment_id,
                    "status": PaymentStatus.COMPLETED.value,
                    "created_at": now.isoformat()
                }
                await db.subscription_payments.insert_one(payment_record)
                
                logger.info(f"Recurring payment processed for {company['name']}")
        
        elif event_type == "SUBSCRIPTION_CANCELLED":
            subscription_ref = body.get("subscriptionReferenceCode")
            company = await db.companies.find_one({"iyzico_subscription_ref": subscription_ref})
            if company:
                await db.companies.update_one(
                    {"id": company["id"]},
                    {"$set": {
                        "status": CompanyStatus.SUSPENDED.value,
                        "suspension_reason": "Subscription cancelled",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                logger.info(f"Subscription cancelled for {company['name']}")
        
        return {"status": "received"}
    
    except Exception as e:
        logger.error(f"iyzico webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

# ============== SUPPORT TICKET SYSTEM ==============

class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_CUSTOMER = "waiting_customer"
    RESOLVED = "resolved"
    CLOSED = "closed"

class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class TicketCategory(str, Enum):
    TECHNICAL = "technical"
    BILLING = "billing"
    FEATURE_REQUEST = "feature_request"
    BUG_REPORT = "bug_report"
    GENERAL = "general"
    ACCOUNT = "account"

class TicketCreate(BaseModel):
    subject: str
    message: str
    category: str = "general"
    priority: str = "medium"

class TicketReply(BaseModel):
    message: str

# Tenant: Create a support ticket
@api_router.post("/support/tickets")
async def create_ticket(ticket: TicketCreate, user: dict = Depends(get_current_user)):
    """Create a support ticket (for company admins)"""
    if user["role"] not in [UserRole.FIRMA_ADMIN.value, UserRole.PERSONEL.value]:
        raise HTTPException(status_code=403, detail="Only company users can create tickets")
    
    company_id = user.get("company_id")
    company = await db.companies.find_one({"id": company_id}, {"_id": 0, "name": 1})
    
    now = datetime.now(timezone.utc)
    ticket_id = str(uuid.uuid4())
    ticket_number = f"TKT-{now.strftime('%Y%m%d')}-{ticket_id[:6].upper()}"
    
    ticket_doc = {
        "id": ticket_id,
        "ticket_number": ticket_number,
        "company_id": company_id,
        "company_name": company.get("name") if company else "Unknown",
        "created_by": user["id"],
        "created_by_email": user["email"],
        "created_by_name": user.get("full_name", user["email"]),
        "subject": ticket.subject,
        "category": ticket.category,
        "priority": ticket.priority,
        "status": TicketStatus.OPEN.value,
        "messages": [
            {
                "id": str(uuid.uuid4()),
                "sender_id": user["id"],
                "sender_name": user.get("full_name", user["email"]),
                "sender_type": "customer",
                "message": ticket.message,
                "created_at": now.isoformat()
            }
        ],
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "resolved_at": None,
        "assigned_to": None
    }
    
    await db.support_tickets.insert_one(ticket_doc)
    logger.info(f"Support ticket created: {ticket_number} by {user['email']}")
    
    return {
        "success": True,
        "ticket_id": ticket_id,
        "ticket_number": ticket_number,
        "message": "Destek talebiniz oluşturuldu"
    }

# Tenant: Get my tickets
@api_router.get("/support/tickets")
async def get_my_tickets(user: dict = Depends(get_current_user)):
    """Get all tickets for the current user's company"""
    if user["role"] not in [UserRole.FIRMA_ADMIN.value, UserRole.PERSONEL.value]:
        raise HTTPException(status_code=403, detail="Only company users can view tickets")
    
    company_id = user.get("company_id")
    tickets = await db.support_tickets.find(
        {"company_id": company_id},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    return tickets

# Tenant: Get single ticket
@api_router.get("/support/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, user: dict = Depends(get_current_user)):
    """Get a specific ticket"""
    ticket = await db.support_tickets.find_one({"id": ticket_id}, {"_id": 0})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access
    if user["role"] == UserRole.SUPERADMIN.value:
        return ticket
    elif user.get("company_id") == ticket.get("company_id"):
        return ticket
    else:
        raise HTTPException(status_code=403, detail="Access denied")

# Tenant: Reply to ticket
@api_router.post("/support/tickets/{ticket_id}/reply")
async def reply_to_ticket(ticket_id: str, reply: TicketReply, user: dict = Depends(get_current_user)):
    """Add a reply to a ticket"""
    ticket = await db.support_tickets.find_one({"id": ticket_id})
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access
    is_superadmin = user["role"] == UserRole.SUPERADMIN.value
    is_owner = user.get("company_id") == ticket.get("company_id")
    
    if not is_superadmin and not is_owner:
        raise HTTPException(status_code=403, detail="Access denied")
    
    now = datetime.now(timezone.utc)
    
    new_message = {
        "id": str(uuid.uuid4()),
        "sender_id": user["id"],
        "sender_name": user.get("full_name", user["email"]),
        "sender_type": "support" if is_superadmin else "customer",
        "message": reply.message,
        "created_at": now.isoformat()
    }
    
    # Update status based on who replied
    new_status = ticket["status"]
    if is_superadmin and ticket["status"] == TicketStatus.OPEN.value:
        new_status = TicketStatus.IN_PROGRESS.value
    elif is_superadmin:
        new_status = TicketStatus.WAITING_CUSTOMER.value
    elif not is_superadmin and ticket["status"] == TicketStatus.WAITING_CUSTOMER.value:
        new_status = TicketStatus.IN_PROGRESS.value
    
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"messages": new_message},
            "$set": {
                "status": new_status,
                "updated_at": now.isoformat()
            }
        }
    )
    
    logger.info(f"Reply added to ticket {ticket['ticket_number']} by {user['email']}")
    
    return {"success": True, "message": "Yanıt eklendi"}

# SuperAdmin: Get all tickets
@api_router.get("/superadmin/tickets")
async def get_all_tickets(
    user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 100
):
    """SuperAdmin: Get all support tickets"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view all tickets")
    
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    
    tickets = await db.support_tickets.find(
        query,
        {"_id": 0}
    ).sort("updated_at", -1).limit(limit).to_list(limit)
    
    # Get ticket stats
    stats = {
        "total": await db.support_tickets.count_documents({}),
        "open": await db.support_tickets.count_documents({"status": "open"}),
        "in_progress": await db.support_tickets.count_documents({"status": "in_progress"}),
        "waiting_customer": await db.support_tickets.count_documents({"status": "waiting_customer"}),
        "resolved": await db.support_tickets.count_documents({"status": "resolved"}),
        "closed": await db.support_tickets.count_documents({"status": "closed"})
    }
    
    return {"tickets": tickets, "stats": stats}

# SuperAdmin: Update ticket status
@api_router.patch("/superadmin/tickets/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    status: str,
    user: dict = Depends(get_current_user)
):
    """SuperAdmin: Update ticket status"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can update ticket status")
    
    ticket = await db.support_tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    now = datetime.now(timezone.utc)
    update_data = {
        "status": status,
        "updated_at": now.isoformat()
    }
    
    if status == TicketStatus.RESOLVED.value:
        update_data["resolved_at"] = now.isoformat()
        update_data["resolved_by"] = user["id"]
    
    await db.support_tickets.update_one({"id": ticket_id}, {"$set": update_data})
    
    logger.info(f"Ticket {ticket['ticket_number']} status updated to {status}")
    
    return {"success": True, "message": f"Durum güncellendi: {status}"}

# SuperAdmin: Assign ticket
@api_router.patch("/superadmin/tickets/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: str,
    assigned_to: str,
    user: dict = Depends(get_current_user)
):
    """SuperAdmin: Assign ticket to a support agent"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can assign tickets")
    
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {"$set": {
            "assigned_to": assigned_to,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Ticket atandı"}

# ============== FRANCHISE MANAGEMENT SYSTEM ==============

class FranchiseStatus(str, Enum):
    APPLICATION = "application"      # Başvuru yapıldı
    UNDER_REVIEW = "under_review"    # İnceleniyor
    APPROVED = "approved"            # Onaylandı, sözleşme bekliyor
    ACTIVE = "active"                # Aktif franchise
    SUSPENDED = "suspended"          # Askıya alındı
    TERMINATED = "terminated"        # Sonlandırıldı

class FranchiseApplicationCreate(BaseModel):
    # Kişisel Bilgiler
    full_name: str
    email: str
    phone: str
    tc_no: Optional[str] = None
    
    # Firma Bilgileri
    company_name: Optional[str] = None
    tax_no: Optional[str] = None
    
    # Lokasyon
    city: str
    district: str
    address: Optional[str] = None
    
    # Deneyim
    experience_years: int = 0
    current_vehicle_count: int = 0
    has_office: bool = False
    investment_budget: Optional[str] = None
    
    # Ek Bilgiler
    how_did_you_hear: Optional[str] = None
    message: Optional[str] = None

# Public: Submit franchise application
@api_router.post("/franchise/apply")
async def apply_franchise(application: FranchiseApplicationCreate):
    """Public: Submit a franchise application"""
    
    # Check if email already applied
    existing = await db.franchise_applications.find_one({"email": application.email})
    if existing:
        raise HTTPException(status_code=400, detail="Bu e-posta ile daha önce başvuru yapılmış")
    
    now = datetime.now(timezone.utc)
    app_id = str(uuid.uuid4())
    app_number = f"FRN-{now.strftime('%Y%m%d')}-{app_id[:6].upper()}"
    
    franchise_doc = {
        "id": app_id,
        "application_number": app_number,
        "status": FranchiseStatus.APPLICATION.value,
        
        # Kişisel
        "full_name": application.full_name,
        "email": application.email,
        "phone": application.phone,
        "tc_no": application.tc_no,
        
        # Firma
        "company_name": application.company_name,
        "tax_no": application.tax_no,
        
        # Lokasyon
        "city": application.city,
        "district": application.district,
        "address": application.address,
        
        # Deneyim
        "experience_years": application.experience_years,
        "current_vehicle_count": application.current_vehicle_count,
        "has_office": application.has_office,
        "investment_budget": application.investment_budget,
        
        # Ek
        "how_did_you_hear": application.how_did_you_hear,
        "message": application.message,
        
        # Meta
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "notes": [],
        "documents": [],
        "assigned_to": None
    }
    
    await db.franchise_applications.insert_one(franchise_doc)
    
    logger.info(f"Franchise application received: {app_number} - {application.full_name}")
    
    return {
        "success": True,
        "application_number": app_number,
        "message": "Franchise başvurunuz alındı. En kısa sürede sizinle iletişime geçeceğiz."
    }

# Public: Check application status
@api_router.get("/franchise/status/{application_number}")
async def check_franchise_status(application_number: str, email: str):
    """Public: Check franchise application status"""
    application = await db.franchise_applications.find_one(
        {"application_number": application_number, "email": email},
        {"_id": 0, "application_number": 1, "status": 1, "full_name": 1, "created_at": 1}
    )
    
    if not application:
        raise HTTPException(status_code=404, detail="Başvuru bulunamadı")
    
    return application

# SuperAdmin: Get all franchise applications
@api_router.get("/superadmin/franchises")
async def get_all_franchises(
    user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    limit: int = 100
):
    """SuperAdmin: Get all franchise applications"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view franchises")
    
    query = {}
    if status:
        query["status"] = status
    
    franchises = await db.franchise_applications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Stats
    stats = {
        "total": await db.franchise_applications.count_documents({}),
        "application": await db.franchise_applications.count_documents({"status": "application"}),
        "under_review": await db.franchise_applications.count_documents({"status": "under_review"}),
        "approved": await db.franchise_applications.count_documents({"status": "approved"}),
        "active": await db.franchise_applications.count_documents({"status": "active"}),
        "suspended": await db.franchise_applications.count_documents({"status": "suspended"})
    }
    
    return {"franchises": franchises, "stats": stats}

# SuperAdmin: Get single franchise
@api_router.get("/superadmin/franchises/{franchise_id}")
async def get_franchise(franchise_id: str, user: dict = Depends(get_current_user)):
    """SuperAdmin: Get franchise details"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view franchise details")
    
    franchise = await db.franchise_applications.find_one({"id": franchise_id}, {"_id": 0})
    if not franchise:
        raise HTTPException(status_code=404, detail="Franchise not found")
    
    return franchise

# SuperAdmin: Update franchise status
@api_router.patch("/superadmin/franchises/{franchise_id}/status")
async def update_franchise_status(
    franchise_id: str,
    status: str,
    user: dict = Depends(get_current_user)
):
    """SuperAdmin: Update franchise status"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can update franchise status")
    
    franchise = await db.franchise_applications.find_one({"id": franchise_id})
    if not franchise:
        raise HTTPException(status_code=404, detail="Franchise not found")
    
    now = datetime.now(timezone.utc)
    update_data = {
        "status": status,
        "updated_at": now.isoformat()
    }
    
    # Add status change to notes
    note = {
        "id": str(uuid.uuid4()),
        "type": "status_change",
        "old_status": franchise["status"],
        "new_status": status,
        "by": user["email"],
        "created_at": now.isoformat()
    }
    
    await db.franchise_applications.update_one(
        {"id": franchise_id},
        {
            "$set": update_data,
            "$push": {"notes": note}
        }
    )
    
    logger.info(f"Franchise {franchise['application_number']} status changed to {status}")
    
    return {"success": True, "message": f"Durum güncellendi: {status}"}

# SuperAdmin: Add note to franchise
class FranchiseNote(BaseModel):
    content: str

@api_router.post("/superadmin/franchises/{franchise_id}/notes")
async def add_franchise_note(
    franchise_id: str,
    note: FranchiseNote,
    user: dict = Depends(get_current_user)
):
    """SuperAdmin: Add note to franchise application"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can add notes")
    
    franchise = await db.franchise_applications.find_one({"id": franchise_id})
    if not franchise:
        raise HTTPException(status_code=404, detail="Franchise not found")
    
    now = datetime.now(timezone.utc)
    note_doc = {
        "id": str(uuid.uuid4()),
        "type": "note",
        "content": note.content,
        "by": user["email"],
        "created_at": now.isoformat()
    }
    
    await db.franchise_applications.update_one(
        {"id": franchise_id},
        {
            "$push": {"notes": note_doc},
            "$set": {"updated_at": now.isoformat()}
        }
    )
    
    return {"success": True, "message": "Not eklendi"}

# SuperAdmin: Convert franchise to company
@api_router.post("/superadmin/franchises/{franchise_id}/convert-to-company")
async def convert_franchise_to_company(
    franchise_id: str,
    domain: str,
    admin_password: str,
    user: dict = Depends(get_current_user)
):
    """SuperAdmin: Convert approved franchise to a company"""
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can convert franchises")
    
    franchise = await db.franchise_applications.find_one({"id": franchise_id})
    if not franchise:
        raise HTTPException(status_code=404, detail="Franchise not found")
    
    if franchise["status"] not in ["approved", "active"]:
        raise HTTPException(status_code=400, detail="Franchise must be approved first")
    
    # Create company from franchise
    company_name = franchise.get("company_name") or f"{franchise['full_name']} Rent A Car"
    company_code = company_name.lower().replace(" ", "_").replace("-", "_")[:20]
    
    # Check if company exists
    existing = await db.companies.find_one({"code": company_code})
    if existing:
        raise HTTPException(status_code=400, detail="Bu isimde firma zaten mevcut")
    
    now = datetime.now(timezone.utc)
    company_id = str(uuid.uuid4())
    
    company_doc = {
        "id": company_id,
        "name": company_name,
        "code": company_code,
        "domain": domain,
        "status": CompanyStatus.PENDING.value,
        "subscription_plan": SubscriptionPlan.PROFESSIONAL.value,
        "billing_cycle": "monthly",
        "is_franchise": True,
        "franchise_id": franchise_id,
        
        # Contact
        "admin_email": franchise["email"],
        "admin_phone": franchise["phone"],
        "admin_name": franchise["full_name"],
        "admin_password": admin_password,
        
        # Address
        "city": franchise.get("city"),
        "district": franchise.get("district"),
        "address": franchise.get("address"),
        
        # Meta
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "source": "franchise"
    }
    
    await db.companies.insert_one(company_doc)
    
    # Update franchise status
    await db.franchise_applications.update_one(
        {"id": franchise_id},
        {"$set": {
            "status": FranchiseStatus.ACTIVE.value,
            "company_id": company_id,
            "activated_at": now.isoformat(),
            "updated_at": now.isoformat()
        }}
    )
    
    logger.info(f"Franchise {franchise['application_number']} converted to company {company_name}")
    
    return {
        "success": True,
        "company_id": company_id,
        "company_name": company_name,
        "message": "Franchise başarıyla firmaya dönüştürüldü. Şimdi deploy edebilirsiniz."
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.companies.create_index("code", unique=True)
    await db.vehicles.create_index("plate")
    await db.customers.create_index("tc_no")
    await db.reservations.create_index("status")
    logger.info("FleetEase API started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
