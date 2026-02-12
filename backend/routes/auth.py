from fastapi import APIRouter, HTTPException, status
from models.user import UserSignup, UserLogin, TokenResponse, UserResponse
from auth.hash_password import hash_password, verify_password
from auth.jwt_handler import create_access_token
from database import get_database
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user: UserSignup):
    """Register a new user"""
    db = await get_database()
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user_doc = {
        "name": user.name,
        "email": user.email,
        "hashed_password": hash_password(user.password),
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    
    # Generate JWT token
    access_token = create_access_token({"sub": str(result.inserted_id)})
    
    # Return token and user info
    user_response = UserResponse(
        id=str(user_doc["_id"]),
        name=user_doc["name"],
        email=user_doc["email"],
        created_at=user_doc["created_at"]
    )
    
    return TokenResponse(access_token=access_token, user=user_response)

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    """Login user and return JWT token"""
    db = await get_database()
    
    # Find user by email
    user = await db.users.find_one({"email": credentials.email})
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
    
    # Generate JWT token
    access_token = create_access_token({"sub": str(user["_id"])})
    
    # Return token and user info
    user_response = UserResponse(
        id=str(user["_id"]),
        name=user["name"],
        email=user["email"],
        created_at=user["created_at"]
    )
    
    return TokenResponse(access_token=access_token, user=user_response)
