# SeaSID

Hyperlocal diveability / no-go forecasting for Negros Oriental, Philippines.

SeaSID combines public weather and marine forecasts with a machine-learning
classifier to estimate the probability that a dive site will be unsafe over a
72-hour window, and surfaces a discrete risk class (`Go` / `Caution` / `No-Go`)
with explanatory reasons.

> **Disclaimer.** SeaSID provides decision-support forecasts only. It does not
> replace local judgment, official weather warnings, or on-site safety
> assessments by qualified dive professionals.

---

## Features

- 5 MVP dive sites seeded on first start (Dauin, Apo Island, Zamboanguita,
  Siaton, Bais).
- 72-hour hourly risk forecasts with `no_go_probability` and `risk_class`.
- Regional summary endpoint for map / dashboard views.
- Open-Meteo weather + marine ingest, with a pluggable ML model
   (`RandomForestClassifier` baseline; LSTM backend available via `MODEL_BACKEND=lstm`).
- Feedback endpoint for divers / operators to record actual conditions.
- React + Leaflet map UI and a 72-hour recharts forecast chart.

## Stack

| Layer    | Choice                                                      |
| -------- | ----------------------------------------------------------- |
| Backend  | FastAPI 0.115, SQLAlchemy 2, Pydantic v2, SQLite (default)  |
| ML       | scikit-learn (RandomForest), pandas, numpy                  |
|          | LSTM backend (24h sliding window, NumPy/SciPy implementation in `app/ml/lstm_backend.py`) |
| Frontend | React 18, Vite 5, react-query, recharts, react-leaflet      |
| Styling  | Tailwind CSS 3                                              |
| Data     | Open-Meteo (`/v1/forecast` + marine-api)                   |

## Repository layout

```
.
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI routers (sites, forecast, admin)
│   │   ├── core/           # config + database
│   │   ├── ml/             # synthetic data + training + predict_no_go
│   │   ├── models/         # SQLAlchemy ORM
│   │   ├── schemas/        # Pydantic DTOs
│   │   └── services/       # weather + prediction services
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/            # axios client
│   │   ├── components/     # MapView, SiteCard, RiskBadge, ForecastChart
│   │   ├── pages/          # Home, SiteDetail, About
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── .gitignore
└── LICENSE                 # MIT
```

## Getting started

### Prerequisites

- Python 3.10+
- Node 18+ / npm 9+

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Optional: override defaults via .env (DATABASE_URL, MODEL_PATH, etc.)
uvicorn app.main:app --reload --port 8000
```

On first start the lifespan handler creates the SQLite DB (`./seasid.db`) and
seeds the MVP sites.

### Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:5173, /api proxied to http://localhost:8000
```

## API

All routes are mounted under `/api/v1` (see `backend/app/main.py:50-52`).

| Method | Path                                | Purpose                          |
| ------ | ----------------------------------- | -------------------------------- |
| GET    | `/health`                           | Liveness check                   |
| GET    | `/api/v1/sites`                     | List active sites                |
| GET    | `/api/v1/sites/{site_id}`           | Get a site                       |
| POST   | `/api/v1/sites`                     | Create a site                    |
| GET    | `/api/v1/sites/{site_id}/forecast`  | 72h hourly forecast              |
| GET    | `/api/v1/forecast/summary`          | Next future prediction per site  |
| POST   | `/api/v1/ingest/weather`            | Trigger Open-Meteo ingest        |
| POST   | `/api/v1/predict/run`               | Score latest forecasts           |
| POST   | `/api/v1/feedback`                  | Persist operator feedback        |
| POST   | `/api/v1/ml/train`                  | Train / retrain the model        |

Interactive docs at `http://localhost:8000/docs`.

## ML pipeline

SeaSID ships with two model backends sharing the same prediction API:

- `rf` (default): `RandomForestClassifier` trained on single-row engineered
  features (`backend/app/ml/train.py`).
- `lstm`: a single-layer LSTM with sigmoid head (`backend/app/ml/lstm_backend.py`).
  Trained on 24-hour sliding windows per site with z-score normalization; an
  LSTM backend fits the time-series nature of the 72-hour forecast window.

Select the backend via the `MODEL_BACKEND` environment variable or by passing
`?backend=lstm` (or `?backend=rf`) to `/api/v1/ml/train`. To bootstrap from scratch:

```bash
curl -X POST 'http://localhost:8000/api/v1/ml/train?backend=lstm'   # generates data + trains LSTM
curl -X POST http://localhost:8000/api/v1/ingest/weather             # pulls Open-Meteo
curl -X POST http://localhost:8000/api/v1/predict/run                # scores the window
```

Predictions replace the previous 72-hour window on each run (idempotent). The
artifacts (`app/ml/model.pkl`, `app/ml/model.pkl_lstm_bundle.pkl`, and
`synthetic_training_data.csv`) are git-ignored.

## Configuration

Backend settings live in `backend/app/core/config.py` and read from
environment / `.env`:

| Variable                  | Default                          |
| ------------------------- | -------------------------------- |
| `DATABASE_URL`            | `sqlite:///./seasid.db`          |
| `MODEL_PATH`              | `app/ml/model.pkl`               |
| `OPEN_METEO_WEATHER_URL`  | `https://api.open-meteo.com/v1/forecast`   |
| `OPEN_METEO_MARINE_URL`   | `https://marine-api.open-meteo.com/v1/marine` |
| `CORS_ALLOW_ORIGINS`      | (CSV; dev defaults: localhost)   |

> The seed site coordinates sit on the coast of Negros Oriental and Open-Meteo's
> marine API rejects some swell fields for certain regions (this is an upstream
> bug — even the API's own docs example currently returns `HTTP 400` when any
> `swell_*` parameter is included). The ingest pipeline now fetches marine
> fields individually and stores `null` for the failing ones, so predictions
> still run on whatever data is available (wind, rain, pressure, temperature,
> wave height, sea-surface temperature). Swell-driven signals will return when
> the upstream API is fixed; in the meantime you can supply real swell data
> via a different source.

## License

MIT — see [LICENSE](LICENSE).
