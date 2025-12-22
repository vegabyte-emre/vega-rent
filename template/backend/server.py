"""
Rent A Car - Tenant Backend API
Bu dosya tenant (firma) paneli için backend API'sini içerir.
SuperAdmin kodları bu dosyada YOK - sadece firma işlevselliği var.
"""

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from enum import Enum

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt

# ============== CONFIGURATION ==============
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tenant-api")

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "rentacar_db")
JWT_SECRET = os.environ.get("JWT_SECRET", "tenant_jwt_secret_key_2024")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# MongoDB Connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# ============== ENUMS ==============
class UserRole(str, Enum):
    FIRMA_ADMIN = "firma_admin"
    OPERASYON = "operasyon"
    MUHASEBE = "muhasebe"
    PERSONEL = "personel"

class VehicleStatus(str, Enum):
    AVAILABLE = "available"
    RENTED = "rented"
    RESERVED = "reserved"
    MAINTENANCE = "maintenance"
    UNAVAILABLE = "unavailable"

class TransmissionType(str, Enum):
    MANUAL = "manuel"
    AUTOMATIC = "otomatik"

class FuelType(str, Enum):
    GASOLINE = "benzin"
    DIESEL = "dizel"
    HYBRID = "hibrit"
    ELECTRIC = "elektrik"
    LPG = "lpg"

class ReservationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    PARTIAL = "partial"
    REFUNDED = "refunded"

# ============== PYDANTIC MODELS ==============
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole = UserRole.PERSONEL
    phone: Optional[str] = None

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

class VehicleCreate(BaseModel):
    plate: str
    brand: str
    model: str
    year: int
    segment: str = "Sedan"
    transmission: TransmissionType = TransmissionType.AUTOMATIC
    fuel_type: FuelType = FuelType.GASOLINE
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
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    tc_no: Optional[str] = None
    driver_license_no: Optional[str] = None
    address: Optional[str] = None

class CustomerResponse(BaseModel):
    id: str
    company_id: Optional[str] = None
    first_name: str
    last_name: str
    email: str
    phone: str
    tc_no: Optional[str] = None
    driver_license_no: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime

class ReservationCreate(BaseModel):
    vehicle_id: str
    customer_id: str
    start_date: datetime
    end_date: datetime
    pickup_location: Optional[str] = None
    dropoff_location: Optional[str] = None
    daily_rate: float
    notes: Optional[str] = None

class ReservationResponse(BaseModel):
    id: str
    company_id: Optional[str] = None
    vehicle_id: str
    customer_id: str
    start_date: datetime
    end_date: datetime
    pickup_location: Optional[str] = None
    dropoff_location: Optional[str] = None
    daily_rate: float
    total_amount: float
    status: ReservationStatus
    notes: Optional[str] = None
    created_at: datetime

class PriceRuleCreate(BaseModel):
    vehicle_id: Optional[str] = None
    start_date: str
    end_date: str
    multiplier: float = 1.0
    fixed_price: Optional[float] = None
    note: Optional[str] = None

class PriceRuleResponse(BaseModel):
    id: str
    company_id: Optional[str] = None
    vehicle_id: Optional[str] = None
    start_date: str
    end_date: str
    multiplier: float
    fixed_price: Optional[float] = None
    note: Optional[str] = None
    created_at: datetime

