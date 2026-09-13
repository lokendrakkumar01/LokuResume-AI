from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: Optional[str] = "user"
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: Optional[str] = None
    new_password: str

class BroadcastRequest(BaseModel):
    message: str
    type: Optional[str] = "info"  # "info", "warning", "success", "alert"
    active: Optional[bool] = True

class FeatureFlagsUpdateRequest(BaseModel):
    features: dict

