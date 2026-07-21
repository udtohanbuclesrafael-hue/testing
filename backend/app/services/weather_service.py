import requests
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models.site import Site, WeatherForecast
from ..core.config import settings


def fetch_weather_data(db: Session):
    """Fetch weather and marine data from Open-Meteo for all active sites."""
    sites = db.query(Site).filter(Site.active == True).all()
    
    for site in sites:
        # Fetch weather forecast
        weather_params = {
            "latitude": site.latitude,
            "longitude": site.longitude,
            "hourly": "wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,precipitation,pressure_msl",
            "forecast_days": 3
        }
        
        try:
            weather_response = requests.get(
                settings.OPEN_METEO_WEATHER_URL,
                params=weather_params,
                timeout=10
            )
            weather_data = weather_response.json()
            
            # Fetch marine forecast
            marine_params = {
                "latitude": site.latitude,
                "longitude": site.longitude,
                "hourly": "wave_height,swell_height,swell_period,swell_direction,sea_surface_temperature",
                "forecast_days": 3
            }
            
            marine_response = requests.get(
                settings.OPEN_METEO_MARINE_URL,
                params=marine_params,
                timeout=10
            )
            marine_data = marine_response.json()
            
            # Store forecasts
            if "hourly" in weather_data and "hourly" in marine_data:
                times = weather_data["hourly"]["time"]
                for i, time_str in enumerate(times):
                    timestamp = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
                    
                    forecast = WeatherForecast(
                        site_id=site.id,
                        timestamp=timestamp,
                        wind_speed=weather_data["hourly"]["wind_speed_10m"][i],
                        wind_direction=weather_data["hourly"]["wind_direction_10m"][i],
                        wind_gust=weather_data["hourly"]["wind_gusts_10m"][i],
                        rainfall=weather_data["hourly"]["precipitation"][i],
                        pressure=weather_data["hourly"]["pressure_msl"][i],
                        wave_height=marine_data["hourly"]["wave_height"][i] if i < len(marine_data["hourly"]["wave_height"]) else None,
                        swell_height=marine_data["hourly"]["swell_height"][i] if i < len(marine_data["hourly"]["swell_height"]) else None,
                        swell_period=marine_data["hourly"]["swell_period"][i] if i < len(marine_data["hourly"]["swell_period"]) else None,
                        swell_direction=marine_data["hourly"]["swell_direction"][i] if i < len(marine_data["hourly"]["swell_direction"]) else None,
                        sea_surface_temp=marine_data["hourly"]["sea_surface_temperature"][i] if i < len(marine_data["hourly"]["sea_surface_temperature"]) else None,
                    )
                    db.add(forecast)
                
                db.commit()
                
        except Exception as e:
            print(f"Error fetching data for site {site.name}: {e}")
            continue
