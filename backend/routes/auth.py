from fastapi import APIRouter, HTTPException, status, Header
from models.user import UserSignup, UserLogin, TokenResponse, UserResponse, AdminLoginRequest, ChangePasswordRequest
from auth.hash_password import hash_password, verify_password
from auth.jwt_handler import create_access_token, get_user_from_token, get_admin_from_token
from database import get_database
from datetime import datetime, timezone
from bson import ObjectId
from config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

async def seed_admin_account():
    """Ensure the master admin account exists in MongoDB with admin privileges"""
    try:
        db = await get_database()
        admin_email = settings.admin_email.strip().lower()
        existing_admin = await db.users.find_one({"email": admin_email})
        if not existing_admin:
            admin_doc = {
                "name": "Master Admin",
                "email": admin_email,
                "hashed_password": hash_password(settings.admin_password),
                "role": "admin",
                "created_at": datetime.now(timezone.utc)
            }
            await db.users.insert_one(admin_doc)
            print(f"[Admin Seed] Master admin seeded: {admin_email}")
        else:
            if existing_admin.get("role") != "admin":
                await db.users.update_one({"_id": existing_admin["_id"]}, {"$set": {"role": "admin"}})
                print(f"[Admin Seed] Upgraded {admin_email} role to admin")
    except Exception as e:
        print(f"[Admin Seed] Warning: {e}")

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user: UserSignup):
    """Register a new user"""
    db = await get_database()
    
    normalized_email = user.email.strip().lower()
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": normalized_email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user_doc = {
        "name": user.name.strip(),
        "email": normalized_email,
        "hashed_password": hash_password(user.password),
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    # Generate JWT token
    access_token = create_access_token({"sub": str(result.inserted_id), "role": "user"})
    
    # Return token and user info
    user_response = UserResponse(
        id=str(user_doc["_id"]),
        name=user_doc["name"],
        email=user_doc["email"],
        role="user",
        created_at=user_doc["created_at"]
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user and return JWT token"""
    db = await get_database()
    
    normalized_email = credentials.email.strip().lower()
    
    # Find user by email
    user = await db.users.find_one({"email": normalized_email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    role = user.get("role", "user")
    access_token = create_access_token({"sub": str(user["_id"]), "role": role})
    
    user_response = UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        role=role,
        created_at=user.get("created_at", datetime.now(timezone.utc))
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@router.post("/admin-login", response_model=TokenResponse)
async def admin_login(credentials: AdminLoginRequest):
    """Dedicated secure authentication endpoint for Master Admin"""
    db = await get_database()
    normalized_email = credentials.email.strip().lower()
    
    user = await db.users.find_one({"email": normalized_email})
    if not user:
        # Check if it matches configured admin email, seed if needed
        if normalized_email == settings.admin_email.strip().lower():
            await seed_admin_account()
            user = await db.users.find_one({"email": normalized_email})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials"
        )
    
    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials"
        )
    
    # Verify role
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Administrative privileges required."
        )
    
    access_token = create_access_token({"sub": str(user["_id"]), "role": "admin"})
    
    user_response = UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        role="admin",
        created_at=user.get("created_at", datetime.now(timezone.utc))
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@router.post("/change-password")
async def change_password(req: ChangePasswordRequest, authorization: str = Header(None)):
    """Allow logged in user/admin to update their password securely"""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization header")
    
    token = authorization.replace("Bearer ", "").strip()
    user_id = get_user_from_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    db = await get_database()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid user ID")
    
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    # If old_password provided, verify it
    if req.old_password:
        if not verify_password(req.old_password, user["hashed_password"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    
    if len(req.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters")
    
    new_hashed = hash_password(req.new_password)
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"hashed_password": new_hashed, "updated_at": datetime.now(timezone.utc)}})
    
    return {"message": "Password changed successfully"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(authorization: str = Header(None)):
    """Validate current session token and return user profile"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing"
        )
    token = authorization.replace("Bearer ", "").strip()
    user_id = get_user_from_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    db = await get_database()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid user ID")
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    
    return UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        role=user.get("role", "user"),
        created_at=user.get("created_at", datetime.now(timezone.utc))
    )
