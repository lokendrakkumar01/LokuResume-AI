from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

class Database:
    client: AsyncIOMotorClient = None
    
db = Database()

async def get_database():
    return db.client.loku_resume_ai

async def connect_to_mongo():
    """Connect to MongoDB Atlas"""
    clean_uri = settings.mongo_uri.strip().strip("'\"")
    db.client = AsyncIOMotorClient(clean_uri, serverSelectionTimeoutMS=10000)
    await db.client.admin.command('ping')
    print("[OK] Connected to MongoDB Atlas")

async def close_mongo_connection():
    """Close MongoDB connection"""
    if db.client:
        db.client.close()
        print("[INFO] Closed MongoDB connection")
