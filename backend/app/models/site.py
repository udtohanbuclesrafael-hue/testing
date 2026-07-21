from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base


class Site(Base):
    __tablename__ = "sites"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    exposure_level = Column(String)  # Sheltered, Semi-exposed, Exposed
    description = Column(Text)
    active = Column(Boolean, default=True)
    
    weather_forecasts = relationship("WeatherForecast", back_populates="site")
    predictions = relationship("Prediction", back_populates="site")
    feedback = relationship("Feedback", back_populates="site")


class WeatherForecast(Base):
    __tablename__ = "weather_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    
    # Weather data
    wind_speed = Column(Float)  # m/s
    wind_direction = Column(Float)  # degrees
    wind_gust = Column(Float)  # m/s
    wave_height = Column(Float)  # meters
    swell_height = Column(Float)  # meters
    swell_period = Column(Float)  # seconds
    swell_direction = Column(Float)  # degrees
    rainfall = Column(Float)  # mm
    pressure = Column(Float)  # hPa
    sea_surface_temp = Column(Float)  # Celsius
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    site = relationship("Site", back_populates="weather_forecasts")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    forecast_time = Column(DateTime, nullable=False, index=True)
    
    no_go_probability = Column(Float, nullable=False)  # 0.0 to 1.0
    risk_class = Column(String)  # Go, Caution, No-Go
    model_version = Column(String)
    top_reasons = Column(Text)  # JSON string or comma-separated
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    site = relationship("Site", back_populates="predictions")


class Feedback(Base):
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    site_id = Column(Integer, ForeignKey("sites.id"), nullable=False)
    forecast_time = Column(DateTime, nullable=False)
    
    actual_go_no_go = Column(String)  # Go, No-Go
    user_type = Column(String)  # operator, guide, recreational
    comments = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    site = relationship("Site", back_populates="feedback")


class ModelRegistry(Base):
    __tablename__ = "model_registry"

    id = Column(Integer, primary_key=True, index=True)
    model_version = Column(String, unique=True, nullable=False)
    trained_at = Column(DateTime, default=datetime.utcnow)
    metrics = Column(Text)  # JSON string
    file_path = Column(String)
    notes = Column(Text)
