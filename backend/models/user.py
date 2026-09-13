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

class UserStatusUpdateRequest(BaseModel):
    status: str  # "active" | "deactivated" | "banned"

class UserRoleUpdateRequest(BaseModel):
    role: str  # "super_admin" | "admin" | "moderator" | "user"

class UserFeaturesUpdateRequest(BaseModel):
    features: dict

class ThemeItem(BaseModel):
    id: str
    name: str
    hex_code: str
    category: Optional[str] = "Standard"
    active: Optional[bool] = True

class TemplateConfigItem(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    active: Optional[bool] = True
    is_premium: Optional[bool] = False

class MaintenanceModeRequest(BaseModel):
    enabled: bool
    message: Optional[str] = "System is undergoing scheduled maintenance. Please check back shortly."
    allowed_roles: Optional[list] = ["super_admin", "admin"]