# ============== HELPER FUNCTIONS ==============
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== FASTAPI APP ==============
app = FastAPI(title="Rent A Car API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== AUTH ROUTES ==============
@app.post("/api/auth/login", response_model=TokenResponse)
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

@app.get("/api/auth/me", response_model=UserResponse)
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

# ============== VEHICLE ROUTES ==============
@app.post("/api/vehicles", response_model=VehicleResponse)
async def create_vehicle(vehicle: VehicleCreate, user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.FIRMA_ADMIN.value, UserRole.OPERASYON.value]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    vehicle_id = str(uuid.uuid4())
    vehicle_doc = {
        "id": vehicle_id,
        "company_id": user.get("company_id"),
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
    
    vehicle_doc["transmission"] = TransmissionType(vehicle_doc["transmission"])
    vehicle_doc["fuel_type"] = FuelType(vehicle_doc["fuel_type"])
    vehicle_doc["status"] = VehicleStatus(vehicle_doc["status"])
    vehicle_doc["created_at"] = datetime.fromisoformat(vehicle_doc["created_at"])
    return VehicleResponse(**{k: v for k, v in vehicle_doc.items() if k != "_id"})

@app.get("/api/vehicles", response_model=List[VehicleResponse])
async def list_vehicles(status: Optional[VehicleStatus] = None, user: dict = Depends(get_current_user)):
    query = {"company_id": user.get("company_id")}
    if status:
        query["status"] = status.value
    
    vehicles = await db.vehicles.find(query, {"_id": 0}).to_list(1000)
    result = []
    for v in vehicles:
        v["transmission"] = TransmissionType(v["transmission"])
        v["fuel_type"] = FuelType(v["fuel_type"])
        v["status"] = VehicleStatus(v["status"])
        v["created_at"] = datetime.fromisoformat(v["created_at"]) if isinstance(v["created_at"], str) else v["created_at"]
        result.append(VehicleResponse(**v))
    return result

@app.get("/api/vehicles/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(vehicle_id: str, user: dict = Depends(get_current_user)):
    vehicle = await db.vehicles.find_one({"id": vehicle_id}, {"_id": 0})
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    vehicle["transmission"] = TransmissionType(vehicle["transmission"])
    vehicle["fuel_type"] = FuelType(vehicle["fuel_type"])
    vehicle["status"] = VehicleStatus(vehicle["status"])
    vehicle["created_at"] = datetime.fromisoformat(vehicle["created_at"]) if isinstance(vehicle["created_at"], str) else vehicle["created_at"]
    return VehicleResponse(**vehicle)

@app.patch("/api/vehicles/{vehicle_id}/status")
async def update_vehicle_status(vehicle_id: str, status_update: dict, user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.FIRMA_ADMIN.value, UserRole.OPERASYON.value]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    new_status = status_update.get("status")
    if new_status not in [s.value for s in VehicleStatus]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.vehicles.update_one(
        {"id": vehicle_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    return {"success": True, "message": "Status updated"}

# ============== CUSTOMER ROUTES ==============
@app.post("/api/customers", response_model=CustomerResponse)
async def create_customer(customer: CustomerCreate, user: dict = Depends(get_current_user)):
    customer_id = str(uuid.uuid4())
    customer_doc = {
        "id": customer_id,
        "company_id": user.get("company_id"),
        "first_name": customer.first_name,
        "last_name": customer.last_name,
        "email": customer.email,
        "phone": customer.phone,
        "tc_no": customer.tc_no,
        "driver_license_no": customer.driver_license_no,
        "address": customer.address,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customers.insert_one(customer_doc)
    customer_doc["created_at"] = datetime.fromisoformat(customer_doc["created_at"])
    return CustomerResponse(**{k: v for k, v in customer_doc.items() if k != "_id"})

@app.get("/api/customers", response_model=List[CustomerResponse])
async def list_customers(user: dict = Depends(get_current_user)):
    query = {"company_id": user.get("company_id")}
    customers = await db.customers.find(query, {"_id": 0}).to_list(1000)
    result = []
    for c in customers:
        c["created_at"] = datetime.fromisoformat(c["created_at"]) if isinstance(c["created_at"], str) else c["created_at"]
        result.append(CustomerResponse(**c))
    return result

# ============== RESERVATION ROUTES ==============
@app.post("/api/reservations", response_model=ReservationResponse)
async def create_reservation(reservation: ReservationCreate, user: dict = Depends(get_current_user)):
    # Calculate total amount
    days = (reservation.end_date - reservation.start_date).days
    if days < 1:
        days = 1
    total_amount = days * reservation.daily_rate
    
    reservation_id = str(uuid.uuid4())
    reservation_doc = {
        "id": reservation_id,
        "company_id": user.get("company_id"),
        "vehicle_id": reservation.vehicle_id,
        "customer_id": reservation.customer_id,
        "start_date": reservation.start_date.isoformat(),
        "end_date": reservation.end_date.isoformat(),
        "pickup_location": reservation.pickup_location,
        "dropoff_location": reservation.dropoff_location,
        "daily_rate": reservation.daily_rate,
        "total_amount": total_amount,
        "status": ReservationStatus.PENDING.value,
        "notes": reservation.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reservations.insert_one(reservation_doc)
    
    # Update vehicle status
    await db.vehicles.update_one(
        {"id": reservation.vehicle_id},
        {"$set": {"status": VehicleStatus.RESERVED.value}}
    )
    
    reservation_doc["status"] = ReservationStatus(reservation_doc["status"])
    reservation_doc["start_date"] = datetime.fromisoformat(reservation_doc["start_date"])
    reservation_doc["end_date"] = datetime.fromisoformat(reservation_doc["end_date"])
    reservation_doc["created_at"] = datetime.fromisoformat(reservation_doc["created_at"])
    return ReservationResponse(**{k: v for k, v in reservation_doc.items() if k != "_id"})

@app.get("/api/reservations", response_model=List[ReservationResponse])
async def list_reservations(status: Optional[ReservationStatus] = None, user: dict = Depends(get_current_user)):
    query = {"company_id": user.get("company_id")}
    if status:
        query["status"] = status.value
    
    reservations = await db.reservations.find(query, {"_id": 0}).to_list(1000)
    result = []
    for r in reservations:
        r["status"] = ReservationStatus(r["status"])
        r["start_date"] = datetime.fromisoformat(r["start_date"]) if isinstance(r["start_date"], str) else r["start_date"]
        r["end_date"] = datetime.fromisoformat(r["end_date"]) if isinstance(r["end_date"], str) else r["end_date"]
        r["created_at"] = datetime.fromisoformat(r["created_at"]) if isinstance(r["created_at"], str) else r["created_at"]
        result.append(ReservationResponse(**r))
    return result

@app.patch("/api/reservations/{reservation_id}/status")
async def update_reservation_status(reservation_id: str, status_update: dict, user: dict = Depends(get_current_user)):
    new_status = status_update.get("status")
    if new_status not in [s.value for s in ReservationStatus]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    reservation = await db.reservations.find_one({"id": reservation_id}, {"_id": 0})
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Update vehicle status based on reservation status
    vehicle_status = VehicleStatus.AVAILABLE.value
    if new_status == ReservationStatus.ACTIVE.value:
        vehicle_status = VehicleStatus.RENTED.value
    elif new_status == ReservationStatus.CONFIRMED.value:
        vehicle_status = VehicleStatus.RESERVED.value
    
    await db.vehicles.update_one(
        {"id": reservation["vehicle_id"]},
        {"$set": {"status": vehicle_status}}
    )
    
    return {"success": True, "message": "Reservation status updated"}

# ============== PRICE RULES ROUTES ==============
@app.post("/api/price-rules", response_model=PriceRuleResponse)
async def create_price_rule(rule: PriceRuleCreate, user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.FIRMA_ADMIN.value, UserRole.OPERASYON.value]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    rule_id = str(uuid.uuid4())
    rule_doc = {
        "id": rule_id,
        "company_id": user.get("company_id"),
        "vehicle_id": rule.vehicle_id,
        "start_date": rule.start_date,
        "end_date": rule.end_date,
        "multiplier": rule.multiplier,
        "fixed_price": rule.fixed_price,
        "note": rule.note,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.price_rules.insert_one(rule_doc)
    rule_doc["created_at"] = datetime.fromisoformat(rule_doc["created_at"])
    return PriceRuleResponse(**{k: v for k, v in rule_doc.items() if k != "_id"})

@app.get("/api/price-rules", response_model=List[PriceRuleResponse])
async def list_price_rules(user: dict = Depends(get_current_user)):
    query = {"company_id": user.get("company_id")}
    rules = await db.price_rules.find(query, {"_id": 0}).to_list(1000)
    result = []
    for r in rules:
        r["created_at"] = datetime.fromisoformat(r["created_at"]) if isinstance(r["created_at"], str) else r["created_at"]
        result.append(PriceRuleResponse(**r))
    return result

@app.delete("/api/price-rules/{rule_id}")
async def delete_price_rule(rule_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.FIRMA_ADMIN.value, UserRole.OPERASYON.value]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    result = await db.price_rules.delete_one({"id": rule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Price rule not found")
    return {"success": True, "message": "Price rule deleted"}

# ============== DASHBOARD ROUTES ==============
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    company_id = user.get("company_id")
    
    # Count vehicles by status
    total_vehicles = await db.vehicles.count_documents({"company_id": company_id})
    available_vehicles = await db.vehicles.count_documents({"company_id": company_id, "status": "available"})
    rented_vehicles = await db.vehicles.count_documents({"company_id": company_id, "status": "rented"})
    
    # Count customers
    total_customers = await db.customers.count_documents({"company_id": company_id})
    
    # Count reservations
    total_reservations = await db.reservations.count_documents({"company_id": company_id})
    active_reservations = await db.reservations.count_documents({"company_id": company_id, "status": "active"})
    pending_reservations = await db.reservations.count_documents({"company_id": company_id, "status": "pending"})
    
    # Calculate revenue (from completed reservations)
    pipeline = [
        {"$match": {"company_id": company_id, "status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]
    revenue_result = await db.reservations.aggregate(pipeline).to_list(1)
    total_revenue = revenue_result[0]["total"] if revenue_result else 0
    
    return {
        "vehicles": {
            "total": total_vehicles,
            "available": available_vehicles,
            "rented": rented_vehicles,
            "maintenance": total_vehicles - available_vehicles - rented_vehicles
        },
        "customers": {
            "total": total_customers
        },
        "reservations": {
            "total": total_reservations,
            "active": active_reservations,
            "pending": pending_reservations
        },
        "revenue": {
            "total": total_revenue
        }
    }

# ============== PAYMENTS ROUTES ==============
@app.get("/api/payments")
async def list_payments(user: dict = Depends(get_current_user)):
    query = {"company_id": user.get("company_id")}
    payments = await db.payments.find(query, {"_id": 0}).to_list(1000)
    return payments

@app.post("/api/payments")
async def create_payment(payment_data: dict, user: dict = Depends(get_current_user)):
    payment_id = str(uuid.uuid4())
    payment_doc = {
        "id": payment_id,
        "company_id": user.get("company_id"),
        "reservation_id": payment_data.get("reservation_id"),
        "amount": payment_data.get("amount"),
        "method": payment_data.get("method", "cash"),
        "status": PaymentStatus.PAID.value,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment_doc)
    return {"success": True, "payment_id": payment_id}

# ============== HGS ROUTES ==============
@app.get("/api/hgs/tags")
async def list_hgs_tags(user: dict = Depends(get_current_user)):
    query = {"company_id": user.get("company_id")}
    tags = await db.hgs_tags.find(query, {"_id": 0}).to_list(1000)
    return tags

@app.post("/api/hgs/tags")
async def create_hgs_tag(tag_data: dict, user: dict = Depends(get_current_user)):
    tag_id = str(uuid.uuid4())
    tag_doc = {
        "id": tag_id,
        "company_id": user.get("company_id"),
        "vehicle_id": tag_data.get("vehicle_id"),
        "tag_number": tag_data.get("tag_number"),
        "balance": tag_data.get("balance", 0),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.hgs_tags.insert_one(tag_doc)
    return {"success": True, "tag_id": tag_id}

@app.get("/api/hgs/summary")
async def get_hgs_summary(user: dict = Depends(get_current_user)):
    query = {"company_id": user.get("company_id")}
    tags = await db.hgs_tags.find(query, {"_id": 0}).to_list(1000)
    total_balance = sum(t.get("balance", 0) for t in tags)
    return {
        "total_tags": len(tags),
        "total_balance": total_balance,
        "low_balance_count": sum(1 for t in tags if t.get("balance", 0) < 50)
    }

@app.get("/api/hgs/passages")
async def list_hgs_passages(limit: int = 20, user: dict = Depends(get_current_user)):
    query = {"company_id": user.get("company_id")}
    passages = await db.hgs_passages.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return passages

@app.put("/api/hgs/tags/{tag_id}/balance")
async def update_hgs_balance(tag_id: str, balance_data: dict, user: dict = Depends(get_current_user)):
    new_balance = balance_data.get("balance", 0)
    result = await db.hgs_tags.update_one(
        {"id": tag_id},
        {"$set": {"balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"success": True, "new_balance": new_balance}

@app.post("/api/hgs/tags/{tag_id}/passages")
async def add_hgs_passage(tag_id: str, passage_data: dict, user: dict = Depends(get_current_user)):
    passage_id = str(uuid.uuid4())
    passage_doc = {
        "id": passage_id,
        "company_id": user.get("company_id"),
        "tag_id": tag_id,
        "location": passage_data.get("location"),
        "amount": passage_data.get("amount", 0),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.hgs_passages.insert_one(passage_doc)
    
    # Deduct from balance
    await db.hgs_tags.update_one(
        {"id": tag_id},
        {"$inc": {"balance": -passage_data.get("amount", 0)}}
    )
    return {"success": True, "passage_id": passage_id}

@app.delete("/api/hgs/tags/{tag_id}")
async def delete_hgs_tag(tag_id: str, user: dict = Depends(get_current_user)):
    result = await db.hgs_tags.delete_one({"id": tag_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tag not found")
    return {"success": True}

# ============== KABIS ROUTES ==============
@app.get("/api/kabis/settings")
async def get_kabis_settings(user: dict = Depends(get_current_user)):
    settings = await db.kabis_settings.find_one({"company_id": user.get("company_id")}, {"_id": 0})
    return settings or {}

@app.post("/api/kabis/settings")
async def save_kabis_settings(settings_data: dict, user: dict = Depends(get_current_user)):
    await db.kabis_settings.update_one(
        {"company_id": user.get("company_id")},
        {"$set": {**settings_data, "company_id": user.get("company_id"), "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"success": True}

@app.get("/api/kabis/notifications")
async def list_kabis_notifications(user: dict = Depends(get_current_user)):
    query = {"company_id": user.get("company_id")}
    notifications = await db.kabis_notifications.find(query, {"_id": 0}).to_list(1000)
    return notifications

@app.post("/api/kabis/notifications")
async def create_kabis_notification(notification_data: dict, user: dict = Depends(get_current_user)):
    notification_id = str(uuid.uuid4())
    notification_doc = {
        "id": notification_id,
        "company_id": user.get("company_id"),
        "vehicle_id": notification_data.get("vehicle_id"),
        "customer_id": notification_data.get("customer_id"),
        "type": notification_data.get("type", "rental"),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.kabis_notifications.insert_one(notification_doc)
    return {"success": True, "notification_id": notification_id, "notification": notification_doc}

@app.delete("/api/kabis/notifications/{notification_id}")
async def delete_kabis_notification(notification_id: str, user: dict = Depends(get_current_user)):
    result = await db.kabis_notifications.delete_one({"id": notification_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

# ============== COMPANY INFO ROUTES ==============
@app.get("/api/company/info")
async def get_company_info(user: dict = Depends(get_current_user)):
    """Get company information for the logged-in user"""
    company_id = user.get("company_id")
    
    # First try to get from company collection
    company = await db.company.find_one({"id": company_id}, {"_id": 0})
    
    if not company:
        # If not found, try companies collection
        company = await db.companies.find_one({"id": company_id}, {"_id": 0})
    
    if not company:
        # Return default company info from environment or settings
        company_name = os.environ.get("COMPANY_NAME", "Rent A Car")
        company_code = os.environ.get("COMPANY_CODE", "rentacar")
        return {
            "id": company_id,
            "name": company_name,
            "code": company_code,
            "email": user.get("email"),
            "phone": None,
            "address": None,
            "logo_url": None
        }
    
    return company

@app.put("/api/company/info")
async def update_company_info(company_data: dict, user: dict = Depends(get_current_user)):
    """Update company information"""
    if user["role"] not in ["firma_admin"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    company_id = user.get("company_id")
    
    update_data = {
        "name": company_data.get("name"),
        "phone": company_data.get("phone"),
        "address": company_data.get("address"),
        "logo_url": company_data.get("logo_url"),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.company.update_one(
        {"id": company_id},
        {"$set": update_data},
        upsert=True
    )
    
    return {"success": True, "message": "Firma bilgileri güncellendi"}

# ============== GPS ROUTES ==============
@app.get("/api/gps/vehicles")
async def get_gps_vehicles(user: dict = Depends(get_current_user)):
    query = {"company_id": user.get("company_id")}
    vehicles = await db.vehicles.find(query, {"_id": 0}).to_list(1000)
    
    # Add mock GPS data for demo
    for v in vehicles:
        v["gps"] = {
            "lat": 39.925533 + (hash(v["id"]) % 100) / 10000,
            "lng": 32.866287 + (hash(v["id"]) % 100) / 10000,
            "speed": hash(v["id"]) % 120,
            "last_update": datetime.now(timezone.utc).isoformat()
        }
    return vehicles

# ============== INTEGRATIONS ROUTES ==============
@app.get("/api/integrations")
async def list_integrations(user: dict = Depends(get_current_user)):
    """List all integrations for the company"""
    company_id = user.get("company_id")
    integrations = await db.integrations.find({"company_id": company_id}, {"_id": 0}).to_list(100)
    return integrations

@app.post("/api/integrations")
async def create_integration(integration_data: dict, user: dict = Depends(get_current_user)):
    """Create or update an integration"""
    company_id = user.get("company_id")
    
    existing = await db.integrations.find_one({
        "company_id": company_id,
        "platform_id": integration_data.get("platform_id")
    })
    
    integration_doc = {
        "company_id": company_id,
        "platform_id": integration_data.get("platform_id"),
        "platform_name": integration_data.get("platform_name"),
        "config": integration_data.get("config", {}),
        "enabled": integration_data.get("enabled", True),
        "synced_vehicles": 0,
        "last_sync": None,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.integrations.update_one({"id": existing["id"]}, {"$set": integration_doc})
        return {"success": True, "message": "Entegrasyon güncellendi", "id": existing["id"]}
    else:
        integration_doc["id"] = str(uuid.uuid4())
        integration_doc["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.integrations.insert_one(integration_doc)
        return {"success": True, "message": "Entegrasyon oluşturuldu", "id": integration_doc["id"]}

@app.patch("/api/integrations/{platform_id}/toggle")
async def toggle_integration(platform_id: str, toggle_data: dict, user: dict = Depends(get_current_user)):
    """Enable or disable an integration"""
    company_id = user.get("company_id")
    result = await db.integrations.update_one(
        {"company_id": company_id, "platform_id": platform_id},
        {"$set": {"enabled": toggle_data.get("enabled", False), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entegrasyon bulunamadı")
    return {"success": True}

@app.delete("/api/integrations/{platform_id}")
async def delete_integration(platform_id: str, user: dict = Depends(get_current_user)):
    """Delete an integration"""
    company_id = user.get("company_id")
    result = await db.integrations.delete_one({"company_id": company_id, "platform_id": platform_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entegrasyon bulunamadı")
    return {"success": True}

@app.post("/api/integrations/{platform_id}/sync")
async def sync_integration(platform_id: str, user: dict = Depends(get_current_user)):
    """Sync vehicles with the platform"""
    company_id = user.get("company_id")
    
    integration = await db.integrations.find_one({"company_id": company_id, "platform_id": platform_id}, {"_id": 0})
    if not integration:
        raise HTTPException(status_code=404, detail="Entegrasyon bulunamadı")
    if not integration.get("enabled"):
        raise HTTPException(status_code=400, detail="Entegrasyon aktif değil")
    
    vehicles = await db.vehicles.find({"company_id": company_id}, {"_id": 0}).to_list(1000)
    synced_count = len(vehicles)
    
    # Log the sync
    sync_log = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "platform_id": platform_id,
        "platform_name": integration.get("platform_name"),
        "status": "success",
        "message": f"{synced_count} araç senkronize edildi",
        "synced_count": synced_count,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.integration_logs.insert_one(sync_log)
    
    # Update integration stats
    await db.integrations.update_one(
        {"company_id": company_id, "platform_id": platform_id},
        {"$set": {"synced_vehicles": synced_count, "last_sync": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "synced_count": synced_count, "message": f"{synced_count} araç senkronize edildi"}

@app.post("/api/integrations/{platform_id}/test")
async def test_integration(platform_id: str, user: dict = Depends(get_current_user)):
    """Test connection to the platform"""
    company_id = user.get("company_id")
    integration = await db.integrations.find_one({"company_id": company_id, "platform_id": platform_id}, {"_id": 0})
    if not integration:
        raise HTTPException(status_code=404, detail="Entegrasyon bulunamadı")
    
    config = integration.get("config", {})
    if not config.get("api_key"):
        return {"success": False, "error": "API anahtarı eksik"}
    return {"success": True, "message": "Bağlantı başarılı"}

@app.get("/api/integrations/logs")
async def get_integration_logs(user: dict = Depends(get_current_user)):
    """Get sync logs for the company"""
    company_id = user.get("company_id")
    logs = await db.integration_logs.find({"company_id": company_id}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return logs

@app.post("/api/integrations/webhook")
async def integration_webhook(webhook_data: dict):
    """Receive webhook callbacks from platforms"""
    logger.info(f"Received webhook: {webhook_data}")
    return {"success": True, "message": "Webhook received"}

# ============== HEALTH CHECK ==============
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ============== STARTUP EVENT ==============
@app.on_event("startup")
async def startup_event():
    logger.info(f"Tenant API started - DB: {DB_NAME}")
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.vehicles.create_index("plate")
    await db.customers.create_index("email")
    await db.reservations.create_index("vehicle_id")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
