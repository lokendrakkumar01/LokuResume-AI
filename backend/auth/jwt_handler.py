from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from config import settings

def create_access_token(data: dict) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError:
        return None

def get_user_from_token(token: str) -> str:
    """Extract user ID from token"""
    payload = verify_token(token)
    if payload:
        return payload.get("sub")
    return None

def get_token_payload(token: str) -> dict:
    """Extract full payload from token"""
    return verify_token(token)

def get_user_role_from_token(token: str) -> tuple:
    """Extract (user_id, role) from token"""
    payload = verify_token(token)
    if payload:
        return payload.get("sub"), payload.get("role", "user")
    return None, None

def get_admin_from_token(token: str) -> str:
    """Extract and verify user ID has admin or super_admin role from token"""
    payload = verify_token(token)
    if payload and payload.get("role") in ["admin", "super_admin"]:
        return payload.get("sub")
    return None

def verify_token_role(token: str, allowed_roles: list) -> str:
    """Extract user ID if token has one of the allowed roles"""
    payload = verify_token(token)
    if payload and payload.get("role") in allowed_roles:
        return payload.get("sub")
    return None
