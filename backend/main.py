import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from database import connect_to_mongo, close_mongo_connection, get_database, ensure_indexes
from routes import auth, resume, ai_tools, admin
from routes.auth import seed_admin_account
from auth.jwt_handler import get_user_role_from_token
from config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    await connect_to_mongo()
    await ensure_indexes()
    await seed_admin_account()
    print("[INFO] LokuResume AI Backend Started (Admin & Indexes Ready)")
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
    "https://lokuresume-ai-008k.onrender.com",
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

# In-memory cache for maintenance mode to minimize MongoDB roundtrips
_maintenance_cache = {
    "enabled": False,
    "message": "The system is currently undergoing maintenance. Please check back later.",
    "allowed_roles": ["super_admin", "admin"],
    "last_checked": 0.0
}

@app.middleware("http")
async def maintenance_mode_middleware(request: Request, call_next):
    """Intercept requests during platform maintenance mode, allowing admins and public endpoints"""
    if request.method == "OPTIONS":
        return await call_next(request)

    path = request.url.path
    # Whitelist critical and public endpoints
    if (
        path in ["/", "/health", "/openapi.json"]
        or path.startswith("/admin")
        or path.startswith("/auth")
        or path.startswith("/docs")
        or path.startswith("/redoc")
    ):
        return await call_next(request)

    now = time.time()
    # Cache lookup for 3 seconds
    if now - _maintenance_cache["last_checked"] > 3:
        try:
            db_conn = await get_database()
            setting = await db_conn.platform_settings.find_one({"key": "maintenance"})
            if setting:
                _maintenance_cache["enabled"] = bool(setting.get("enabled", False))
                _maintenance_cache["message"] = setting.get("message", "The system is currently undergoing maintenance. Please check back later.")
                _maintenance_cache["allowed_roles"] = setting.get("allowed_roles", ["super_admin", "admin"])
            else:
                _maintenance_cache["enabled"] = False
            _maintenance_cache["last_checked"] = now
        except Exception:
            pass

    if _maintenance_cache["enabled"]:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "").strip()
            _, role = get_user_role_from_token(token)
            if role in _maintenance_cache.get("allowed_roles", ["super_admin", "admin"]):
                return await call_next(request)

        return JSONResponse(
            status_code=503,
            content={
                "detail": "PLATFORM_MAINTENANCE",
                "message": _maintenance_cache["message"]
            }
        )

    return await call_next(request)

# Routes
app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(ai_tools.router)
app.include_router(admin.router)

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
