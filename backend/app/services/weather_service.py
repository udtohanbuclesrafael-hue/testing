import requests
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from ..core.config import settings
from ..models.site import Site, WeatherForecast


def _fetch(session: requests.Session, params: dict, label: str, timeout: int = 30):
    """GET with raise_for_status; return (json_body, None) or (None, error_str)."""
    try:
        r = session.get(
            settings.OPEN_METEO_MARINE_URL,
            params=params,
            timeout=timeout,
        )
        r.raise_for_status()
        return r.json(), None
    except Exception as e:
        return None, f"{label}: {e.__class__.__name__}: {str(e)[:120]}"


def fetch_weather_data(db: Session, timeout: int = 30):
    """Fetch weather + (best-effort) marine data from Open-Meteo for all active sites.

    Open-Meteo's marine API occasionally fails for some swell fields or for
    certain coastal coordinates. To stay resilient we issue the marine request
    per field rather than in one combined call, so a failure on one field
    doesn't lose the others.
    """
    sites = db.query(Site).filter(Site.active.is_(True)).all()

    # Fields that reliably succeed together today.
    weather_fields = (
        "wind_speed_10m,wind_direction_10m,wind_gusts_10m,temperature_2m,"
        "precipitation,pressure_msl"
    )
    # Marine fields that work together: wave + SST.
    marine_known_good = "wave_height,sea_surface_temperature"
    # Each swell field is fetched individually (the marine API currently rejects
    # combined requests that include any swell_* parameter for many regions).
    marine_swell_fields = ["swell_height", "swell_period", "swell_direction"]

    session = requests.Session()

    for site in sites:
        # 1. Weather forecast (always works).
        try:
            weather_resp = session.get(
                settings.OPEN_METEO_WEATHER_URL,
                params={
                    "latitude": site.latitude,
                    "longitude": site.longitude,
                    "hourly": weather_fields,
                    "forecast_days": 3,
                },
                timeout=timeout,
            )
            weather_resp.raise_for_status()
            weather_data = weather_resp.json()
        except Exception as e:
            print(f"[weather] {site.name}: {e.__class__.__name__}: {str(e)[:120]}")
            continue

        # 2. Marine: wave + SST in one call (cell_selection handles coastal sites).
        marine_main, err = _fetch(
            session,
            {
                "latitude": site.latitude,
                "longitude": site.longitude,
                "hourly": marine_known_good,
                "forecast_days": 3,
                "cell_selection": "nearest",
            },
            label=f"marine wave+sst",
            timeout=timeout,
        )
        if err:
            print(f"[marine] {site.name}: {err}")
            marine_main = {"hourly": {"wave_height": [], "sea_surface_temperature": []}}

        # 3. Marine: each swell field separately (best-effort).
        swell_data = {}
        for field in marine_swell_fields:
            single, serr = _fetch(
                session,
                {
                    "latitude": site.latitude,
                    "longitude": site.longitude,
                    "hourly": field,
                    "forecast_days": 3,
                    "cell_selection": "nearest",
                },
                label=f"marine {field}",
                timeout=timeout,
            )
            if serr:
                # Quiet by design — swell is currently flaky upstream; log at info level only.
                print(f"[marine] {site.name}: {serr}")
                swell_data[field] = []
            else:
                swell_data[field] = single.get("hourly", {}).get(field, []) if single else []

        # 4. Merge by timestamp and persist.
        if "hourly" not in weather_data or "hourly" not in marine_main:
            continue

        times = weather_data["hourly"]["time"]
        wave = marine_main["hourly"].get("wave_height") or []
        sst = marine_main["hourly"].get("sea_surface_temperature") or []

        try:
            for i, time_str in enumerate(times):
                ts = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
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
                    swell_height=swell_data["swell_height"][i]
                    if i < len(swell_data["swell_height"]) else None,
                    swell_period=swell_data["swell_period"][i]
                    if i < len(swell_data["swell_period"]) else None,
                    swell_direction=swell_data["swell_direction"][i]
                    if i < len(swell_data["swell_direction"]) else None,
                    sea_surface_temp=sst[i] if i < len(sst) else None,
                )
                db.add(forecast)

            db.commit()
            wave_count = sum(1 for v in wave if v is not None)
            print(
                f"[ok] {site.name}: {len(times)} hourly rows "
                f"({wave_count} with wave_height)"
            )
        except Exception as e:
            print(f"[db] {site.name}: {e.__class__.__name__}: {str(e)[:120]}")
            db.rollback()
            continue