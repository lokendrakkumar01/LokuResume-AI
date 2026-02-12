from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    mongo_uri: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    frontend_url: str = "http://localhost:5173"
    port: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
