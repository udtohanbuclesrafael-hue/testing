"""Threshold-based operator alerts derived from active forecast windows.

The alert engine watches the most recent forecast row per active site and
raises an entry whenever a configurable threshold is breached. The intent
is to surface *operationally* dangerous windows even if the ML model gives
a low no-go probability (for example, a quick gust spike before the LSTM
has had a chance to react).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable

from sqlalchemy.orm import Session

from ..models.site import Prediction, Site, WeatherForecast


# Default thresholds. Exposed at module level so tests and the API layer
# can introspect or override them without re-importing internal helpers.
DEFAULT_THRESHOLDS: dict[str, float] = {
    "wind_speed": 12.0,        # m/s — strong wind threshold used elsewhere
    "wind_gust": 16.0,         # m/s — sustained gusts that surprise divers
    "wave_height": 1.2,        # m
    "rainfall": 10.0,          # mm/h
    "pressure": 1003.0,        # hPa (low pressure implies storms)
    "no_go_probability": 0.6,  # mirrors the Caution -> No-Go boundary
}

SEVERITY_RANK: dict[str, int] = {"info": 1, "caution": 2, "no-go": 3}


@dataclass
class Alert:
    site_id: int
    site_name: str
    metric: str
    value: float
    threshold: float
    severity: str
    forecast_time: datetime

    def to_dict(self) -> dict:
        return {
            "site_id": self.site_id,
            "site_name": self.site_name,
            "metric": self.metric,
            "value": round(float(self.value), 3),
            "threshold": round(float(self.threshold), 3),
            "severity": self.severity,
            "forecast_time": self.forecast_time.isoformat() + "Z",
        }


def _severity(metric: str, value: float) -> str:
    if metric == "no_go_probability":
        if value >= 0.8:
            return "no-go"
        return "caution"
    # Pressure is the only metric where lower values are dangerous.
    threshold = DEFAULT_THRESHOLDS[metric]
    if metric == "pressure":
        if value <= threshold * 0.985:
            return "no-go"
        return "caution"
    if value >= threshold * 1.5:
        return "no-go"
    return "caution"


def evaluate_recent_forecasts(
    db: Session,
    *,
    site_id: int | None = None,
    horizon_hours: int = 24,
    thresholds: dict[str, float] | None = None,
) -> list[Alert]:
    """Evaluate the next ``horizon_hours`` of forecasts per site.

    Returns an alphabetically-sorted list of :class:`Alert` records,
    newest first. ``thresholds`` lets tests inject custom limits.
    """
    effective_thresholds = {**DEFAULT_THRESHOLDS, **(thresholds or {})}
    now = datetime.utcnow()
    cutoff = now + timedelta(hours=horizon_hours)

    sites_query = db.query(Site).filter(Site.active.is_(True))
    if site_id is not None:
        sites_query = sites_query.filter(Site.id == site_id)
    sites = sites_query.all()

    alerts: list[Alert] = []
    for site in sites:
        forecast_rows = (
            db.query(WeatherForecast)
            .filter(
                WeatherForecast.site_id == site.id,
                WeatherForecast.timestamp >= now,
                WeatherForecast.timestamp <= cutoff,
            )
            .order_by(WeatherForecast.timestamp)
            .all()
        )
        prediction_rows = {
            p.forecast_time: p
            for p in db.query(Prediction)
            .filter(
                Prediction.site_id == site.id,
                Prediction.forecast_time >= now,
                Prediction.forecast_time <= cutoff,
            )
            .all()
        }
        for row in forecast_rows:
            alerts.extend(_scan_row(site, row, effective_thresholds, prediction_rows))

    alerts.sort(key=lambda a: (a.forecast_time, a.site_id), reverse=True)
    return alerts


def _scan_row(site, row, thresholds, prediction_rows) -> Iterable[Alert]:
    metrics: dict[str, float | None] = {
        "wind_speed": row.wind_speed,
        "wind_gust": row.wind_gust,
        "wave_height": row.wave_height,
        "rainfall": row.rainfall,
        "pressure": row.pressure,
    }
    for metric, threshold in thresholds.items():
        if metric == "no_go_probability":
            continue
        value = metrics.get(metric)
        if value is None:
            continue
        breached = value <= threshold if metric == "pressure" else value >= threshold
        if breached:
            yield Alert(
                site_id=site.id,
                site_name=site.name,
                metric=metric,
                value=value,
                threshold=threshold,
                severity=_severity(metric, value),
                forecast_time=row.timestamp,
            )

    prediction = prediction_rows.get(row.timestamp)
    if prediction is not None and prediction.no_go_probability >= thresholds["no_go_probability"]:
        yield Alert(
            site_id=site.id,
            site_name=site.name,
            metric="no_go_probability",
            value=prediction.no_go_probability,
            threshold=thresholds["no_go_probability"],
            severity=_severity("no_go_probability", prediction.no_go_probability),
            forecast_time=row.timestamp,
        )
