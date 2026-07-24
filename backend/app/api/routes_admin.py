import os
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.database import get_db
from ..models.site import Site, WeatherForecast, Prediction, Feedback
from ..schemas.site import FeedbackCreate
from ..services.weather_service import fetch_weather_data
from ..services.prediction_service import run_predictions
from ..ml.train import generate_synthetic_data, train_model
from ..services.alerts_service import (
    DEFAULT_THRESHOLDS,
    evaluate_recent_forecasts,
)

router = APIRouter()


@router.post("/ingest/weather")
def trigger_weather_ingest(db: Session = Depends(get_db)):
    """Synchronously fetch Open-Meteo data for every active site.

    Returns counts so the UI can confirm what actually happened.
    """
    sites_before = {row.site_id: row.count for row in
                    db.query(WeatherForecast.site_id,
                             WeatherForecast.id).all()}
    # Easier: just count before, then run, then diff by timestamp.
    before_cutoff = datetime.utcnow()
    fetch_weather_data(db)

    new_rows = (
        db.query(WeatherForecast)
        .filter(WeatherForecast.timestamp >= before_cutoff - timedelta(hours=72))
        .all()
    )
    by_site = {}
    for row in new_rows:
        by_site.setdefault(row.site_id, 0)
        by_site[row.site_id] += 1

    return {
        "status": "Weather ingestion complete",
        "sites_ingested": len(by_site),
        "rows_per_site": by_site,
        "total_rows": sum(by_site.values()),
        "completed_at": datetime.utcnow().isoformat() + "Z",
    }


@router.post("/predict/run")
def run_predictions_now(site_id: int | None = None, db: Session = Depends(get_db)):
    """Run the ML model over the latest weather forecasts and persist predictions."""
    try:
        written = run_predictions(db, site_id=site_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=409,
            detail="No trained model found. POST /api/v1/ml/train first.",
        )
    return {
        "status": "Predictions generated",
        "predictions_written": written,
        "completed_at": datetime.utcnow().isoformat() + "Z",
    }


@router.post("/feedback", status_code=201)
def submit_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db)):
    """Persist user feedback on forecast accuracy."""
    site = db.query(Site).filter(Site.id == feedback.site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    row = Feedback(
        site_id=feedback.site_id,
        forecast_time=feedback.forecast_time,
        actual_go_no_go=feedback.actual_go_no_go,
        user_type=feedback.user_type,
        comments=feedback.comments,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"status": "Feedback received", "id": row.id}


@router.post("/ml/train")
def train_new_model(backend: str | None = None):
    """Synchronously generate synthetic data and train the model.

    Returns metrics so the UI can confirm a real run happened.
    """
    started = datetime.utcnow()
    df = generate_synthetic_data()
    result = train_model(backend=backend or settings.MODEL_BACKEND)
    elapsed = (datetime.utcnow() - started).total_seconds()

    model_path = Path(settings.MODEL_PATH)
    return {
        "status": "Model training complete",
        "training_rows": int(len(df)),
        "backend": result["backend"],
        "model_path": result["model_path"],
        "model_exists": Path(result["model_path"]).exists(),
        "metrics": result.get("metrics", {}),
        "elapsed_seconds": round(elapsed, 1),
        "completed_at": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/status")
def admin_status(db: Session = Depends(get_db)):
    """Snapshot of admin-relevant state: model presence, row counts, feedback count."""
    model_path = Path(settings.MODEL_PATH)
    weather_count = db.query(WeatherForecast).count()
    prediction_count = db.query(Prediction).count()
    feedback_count = db.query(Feedback).count()
    site_count = db.query(Site).filter(Site.active.is_(True)).count()

    latest_prediction = (
        db.query(Prediction).order_by(Prediction.created_at.desc()).first()
    )
    latest_weather = (
        db.query(WeatherForecast).order_by(WeatherForecast.created_at.desc()).first()
    )
    latest_feedback = (
        db.query(Feedback).order_by(Feedback.created_at.desc()).first()
    )

    return {
        "model_exists": model_path.exists(),
        "model_path": str(model_path),
        "active_sites": site_count,
        "weather_rows": weather_count,
        "prediction_rows": prediction_count,
        "feedback_rows": feedback_count,
        "latest_prediction_at": (
            latest_prediction.created_at.isoformat() + "Z"
            if latest_prediction else None
        ),
        "latest_weather_at": (
            latest_weather.created_at.isoformat() + "Z"
            if latest_weather else None
        ),
        "latest_feedback_at": (
            latest_feedback.created_at.isoformat() + "Z"
            if latest_feedback else None
        ),
    }
@router.get("/alerts")
def list_alerts(
    site_id: int | None = None,
    horizon_hours: int = 24,
    db: Session = Depends(get_db),
):
    """Return threshold-based alerts for the next ``horizon_hours``."""
    horizon_hours = max(1, min(int(horizon_hours), 72))
    alerts = evaluate_recent_forecasts(
        db,
        site_id=site_id,
        horizon_hours=horizon_hours,
    )
    return {
        "count": len(alerts),
        "thresholds": DEFAULT_THRESHOLDS,
        "alerts": [a.to_dict() for a in alerts],
        "generated_at": datetime.utcnow().isoformat() + "Z",
    }


@router.post("/alerts/run")
def run_alerts(db: Session = Depends(get_db)):
    """Trigger an alert evaluation pass and return the counts.

    This endpoint is intentionally idempotent: alerts are computed on
    demand from the current forecast rows rather than persisted, so the
    UI can refresh without worrying about staleness.
    """
    alerts = evaluate_recent_forecasts(db)
    severity_counts: dict[str, int] = {"info": 0, "caution": 0, "no-go": 0}
    site_counts: dict[int, int] = {}
    for a in alerts:
        severity_counts[a.severity] = severity_counts.get(a.severity, 0) + 1
        site_counts[a.site_id] = site_counts.get(a.site_id, 0) + 1
    return {
        "status": "Alerts evaluated",
        "alerts_total": len(alerts),
        "by_severity": severity_counts,
        "by_site": site_counts,
        "completed_at": datetime.utcnow().isoformat() + "Z",
    }

