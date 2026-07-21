import json
from datetime import datetime, timedelta
from collections import defaultdict

from sqlalchemy.orm import Session

from ..core.config import settings
from ..models.site import Site, WeatherForecast, Prediction
from ..ml.train import predict_no_go


EXPOSURE_MAP = {"sheltered": 0, "semi-exposed": 1, "exposed": 2}


def _build_features(site: Site, forecasts: list[WeatherForecast]) -> list[dict]:
    """Build a feature dict per forecast row, including rolling means."""
    features = []
    for i, f in enumerate(forecasts):
        window = forecasts[max(0, i - 2):i + 1]
        wind_3h_avg = sum(w.wind_speed or 0 for w in window) / len(window)
        wave_3h_avg = sum(w.wave_height or 0 for w in window) / len(window)

        timestamp = f.timestamp
        exposure_encoded = EXPOSURE_MAP.get((site.exposure_level or "").lower(), 1)

        features.append({
            "wind_speed": f.wind_speed or 0.0,
            "wave_height": f.wave_height or 0.0,
            "swell_height": f.swell_height or 0.0,
            "swell_period": f.swell_period or 0.0,
            "rainfall": f.rainfall or 0.0,
            "exposure_encoded": exposure_encoded,
            "wind_wave_interaction": (f.wind_speed or 0.0) * (f.wave_height or 0.0),
            "hour": timestamp.hour,
            "day_of_year": timestamp.timetuple().tm_yday,
            "wind_3h_avg": wind_3h_avg,
            "wave_3h_avg": wave_3h_avg,
            "_timestamp": timestamp,
        })
    return features


def _model_version() -> str:
    return settings.VERSION


def run_predictions(db: Session, site_id: int | None = None) -> int:
    """Run the ML model over recent weather forecasts and persist Prediction rows.

    Returns the number of predictions written.
    """
    now = datetime.utcnow()
    horizon = now + timedelta(hours=72)

    sites_query = db.query(Site).filter(Site.active.is_(True))
    if site_id is not None:
        sites_query = sites_query.filter(Site.id == site_id)
    sites = sites_query.all()
    if not sites:
        return 0

    written = 0
    model_version = _model_version()

    for site in sites:
        forecasts = (
            db.query(WeatherForecast)
            .filter(
                WeatherForecast.site_id == site.id,
                WeatherForecast.timestamp >= now,
                WeatherForecast.timestamp <= horizon,
            )
            .order_by(WeatherForecast.timestamp)
            .all()
        )
        if not forecasts:
            continue

        # Replace any prior predictions in this window so reruns stay idempotent.
        db.query(Prediction).filter(
            Prediction.site_id == site.id,
            Prediction.forecast_time >= now,
            Prediction.forecast_time <= horizon,
        ).delete(synchronize_session=False)

        features = _build_features(site, forecasts)
        for feat in features:
            timestamp = feat.pop("_timestamp")
            result = predict_no_go(feat)
            db.add(Prediction(
                site_id=site.id,
                forecast_time=timestamp,
                no_go_probability=result["no_go_probability"],
                risk_class=result["risk_class"],
                model_version=model_version,
                top_reasons=json.dumps(result.get("reasons", [])),
            ))
            written += 1

        db.commit()

    return written