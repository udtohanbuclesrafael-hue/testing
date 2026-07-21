from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..services.weather_service import fetch_weather_data
from ..ml.train import generate_synthetic_data, train_model

router = APIRouter()


@router.post("/ingest/weather")
def trigger_weather_ingest(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Trigger weather data ingestion for all sites."""
    background_tasks.add_task(fetch_weather_data, db)
    return {"status": "Weather ingestion started"}


@router.post("/predict/run")
def run_predictions(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Run predictions for all sites."""
    # In a real app, this would call the prediction service
    return {"status": "Prediction job queued"}


@router.post("/feedback")
def submit_feedback(feedback_data: dict, db: Session = Depends(get_db)):
    """Submit user feedback on forecast accuracy."""
    # Implementation would add to Feedback table
    return {"status": "Feedback received"}


@router.post("/ml/train")
def train_new_model(background_tasks: BackgroundTasks):
    """Train a new model using synthetic or real data."""
    background_tasks.add_task(generate_synthetic_data)
    background_tasks.add_task(train_model)
    return {"status": "Model training started"}
