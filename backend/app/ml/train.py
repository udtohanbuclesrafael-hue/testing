import pickle
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import brier_score_loss, classification_report, roc_auc_score

from ..core.config import settings
from .lstm_backend import (
    DEFAULT_SEQUENCE_LENGTH,
    FEATURE_COLUMNS as LSTM_FEATURE_COLUMNS,
    LSTMConfig,
    LstmNoGoModel,
    build_sequences as lstm_build_sequences,
    load_bundle as lstm_load_bundle,
    save_bundle as lstm_save_bundle,
)


LSTM_ARTIFACT_SUFFIX = "_lstm_bundle.pkl"

REQUIRED_FEATURES = [
    "wind_speed",
    "wave_height",
    "swell_height",
    "swell_period",
    "rainfall",
    "exposure_encoded",
    "wind_wave_interaction",
    "hour",
    "day_of_year",
    "wind_3h_avg",
    "wave_3h_avg",
]


def _lstm_artifact_path() -> str:
    return settings.MODEL_PATH + LSTM_ARTIFACT_SUFFIX


def _classify_risk(probability: float) -> str:
    if probability <= 0.30:
        return "Go"
    if probability <= 0.60:
        return "Caution"
    return "No-Go"


def _build_reasons(features: dict, probability: float) -> list[str]:
    reasons: list[str] = []
    if probability > 0.30:
        if features.get("wind_speed", 0) > 12:
            reasons.append("Strong wind")
        if features.get("wave_height", 0) > 1.2:
            reasons.append("High waves")
        if features.get("rainfall", 0) > 10:
            reasons.append("Heavy rainfall")
        if features.get("swell_height", 0) > 1.0:
            reasons.append("High swell")
    if not reasons:
        reasons.append("Generally favorable conditions")
    return reasons


def _active_backend() -> str:
    return (getattr(settings, "MODEL_BACKEND", "rf") or "rf").lower()


def generate_synthetic_data():
    """Generate synthetic weather and label data for training."""
    print("Generating synthetic dataset...")

    sites = [
        {"name": "Dauin", "lat": 9.12, "lon": 123.26, "exposure": "sheltered"},
        {"name": "Apo Island", "lat": 9.07, "lon": 123.34, "exposure": "exposed"},
        {"name": "Zamboanguita", "lat": 9.23, "lon": 123.20, "exposure": "semi-exposed"},
        {"name": "Siaton", "lat": 9.35, "lon": 123.18, "exposure": "sheltered"},
        {"name": "Bais", "lat": 9.48, "lon": 123.12, "exposure": "sheltered"},
    ]

    start_date = datetime(2025, 1, 1)
    end_date = datetime(2025, 6, 30)
    date_range = pd.date_range(start=start_date, end=end_date, freq="h")

    all_data = []

    for site in sites:
        n_hours = len(date_range)

        np.random.seed(hash(site["name"]) % 2**32)

        hour_of_day = np.array([d.hour for d in date_range])
        day_of_year = np.array([d.timetuple().tm_yday for d in date_range])

        wind_base = 5 + 3 * np.sin(2 * np.pi * hour_of_day / 24)
        wind_seasonal = 2 * np.sin(2 * np.pi * day_of_year / 365)
        wind_noise = np.random.exponential(scale=2, size=n_hours)
        wind_speed = np.clip(wind_base + wind_seasonal + wind_noise, 0, 30)

        wave_height = 0.3 + 0.05 * wind_speed + np.random.exponential(scale=0.2, size=n_hours)
        if site["exposure"] == "exposed":
            wave_height *= 1.5
        elif site["exposure"] == "sheltered":
            wave_height *= 0.7
        wave_height = np.clip(wave_height, 0, 4)

        swell_height = np.random.exponential(scale=0.5, size=n_hours)
        swell_period = np.random.normal(loc=8, scale=2, size=n_hours)
        swell_period = np.clip(swell_period, 3, 15)

        rainfall = np.zeros(n_hours)
        storm_events = np.random.choice(n_hours, size=20, replace=False)
        for event in storm_events:
            duration = np.random.randint(2, 12)
            intensity = np.random.uniform(5, 30)
            end_event = min(event + duration, n_hours)
            rainfall[event:end_event] = intensity

        no_go = np.zeros(n_hours, dtype=int)

        no_go[(wind_speed > 15) & (np.random.random(n_hours) > 0.1)] = 1
        no_go[(wave_height > 1.5) & (np.random.random(n_hours) > 0.1)] = 1
        no_go[(rainfall > 15) & (np.random.random(n_hours) > 0.15)] = 1

        moderate_risk = (wind_speed > 10) | (wave_height > 1.0)
        no_go[moderate_risk & (np.random.random(n_hours) > 0.85)] = 1

        noise_mask = np.random.random(n_hours) < 0.03
        no_go[noise_mask] = 1 - no_go[noise_mask]

        for i, timestamp in enumerate(date_range):
            all_data.append({
                "site_name": site["name"],
                "timestamp": timestamp,
                "wind_speed": wind_speed[i],
                "wave_height": wave_height[i],
                "swell_height": swell_height[i],
                "swell_period": swell_period[i],
                "rainfall": rainfall[i],
                "exposure": site["exposure"],
                "no_go_label": no_go[i],
            })

    df = pd.DataFrame(all_data)
    df.to_csv("synthetic_training_data.csv", index=False)
    print(f"Generated {len(df)} synthetic records")
    return df


