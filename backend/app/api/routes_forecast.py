from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta
from ..core.database import get_db
from ..models.site import Site, Prediction
from ..schemas.site import ForecastResponse, PredictionBase

router = APIRouter()


@router.get("/sites/{site_id}/forecast", response_model=ForecastResponse)
def get_site_forecast(site_id: int, db: Session = Depends(get_db)):
    """Get 72-hour forecast for a specific site."""
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


@router.get("/forecast/summary")
def get_regional_summary(db: Session = Depends(get_db)):
    """Get summary of all sites with current risk status."""
    sites = db.query(Site).filter(Site.active == True).all()
    now = datetime.utcnow()
    
    summary = []
    for site in sites:
        # Get the nearest future prediction
        prediction = db.query(Prediction).filter(
            Prediction.site_id == site.id,
            Prediction.forecast_time >= now
        ).order_by(Prediction.forecast_time).first()
        
        if prediction:
            summary.append({
                "site_id": site.id,
                "site_name": site.name,
                "no_go_probability": prediction.no_go_probability,
                "risk_class": prediction.risk_class,
                "forecast_time": prediction.forecast_time
            })
    
    return {"sites": summary, "generated_at": now}
