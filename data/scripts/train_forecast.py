"""
Train XGBoost demand forecasting model for EV charging sessions.
Reads the synthetic dataset and produces a saved model.
"""

import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder
import joblib
from pathlib import Path
import json


def train():
    base_dir = Path(__file__).resolve().parents[1]
    dataset_path = base_dir / "ev_state_demand_dataset.csv"
    model_dir = base_dir.parent / "backend" / "models"
    model_dir.mkdir(exist_ok=True)
    model_path = model_dir / "xgboost_demand_v1.pkl"
    encoder_path = model_dir / "state_encoder.pkl"

    print("Loading dataset...")
    df = pd.read_csv(dataset_path)
    print(f"  Rows: {len(df):,}")
    print(f"  States: {df['state'].nunique()}")
    print(f"  Columns: {list(df.columns)}")

    # Encode state as numeric
    state_encoder = LabelEncoder()
    df["state_encoded"] = state_encoder.fit_transform(df["state"])

    # Encode day_of_week
    day_map = {
        "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
        "Friday": 4, "Saturday": 5, "Sunday": 6
    }
    df["day_num"] = df["day_of_week"].map(day_map)

    # Cyclical hour encoding (sin/cos for continuity at midnight)
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)

    # Cyclical day encoding
    df["day_sin"] = np.sin(2 * np.pi * df["day_num"] / 7)
    df["day_cos"] = np.cos(2 * np.pi * df["day_num"] / 7)

    # Feature matrix
    features = [
        "hour", "hour_sin", "hour_cos",
        "day_num", "day_sin", "day_cos",
        "is_weekend",
        "temperature",
        "ev_count_state", "chargers", "vehicle_charger_ratio",
        "state_encoded"
    ]
    target = "charging_sessions"

    X = df[features]
    y = df[target]

    print(f"\nFeature matrix: {X.shape}")
    print(f"Target stats: mean={y.mean():.1f}, std={y.std():.1f}, min={y.min()}, max={y.max()}")

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42
    )

    print(f"\nTrain set: {len(X_train):,} rows")
    print(f"Test set:  {len(X_test):,} rows")

    # Train XGBoost
    print("\nTraining XGBoost model...")
    model = xgb.XGBRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        n_jobs=-1,
        verbosity=1
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50
    )

    # Evaluate
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print(f"\n{'='*50}")
    print(f"Model Evaluation:")
    print(f"  MAE:  {mae:.2f} sessions")
    print(f"  RMSE: {rmse:.2f} sessions")
    print(f"  R²:   {r2:.4f}")
    print(f"{'='*50}")

    # Feature importance
    importance = dict(zip(features, model.feature_importances_))
    print("\nFeature Importance:")
    for feat, imp in sorted(importance.items(), key=lambda x: -x[1]):
        print(f"  {feat:30s} {imp:.4f}")

    # Save model and encoder
    joblib.dump(model, model_path)
    joblib.dump(state_encoder, encoder_path)

    print(f"\nModel saved to: {model_path}")
    print(f"Encoder saved to: {encoder_path}")

    # Also save feature list for inference
    meta_path = model_dir / "model_meta.json"
    with open(meta_path, "w") as f:
        json.dump({
            "features": features,
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "r2": round(r2, 4),
            "states": list(state_encoder.classes_),
        }, f, indent=2)
    print(f"Metadata saved to: {meta_path}")


if __name__ == "__main__":
    train()
