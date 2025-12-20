import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from uuid import uuid4
from datetime import datetime, timezone
import os

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://superadmin_mongodb:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client.superadmin_db
    
    # Admin var mı kontrol et
    existing = await db.users.find_one({"role": "superadmin"})
    if existing:
        print(f"Admin zaten mevcut: {existing['email']}")
        return
    
    admin = {
        "id": str(uuid4()),
        "email": "admin@admin.com",
        "password_hash": pwd_context.hash("admin123"),
        "full_name": "Super Admin",
        "role": "superadmin",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin)
    print("✅ Admin oluşturuldu!")
    print("📧 Email: admin@admin.com")
    print("🔑 Şifre: admin123")
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
