from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

class Database:
    client: AsyncIOMotorClient = None
    
db = Database()

async def get_database():
    return db.client.loku_resume_ai

async def connect_to_mongo():
    """Connect to MongoDB Atlas"""
    db.client = AsyncIOMotorClient(settings.mongo_uri)
    print("✅ Connected to MongoDB Atlas")

async def close_mongo_connection():
    """Close MongoDB connection"""
    db.client.close()
    print("❌ Closed MongoDB connection")
