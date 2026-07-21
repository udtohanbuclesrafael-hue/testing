import os
import re
import socket
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

# CORS configuration.
# - Dev defaults: localhost ports and Google Cloud Shell's `*.cloudshell.dev`
#   proxy URLs. Production should override via CORS_ALLOW_ORIGINS.
# - We use allow_origin_regex to cover *.cloudshell.dev without enumerating
#   every ephemeral port-prefixed subdomain.
_dev_origins = [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
]
_extra_origins = [o.strip() for o in os.getenv("CORS_ALLOW_ORIGINS", "").split(",") if o.strip()]
_extra_regex = os.getenv("CORS_ALLOW_ORIGIN_REGEX", "").strip()

_origin_regexes = [
    # Google Cloud Shell: https://<port>-cs-<hash>.<region>.cloudshell.dev
    # (region can be e.g. "cs-asia-east1-duck"; we accept any subdomain chain).
    r"^https://.+\.cloudshell\.dev$",
]
if _extra_regex:
    _origin_regexes.append(_extra_regex)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_dev_origins + _extra_origins,
    allow_origin_regex="|".join(_origin_regexes),
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


def _print_startup_banner(host: str, port: int) -> None:
    """Print the URLs the backend is reachable at."""
    print("\n" + "=" * 60)
    print(f"  SeaSID backend v{settings.VERSION}")
    print(f"  Listening on http://{host}:{port}")
    if host in ("0.0.0.0", ""):
        try:
            local_ip = socket.gethostbyname(socket.gethostname())
            print(f"  LAN:         http://{local_ip}:{port}")
        except Exception:
            pass
    print(f"  Docs:        http://{host}:{port}/docs")
    print(f"  Health:      http://{host}:{port}/health")
    print(f"  API base:    http://{host}:{port}{settings.API_V1_STR}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    _print_startup_banner(host, port)
    uvicorn.run("app.main:app", host=host, port=port, reload=False)