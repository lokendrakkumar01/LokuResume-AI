from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import connect_to_mongo, close_mongo_connection
from routes import auth, resume
from config import settings

app = FastAPI(
    title="LokuResume AI",
    description="AI-Powered Resume Builder by Lokenda Kumar",
    version="1.0.0"
)

# CORS Configuration
# Allow both localhost (for development) and production frontend
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

# Add production frontend URL if set
if settings.frontend_url and settings.frontend_url not in allowed_origins:
    allowed_origins.append(settings.frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Event handlers
@app.on_event("startup")
async def startup_event():
    """Connect to MongoDB on startup"""
    await connect_to_mongo()
    print("🚀 LokuResume AI Backend Started")

@app.on_event("shutdown")
async def shutdown_event():
    """Close MongoDB connection on shutdown"""
    await close_mongo_connection()
    print("👋 LokuResume AI Backend Stopped")

# Routes
app.include_router(auth.router)
app.include_router(resume.router)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "LokuResume AI API",
        "tagline": "Build Smart. Score High. Get Hired.",
        "founder": "Lokenda Kumar",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check for monitoring"""
    return {"status": "healthy"}