def prepare_features(df):
    """Prepare features for the random-forest model."""
    exposure_map = {"sheltered": 0, "semi-exposed": 1, "exposed": 2}
    df["exposure_encoded"] = df["exposure"].map(exposure_map)

    df["wind_wave_interaction"] = df["wind_speed"] * df["wave_height"]
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_year"] = df["timestamp"].dt.dayofyear

    df = df.sort_values(["site_name", "timestamp"])
    df["wind_3h_avg"] = df.groupby("site_name")["wind_speed"].transform(
        lambda x: x.rolling(3, min_periods=1).mean()
    )
    df["wave_3h_avg"] = df.groupby("site_name")["wave_height"].transform(
        lambda x: x.rolling(3, min_periods=1).mean()
    )

    return df[REQUIRED_FEATURES], df["no_go_label"]


def _load_synthetic_data() -> pd.DataFrame:
    try:
        df = pd.read_csv("synthetic_training_data.csv")
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        return df
    except FileNotFoundError:
        print("No synthetic data found. Generating first...")
        return generate_synthetic_data()


def train_model(backend: str | None = None) -> dict:
    """Train the selected backend and persist its artifact."""
    chosen = (backend or _active_backend() or "rf").lower()
    if chosen == "lstm":
        return _train_lstm()
    if chosen not in ("rf", "random_forest"):
        raise ValueError(f"Unknown MODEL_BACKEND: {chosen!r}")
    return _train_random_forest()


def _train_random_forest() -> dict:
    print("Training RandomForest model...")
    df = _load_synthetic_data()
    X, y = prepare_features(df)

    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        class_weight="balanced",
        random_state=42,
    )
    model.fit(X_train, y_train)

    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)

    print("\nRandomForest Evaluation:")
    print(classification_report(y_test, y_pred))
    auc = float(roc_auc_score(y_test, y_pred_proba))
    brier = float(brier_score_loss(y_test, y_pred_proba))
    print(f"ROC-AUC: {auc:.3f}")
    print(f"Brier Score: {brier:.3f}")

    with open(settings.MODEL_PATH, "wb") as f:
        pickle.dump(model, f)

    print(f"Model saved to {settings.MODEL_PATH}")
    return {
        "backend": "rf",
        "model_path": settings.MODEL_PATH,
        "metrics": {
            "roc_auc": round(auc, 4),
            "brier": round(brier, 4),
            "test_rows": int(len(y_test)),
        },
    }


