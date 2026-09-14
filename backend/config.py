from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    mongo_uri: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 5256000  # 10 years (persists login session indefinitely)
    frontend_url: str = "http://localhost:5173"
    public_frontend_url: str = "https://lokuresume-ai-008k.onrender.com"
    public_backend_url: str = "https://lokiresume-backend.onrender.com"
    port: int = 8000
    admin_email: str = "admin@lokiresume.com"
    admin_password: str = "AdminLoku@2026!#Secret"
    cloudinary_cloud_name: str = "owy72ylb"
    cloudinary_api_key: str = "286765873426464"
    cloudinary_api_secret: str = "5WBAuPacEAzm_LVMd6ERp67YHcA"
    cloudinary_url: str = "cloudinary://286765873426464:5WBAuPacEAzm_LVMd6ERp67YHcA@owy72ylb"
    
    @field_validator("mongo_uri", mode="before")
    @classmethod
    def clean_mongo_uri(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().strip("'\"")
        return v

    class Config:
        from pathlib import Path
        env_file = [".env", str(Path(__file__).resolve().parent / ".env")]
        case_sensitive = False
        extra = "allow"

settings = Settings()
