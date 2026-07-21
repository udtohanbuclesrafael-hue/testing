import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.database import engine, Base, SessionLocal
from .core.config import settings
from .models.site import Site, WeatherForecast, Prediction, Feedback, ModelRegistry  # noqa: F401
from .api import routes_sites, routes_forecast, routes_admin


def _seed_default_sites() -> None:
    """Insert MVP dive sites if the table is empty."""
    db = SessionLocal()
    try:
        if db.query(Site).count() > 0:
            return
        mvp_sites = [
            Site(name="Dauin", latitude=9.12, longitude=123.26, exposure_level="sheltered",
                 description="Popular muck diving site, generally sheltered"),
            Site(name="Apo Island", latitude=9.07, longitude=123.34, exposure_level="exposed",
                 description="Marine reserve with exposed ocean conditions"),
            Site(name="Zamboanguita", latitude=9.23, longitude=123.20, exposure_level="semi-exposed",
                 description="Coastal dive site with moderate exposure"),
            Site(name="Siaton", latitude=9.35, longitude=123.18, exposure_level="sheltered",
                 description="Sheltered bay area"),
            Site(name="Bais", latitude=9.48, longitude=123.12, exposure_level="sheltered",
                 description="Calm waters, sensitive to wind"),
        ]
        db.add_all(mvp_sites)
        db.commit()
        print(f"Initialized {len(mvp_sites)} dive sites")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _seed_default_sites()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Hyperlocal diveability forecast web app for Negros Oriental",
    lifespan=lifespan,
)

# CORS: allow the Vite dev server by default; override via env in production.
_default_origins = ["http://localhost:5173", "http://localhost:4173"]
_extra_origins = [o.strip() for o in os.getenv("CORS_ALLOW_ORIGINS", "").split(",") if o.strip()]
allow_origins = _default_origins + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_sites.router, prefix=settings.API_V1_STR)
app.include_router(routes_forecast.router, prefix=settings.API_V1_STR)
app.include_router(routes_admin.router, prefix=settings.API_V1_STR)


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.VERSION}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)