from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class SiteBase(BaseModel):
    name: str
    latitude: float
    longitude: float
    exposure_level: Optional[str] = None
    description: Optional[str] = None
    active: bool = True


class SiteCreate(SiteBase):
    pass


class Site(SiteBase):
    id: int
    
    class Config:
        from_attributes = True


class WeatherForecastBase(BaseModel):
    timestamp: datetime
    wind_speed: Optional[float] = None
    wind_direction: Optional[float] = None
    wind_gust: Optional[float] = None
    wave_height: Optional[float] = None
    swell_height: Optional[float] = None
    swell_period: Optional[float] = None
    swell_direction: Optional[float] = None
    rainfall: Optional[float] = None
    pressure: Optional[float] = None
    sea_surface_temp: Optional[float] = None


class WeatherForecast(WeatherForecastBase):
    id: int
    site_id: int
    
    class Config:
        from_attributes = True


class PredictionBase(BaseModel):
    forecast_time: datetime
    no_go_probability: float = Field(ge=0.0, le=1.0)
    risk_class: str
    top_reasons: Optional[str] = None


class Prediction(PredictionBase):
    id: int
    site_id: int
    model_version: str
    
    class Config:
        from_attributes = True


class ForecastResponse(BaseModel):
    site_id: int
    site_name: str
    forecast: List[PredictionBase]


class FeedbackCreate(BaseModel):
    site_id: int
    forecast_time: datetime
    actual_go_no_go: str
    user_type: Optional[str] = None
    comments: Optional[str] = None
