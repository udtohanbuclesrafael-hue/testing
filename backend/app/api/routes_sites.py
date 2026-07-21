from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..core.database import get_db
from ..models.site import Site
from ..schemas.site import Site as SiteSchema, SiteCreate

router = APIRouter()


@router.get("/sites", response_model=List[SiteSchema])
def list_sites(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all active dive sites."""
    sites = db.query(Site).filter(Site.active.is_(True)).offset(skip).limit(limit).all()
    return sites


@router.get("/sites/{site_id}", response_model=SiteSchema)
def get_site(site_id: int, db: Session = Depends(get_db)):
    """Get a specific dive site by ID."""
    site = db.query(Site).filter(Site.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site


@router.post("/sites", response_model=SiteSchema)
def create_site(site: SiteCreate, db: Session = Depends(get_db)):
    """Create a new dive site (admin only in production)."""
    db_site = Site(**site.model_dump())
    db.add(db_site)
    db.commit()
    db.refresh(db_site)
    return db_site
