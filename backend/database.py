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

async def ensure_indexes():
    """Create essential MongoDB indexes for ultra-fast queries"""
    try:
        database = await get_database()
        # Index resumes by user_id and updated_at for sub-millisecond retrieval
        await database.resumes.create_index("user_id")
        await database.resumes.create_index([("user_id", 1), ("updated_at", -1)])
        await database.resumes.create_index("updated_at")
        # Index users by email
        await database.users.create_index("email", unique=True)
        # Index platform settings
        await database.platform_settings.create_index("key", unique=True)
        print("[OK] MongoDB indexes verified successfully")
    except Exception as e:
        print(f"[Index Warning] Index creation notice: {e}")

async def close_mongo_connection():
    """Close MongoDB connection"""
    if db.client:
        db.client.close()
        print("[INFO] Closed MongoDB connection")
