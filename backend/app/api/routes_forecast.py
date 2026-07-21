from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.database import get_db
from ..models.site import Site, Prediction
from ..schemas.site import ForecastResponse, PredictionBase

router = APIRouter()


class SummaryEntry(BaseModel):
    site_id: int
    site_name: str
    no_go_probability: float
    risk_class: str
    forecast_time: datetime


class RegionalSummary(BaseModel):
    sites: List[SummaryEntry]
    generated_at: datetime


@router.get("/sites/{site_id}/forecast", response_model=ForecastResponse)
def get_site_forecast(site_id: int, db: Session = Depends(get_db)):
    """Get 72-hour forecast for a specific site."""
    from datetime import timedelta

    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    now = datetime.utcnow()
    future_cutoff = now + timedelta(hours=72)

    predictions = db.query(Prediction).filter(
        Prediction.site_id == site_id,
        Prediction.forecast_time >= now,
        Prediction.forecast_time <= future_cutoff
    ).order_by(Prediction.forecast_time).all()

    return ForecastResponse(
        site_id=site.id,
        site_name=site.name,
        forecast=[PredictionBase.model_validate(p) for p in predictions]
    )


@router.get("/forecast/summary", response_model=RegionalSummary)
def get_regional_summary(db: Session = Depends(get_db)):
    """Get summary of all active sites with their nearest future risk status."""
    sites = db.query(Site).filter(Site.active.is_(True)).all()
    now = datetime.utcnow()

    summary: List[SummaryEntry] = []
    for site in sites:
        prediction = db.query(Prediction).filter(
            Prediction.site_id == site.id,
            Prediction.forecast_time >= now
        ).order_by(Prediction.forecast_time).first()

        if prediction:
            summary.append(SummaryEntry(
                site_id=site.id,
                site_name=site.name,
                no_go_probability=prediction.no_go_probability,
                risk_class=prediction.risk_class,
                forecast_time=prediction.forecast_time,
            ))

    return RegionalSummary(sites=summary, generated_at=now)