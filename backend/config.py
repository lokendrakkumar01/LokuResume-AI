from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    mongo_uri: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 43200  # 30 days (persists login session)
    frontend_url: str = "http://localhost:5173"
    port: int = 8000
    
    @field_validator("mongo_uri", mode="before")
    @classmethod
    def clean_mongo_uri(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip().strip("'\"")
        return v

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "allow"

settings = Settings()