def _train_lstm() -> dict:
    print("Training LSTM model...")
    df = _load_synthetic_data()

    df["exposure_encoded"] = df["exposure"].map({"sheltered": 0, "semi-exposed": 1, "exposed": 2})
    df["wind_wave_interaction"] = df["wind_speed"] * df["wave_height"]
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_year"] = df["timestamp"].dt.dayofyear
    df = df.sort_values(["site_name", "timestamp"])
    df["wind_3h_avg"] = df.groupby("site_name")["wind_speed"].transform(
        lambda x: x.rolling(3, min_periods=1).mean()
    )
    df["wave_3h_avg"] = df.groupby("site_name")["wave_height"].transform(
        lambda x: x.rolling(3, min_periods=1).mean()
    )

    sequence_length = DEFAULT_SEQUENCE_LENGTH
    X_seq, y, _ = lstm_build_sequences(
        df,
        sequence_length=sequence_length,
        feature_columns=LSTM_FEATURE_COLUMNS,
    )

    split_idx = int(len(X_seq) * 0.8)
    X_train, X_test = X_seq[:split_idx], X_seq[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    config = LSTMConfig(sequence_length=sequence_length)
    model = LstmNoGoModel(config)
    history = model.fit(X_train, y_train, verbose=False)

    probs = model.predict_proba(X_test)
    preds = (probs >= 0.5).astype(int)
    auc = float(roc_auc_score(y_test, probs))
    brier = float(brier_score_loss(y_test, probs))
    print("\nLSTM Evaluation:")
    print(classification_report(y_test, preds))
    print(f"ROC-AUC: {auc:.3f}")
    print(f"Brier Score: {brier:.3f}")
    print(f"Final epoch loss: {history[-1]['loss']:.4f}")

    artifact_path = _lstm_artifact_path()
    lstm_save_bundle(model, artifact_path)
    print(f"LSTM bundle saved to {artifact_path}")
    return {
        "backend": "lstm",
        "model_path": artifact_path,
        "metrics": {
            "roc_auc": round(auc, 4),
            "brier": round(brier, 4),
            "test_rows": int(len(y_test)),
            "sequence_length": sequence_length,
            "epochs": config.epochs,
            "final_loss": float(history[-1]["loss"]),
        },
    }


def predict_no_go(features_dict):
    """Predict the no-go probability for a single feature row."""
    backend = _active_backend()
    if backend == "lstm":
        return _predict_lstm(features_dict)
    return _predict_random_forest(features_dict)


def _predict_random_forest(features_dict) -> dict:
    try:
        with open(settings.MODEL_PATH, "rb") as f:
            model = pickle.load(f)
    except FileNotFoundError:
        print("Model not found. Training first...")
        _train_random_forest()
        with open(settings.MODEL_PATH, "rb") as f:
            model = pickle.load(f)

    feature_df = pd.DataFrame([features_dict])
    for feat in REQUIRED_FEATURES:
        if feat not in feature_df.columns:
            feature_df[feat] = 0

    proba = float(model.predict_proba(feature_df[REQUIRED_FEATURES])[0, 1])
    return {
        "no_go_probability": round(proba, 3),
        "risk_class": _classify_risk(proba),
        "reasons": _build_reasons(features_dict, proba),
    }


def _predict_lstm(features_dict) -> dict:
    artifact_path = _lstm_artifact_path()
    try:
        model = lstm_load_bundle(artifact_path)
    except FileNotFoundError:
        print("LSTM model not found. Training first...")
        _train_lstm()
        model = lstm_load_bundle(artifact_path)

    sequence_length = model.config.sequence_length
    feature_values = [float(features_dict.get(col, 0.0)) for col in model.feature_columns]
    seq = np.tile(feature_values, (sequence_length, 1))
    proba = float(model.predict_proba_single(seq))
    return {
        "no_go_probability": round(proba, 3),
        "risk_class": _classify_risk(proba),
        "reasons": _build_reasons(features_dict, proba),
    }
