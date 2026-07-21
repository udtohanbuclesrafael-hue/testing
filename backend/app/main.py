from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.database import engine, Base, SessionLocal
from .models.site import Site, WeatherForecast, Prediction, Feedback, ModelRegistry
from .api import routes_sites, routes_forecast, routes_admin
from .core.config import settings

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Hyperlocal diveability forecast web app for Negros Oriental"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(routes_sites.router, prefix=settings.API_V1_STR)
app.include_router(routes_forecast.router, prefix=settings.API_V1_STR)
app.include_router(routes_admin.router, prefix=settings.API_V1_STR)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.VERSION}


@app.on_event("startup")
async def startup_event():
    """Initialize database with default sites on startup."""
    from sqlalchemy.orm import Session
    from .models.site import Site
    
    db = SessionLocal()
    try:
        # Check if sites already exist
        existing_sites = db.query(Site).count()
        if existing_sites == 0:
            # Add MVP dive sites
            mvp_sites = [
                Site(name="Dauin", latitude=9.12, longitude=123.26, exposure_level="sheltered", description="Popular muck diving site, generally sheltered"),
                Site(name="Apo Island", latitude=9.07, longitude=123.34, exposure_level="exposed", description="Marine reserve with exposed ocean conditions"),
                Site(name="Zamboanguita", latitude=9.23, longitude=123.20, exposure_level="semi-exposed", description="Coastal dive site with moderate exposure"),
                Site(name="Siaton", latitude=9.35, longitude=123.18, exposure_level="sheltered", description="Sheltered bay area"),
                Site(name="Bais", latitude=9.48, longitude=123.12, exposure_level="sheltered", description="Calm waters, sensitive to wind"),
            ]
            db.add_all(mvp_sites)
            db.commit()
            print(f"Initialized {len(mvp_sites)} dive sites")
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
