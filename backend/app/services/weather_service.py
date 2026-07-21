import requests
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..models.site import Site, WeatherForecast
from ..core.config import settings


def fetch_weather_data(db: Session, timeout: int = 30):
    """Fetch weather and marine data from Open-Meteo for all active sites."""
    sites = db.query(Site).filter(Site.active.is_(True)).all()

    for site in sites:
        weather_params = {
            "latitude": site.latitude,
            "longitude": site.longitude,
            "hourly": "wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,precipitation,pressure_msl",
            "forecast_days": 3,
        }

        try:
            weather_response = requests.get(
                settings.OPEN_METEO_WEATHER_URL,
                params=weather_params,
                timeout=timeout,
            )
            weather_response.raise_for_status()
            weather_data = weather_response.json()

            marine_params = {
                "latitude": site.latitude,
                "longitude": site.longitude,
                "hourly": "wave_height,swell_height,swell_period,swell_direction,sea_surface_temperature",
                "forecast_days": 3,
            }

            marine_response = requests.get(
                settings.OPEN_METEO_MARINE_URL,
                params=marine_params,
                timeout=timeout,
            )
            marine_response.raise_for_status()
            marine_data = marine_response.json()

            if "hourly" in weather_data and "hourly" in marine_data:
                times = weather_data["hourly"]["time"]
                wave = marine_data["hourly"].get("wave_height") or []
                swell_h = marine_data["hourly"].get("swell_height") or []
                swell_p = marine_data["hourly"].get("swell_period") or []
                swell_d = marine_data["hourly"].get("swell_direction") or []
                sst = marine_data["hourly"].get("sea_surface_temperature") or []

                for i, time_str in enumerate(times):
                    ts = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
                    # Store naive UTC to match other naive DateTime columns.
                    if ts.tzinfo is not None:
                        ts = ts.astimezone(timezone.utc).replace(tzinfo=None)

                    forecast = WeatherForecast(
                        site_id=site.id,
                        timestamp=ts,
                        wind_speed=weather_data["hourly"]["wind_speed_10m"][i],
                        wind_direction=weather_data["hourly"]["wind_direction_10m"][i],
                        wind_gust=weather_data["hourly"]["wind_gusts_10m"][i],
                        rainfall=weather_data["hourly"]["precipitation"][i],
                        pressure=weather_data["hourly"]["pressure_msl"][i],
                        wave_height=wave[i] if i < len(wave) else None,
                        swell_height=swell_h[i] if i < len(swell_h) else None,
                        swell_period=swell_p[i] if i < len(swell_p) else None,
                        swell_direction=swell_d[i] if i < len(swell_d) else None,
                        sea_surface_temp=sst[i] if i < len(sst) else None,
                    )
                    db.add(forecast)

                db.commit()

        except Exception as e:
            print(f"Error fetching data for site {site.name}: {e}")
            db.rollback()
            continue
