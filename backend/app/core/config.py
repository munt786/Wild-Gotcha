import os
from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "WildGotcha Species ID API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Google Gemini Vision API Settings (for Global Lakhs/Crores Species ID)
    GEMINI_API_KEY: Optional[str] = None

    # MongoDB Atlas Settings
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "wildgotcha_db"

    # ML Inference Settings
    INPUT_IMAGE_SIZE: int = 224
    CONFIDENCE_THRESHOLD: float = 0.15
    TOP_K_PREDICTIONS: int = 5

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
