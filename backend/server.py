from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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

class CompanyCreate(BaseModel):
    name: str
    code: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    tax_number: Optional[str] = None

class CompanyResponse(BaseModel):
    id: str
    name: str
    code: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    tax_number: Optional[str] = None
    is_active: bool = True
    created_at: datetime

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

# ============== COMPANY ROUTES ==============
@api_router.post("/companies", response_model=CompanyResponse)
async def create_company(company: CompanyCreate, user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can create companies")
    
    existing = await db.companies.find_one({"code": company.code})
    if existing:
        raise HTTPException(status_code=400, detail="Company code already exists")
    
    company_id = str(uuid.uuid4())
    company_doc = {
        "id": company_id,
        "name": company.name,
        "code": company.code,
        "address": company.address,
        "phone": company.phone,
        "email": company.email,
        "tax_number": company.tax_number,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.companies.insert_one(company_doc)
    company_response_data = {k: v for k, v in company_doc.items() if k != "_id"}
    company_response_data["created_at"] = datetime.fromisoformat(company_doc["created_at"])
    return CompanyResponse(**company_response_data)

@api_router.get("/companies", response_model=List[CompanyResponse])
async def list_companies(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.SUPERADMIN.value:
        raise HTTPException(status_code=403, detail="Only SuperAdmin can view all companies")
    
    companies = await db.companies.find({}, {"_id": 0}).to_list(1000)
    result = []
    for c in companies:
        company_data = dict(c)
        company_data["created_at"] = datetime.fromisoformat(c["created_at"]) if isinstance(c["created_at"], str) else c["created_at"]
        result.append(CompanyResponse(**company_data))
    return result

@api_router.get("/companies/{company_id}", response_model=CompanyResponse)
async def get_company(company_id: str, user: dict = Depends(get_current_user)):
    company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    company_data = dict(company)
    company_data["created_at"] = datetime.fromisoformat(company["created_at"]) if isinstance(company["created_at"], str) else company["created_at"]
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
