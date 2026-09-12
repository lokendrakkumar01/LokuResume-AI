from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import connect_to_mongo, close_mongo_connection
from routes import auth, resume, ai_tools
from config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    await connect_to_mongo()
    print("[INFO] LokuResume AI Backend Started")
    yield
    await close_mongo_connection()
    print("[INFO] LokuResume AI Backend Stopped")

app = FastAPI(
    title="LokuResume AI",
    description="AI-Powered Resume Builder by Lokenda Kumar",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
# Allow both localhost (for development) and production frontend
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

# Add production frontend URL if set (supports comma-separated URLs)
if settings.frontend_url:
    for url in settings.frontend_url.split(","):
        cleaned = url.strip()
        if cleaned and cleaned not in allowed_origins:
            allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.onrender\.com|https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(ai_tools.router)

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
