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
def train_new_model():
    """Synchronously generate synthetic data and train the model.

    Returns metrics so the UI can confirm a real run happened.
    """
    started = datetime.utcnow()
    df = generate_synthetic_data()
    model = train_model()
    elapsed = (datetime.utcnow() - started).total_seconds()

    model_path = Path(settings.MODEL_PATH)
    return {
        "status": "Model training complete",
        "training_rows": int(len(df)),
        "model_path": str(model_path),
        "model_exists": model_path.exists(),
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