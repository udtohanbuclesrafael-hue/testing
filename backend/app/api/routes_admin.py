from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..schemas.site import FeedbackCreate
from ..services.weather_service import fetch_weather_data
from ..services.prediction_service import run_predictions
from ..ml.train import generate_synthetic_data, train_model

router = APIRouter()


@router.post("/ingest/weather")
def trigger_weather_ingest(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Trigger weather data ingestion for all active sites."""
    background_tasks.add_task(fetch_weather_data, db)
    return {"status": "Weather ingestion started"}


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
    return {"status": "Predictions generated", "predictions_written": written}


@router.post("/feedback", status_code=201)
def submit_feedback(feedback: FeedbackCreate, db: Session = Depends(get_db)):
    """Persist user feedback on forecast accuracy."""
    from ..models.site import Site, Feedback

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
def train_new_model(background_tasks: BackgroundTasks):
    """Train a new model using synthetic data."""
    background_tasks.add_task(generate_synthetic_data)
    background_tasks.add_task(train_model)
    return {"status": "Model training started"}