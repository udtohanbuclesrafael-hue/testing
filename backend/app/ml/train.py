import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import pickle
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, roc_auc_score, brier_score_loss
from ..core.database import SessionLocal, engine
from ..models.site import Site, WeatherForecast, Prediction, ModelRegistry
from ..core.config import settings


def generate_synthetic_data():
    """Generate synthetic weather and label data for training."""
    print("Generating synthetic dataset...")
    
    # Create site profiles
    sites = [
        {"name": "Dauin", "lat": 9.12, "lon": 123.26, "exposure": "sheltered"},
        {"name": "Apo Island", "lat": 9.07, "lon": 123.34, "exposure": "exposed"},
        {"name": "Zamboanguita", "lat": 9.23, "lon": 123.20, "exposure": "semi-exposed"},
        {"name": "Siaton", "lat": 9.35, "lon": 123.18, "exposure": "sheltered"},
        {"name": "Bais", "lat": 9.48, "lon": 123.12, "exposure": "sheltered"},
    ]
    
    # Generate 6 months of hourly data
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2025, 6, 30)
    date_range = pd.date_range(start=start_date, end=end_date, freq='h')
    
    all_data = []
    
    for site in sites:
        n_hours = len(date_range)
        
        # Simulate weather patterns
        np.random.seed(hash(site["name"]) % 2**32)
        
        # Base wind speed with daily and seasonal variation
        hour_of_day = np.array([d.hour for d in date_range])
        day_of_year = np.array([d.timetuple().tm_yday for d in date_range])
        
        wind_base = 5 + 3 * np.sin(2 * np.pi * hour_of_day / 24)  # Daily cycle
        wind_seasonal = 2 * np.sin(2 * np.pi * day_of_year / 365)  # Seasonal
        wind_noise = np.random.exponential(scale=2, size=n_hours)
        wind_speed = np.clip(wind_base + wind_seasonal + wind_noise, 0, 30)
        
        # Wave height (correlated with wind)
        wave_height = 0.3 + 0.05 * wind_speed + np.random.exponential(scale=0.2, size=n_hours)
        if site["exposure"] == "exposed":
            wave_height *= 1.5  # Exposed sites have higher waves
        elif site["exposure"] == "sheltered":
            wave_height *= 0.7
        wave_height = np.clip(wave_height, 0, 4)
        
        # Swell
        swell_height = np.random.exponential(scale=0.5, size=n_hours)
        swell_period = np.random.normal(loc=8, scale=2, size=n_hours)
        swell_period = np.clip(swell_period, 3, 15)
        
        # Rainfall (sporadic events)
        rainfall = np.zeros(n_hours)
        storm_events = np.random.choice(n_hours, size=20, replace=False)
        for event in storm_events:
            duration = np.random.randint(2, 12)
            intensity = np.random.uniform(5, 30)
            end_event = min(event + duration, n_hours)
            rainfall[event:end_event] = intensity
        
        # Generate labels using rule-based approach with noise
        no_go = np.zeros(n_hours, dtype=int)
        
        # Rule 1: High wind
        no_go[(wind_speed > 15) & (np.random.random(n_hours) > 0.1)] = 1
        
        # Rule 2: High waves
        no_go[(wave_height > 1.5) & (np.random.random(n_hours) > 0.1)] = 1
        
        # Rule 3: Heavy rain
        no_go[(rainfall > 15) & (np.random.random(n_hours) > 0.15)] = 1
        
        # Rule 4: Combined moderate conditions
        moderate_risk = (wind_speed > 10) | (wave_height > 1.0)
        no_go[moderate_risk & (np.random.random(n_hours) > 0.85)] = 1
        
        # Add some random noise (occasional false labels)
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
                "no_go_label": no_go[i]
            })
    
    df = pd.DataFrame(all_data)
    df.to_csv("synthetic_training_data.csv", index=False)
    print(f"Generated {len(df)} synthetic records")
    return df


def prepare_features(df):
    """Prepare features for ML model."""
    # Encode exposure
    exposure_map = {"sheltered": 0, "semi-exposed": 1, "exposed": 2}
    df["exposure_encoded"] = df["exposure"].map(exposure_map)
    
    # Feature engineering
    df["wind_wave_interaction"] = df["wind_speed"] * df["wave_height"]
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_year"] = df["timestamp"].dt.dayofyear
    
    # Rolling averages
    df = df.sort_values(["site_name", "timestamp"])
    df["wind_3h_avg"] = df.groupby("site_name")["wind_speed"].transform(
        lambda x: x.rolling(3, min_periods=1).mean()
    )
    df["wave_3h_avg"] = df.groupby("site_name")["wave_height"].transform(
        lambda x: x.rolling(3, min_periods=1).mean()
    )
    
    feature_cols = [
        "wind_speed", "wave_height", "swell_height", "swell_period",
        "rainfall", "exposure_encoded", "wind_wave_interaction",
        "hour", "day_of_year", "wind_3h_avg", "wave_3h_avg"
    ]
    
    return df[feature_cols], df["no_go_label"]


def train_model():
    """Train the ML model on synthetic data."""
    print("Training model...")
    
    # Load synthetic data
    try:
        df = pd.read_csv("synthetic_training_data.csv")
        df["timestamp"] = pd.to_datetime(df["timestamp"])
    except FileNotFoundError:
        print("No synthetic data found. Generating first...")
        df = generate_synthetic_data()
    
    X, y = prepare_features(df)
    
    # Time-based split (first 80% train, last 20% test)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    # Train Random Forest
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        class_weight="balanced",
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = model.predict(X_test)
    
    print("\nModel Evaluation:")
    print(classification_report(y_test, y_pred))
    print(f"ROC-AUC: {roc_auc_score(y_test, y_pred_proba):.3f}")
    print(f"Brier Score: {brier_score_loss(y_test, y_pred_proba):.3f}")
    
    # Save model
    with open(settings.MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    
    print(f"Model saved to {settings.MODEL_PATH}")
    print("Skipping database registration (tables not initialized yet)")
    
    return model


def predict_no_go(features_dict):
    """Make a prediction for new data."""
    try:
        with open(settings.MODEL_PATH, "rb") as f:
            model = pickle.load(f)
    except FileNotFoundError:
        print("Model not found. Training first...")
        model = train_model()
    
    # Convert to DataFrame
    feature_df = pd.DataFrame([features_dict])
    
    # Ensure all required features exist
    required_features = [
        "wind_speed", "wave_height", "swell_height", "swell_period",
        "rainfall", "exposure_encoded", "wind_wave_interaction",
        "hour", "day_of_year", "wind_3h_avg", "wave_3h_avg"
    ]
    
    for feat in required_features:
        if feat not in feature_df.columns:
            feature_df[feat] = 0
    
    proba = model.predict_proba(feature_df[required_features])[0, 1]
    
    # Determine risk class
    if proba <= 0.30:
        risk_class = "Go"
    elif proba <= 0.60:
        risk_class = "Caution"
    else:
        risk_class = "No-Go"
    
    # Generate reasons
    reasons = []
    if features_dict.get("wind_speed", 0) > 12:
        reasons.append("Strong wind")
    if features_dict.get("wave_height", 0) > 1.2:
        reasons.append("High waves")
    if features_dict.get("rainfall", 0) > 10:
        reasons.append("Heavy rainfall")
    if features_dict.get("swell_height", 0) > 1.0:
        reasons.append("High swell")
    if not reasons:
        reasons.append("Generally favorable conditions")
    
    return {
        "no_go_probability": round(proba, 3),
        "risk_class": risk_class,
        "reasons": reasons
    }
