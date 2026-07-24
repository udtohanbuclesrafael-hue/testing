from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PROJECT_NAME: str = "SeaSID"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "sqlite:///./seasid.db"
    
    # ML Model
    MODEL_PATH: str = "app/ml/model.pkl"
    # Selects the active model backend: "rf" (default) or "lstm".
    MODEL_BACKEND: str = "rf"
    
    # Open-Meteo API
    OPEN_METEO_WEATHER_URL: str = "https://api.open-meteo.com/v1/forecast"
    OPEN_METEO_MARINE_URL: str = "https://marine-api.open-meteo.com/v1/marine"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
