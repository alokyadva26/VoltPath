"""
Forecast API router — serves 24-hour EV charging demand predictions.
Loads the trained XGBoost model once at startup for fast inference.
"""

import numpy as np
import joblib
import json
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Query

router = APIRouter()

MODEL_DIR = Path(__file__).resolve().parents[1] / "models"

# Load model, encoder, and metadata once at module import time
_model = None
_encoder = None
_meta = None
_state_params = None


def _load_assets():
    global _model, _encoder, _meta, _state_params

    if _model is not None:
        return

    _model = joblib.load(MODEL_DIR / "xgboost_demand_v1.pkl")
    _encoder = joblib.load(MODEL_DIR / "state_encoder.pkl")

    with open(MODEL_DIR / "model_meta.json", "r") as f:
        _meta = json.load(f)

    # Load state params for inference context
    data_path = Path(__file__).resolve().parents[2] / "data" / "ev_policy_data.json"
    with open(data_path, "r") as f:
        policy_data = json.load(f)

    _state_params = {}
    for state, info in policy_data.items():
        evs = info["evs_registered"]
        chargers = info["active_chargers"]
        _state_params[state] = {
            "ev_count_state": evs,
            "chargers": chargers,
            "vehicle_charger_ratio": round(evs / max(chargers, 1), 1),
        }


@router.get("/forecast")
def get_forecast(state: str = Query(default="Delhi")):
    """
    Return 24-hour EV charging demand forecast for a given state.
    Uses the pre-trained XGBoost model.
    """
    _load_assets()

    if state not in _state_params:
        return {
            "error": f"State '{state}' not found",
            "available_states": sorted(_state_params.keys()),
        }

    # Encode the state
    try:
        state_encoded = _encoder.transform([state])[0]
    except ValueError:
        return {"error": f"State '{state}' was not in training data"}

    params = _state_params[state]
    now = datetime.now()
    day_num = now.weekday()  # 0=Monday
    is_weekend = 1 if day_num >= 5 else 0

    # Estimate temperature (simple seasonal model)
    day_of_year = now.timetuple().tm_yday
    # Base temps per category
    temp_bases = {
        "hot": 33, "warm": 28, "mild": 24, "cool": 18, "cold": 12
    }
    # Rough classification
    if params["ev_count_state"] > 400000:
        temp_base = 29
    elif params["ev_count_state"] > 100000:
        temp_base = 28
    else:
        temp_base = 24

    import math
    seasonal_temp = temp_base + 5 * math.sin(2 * math.pi * day_of_year / 365 - math.pi / 2)

    # Build feature rows for all 24 hours
    predictions = []
    for hour in range(24):
        hour_sin = np.sin(2 * np.pi * hour / 24)
        hour_cos = np.cos(2 * np.pi * hour / 24)
        day_sin = np.sin(2 * np.pi * day_num / 7)
        day_cos = np.cos(2 * np.pi * day_num / 7)

        # Slight temperature variation by hour
        temp = seasonal_temp + 3 * math.sin(2 * math.pi * (hour - 6) / 24)
        temp = round(temp, 1)

        features = np.array([[
            hour, hour_sin, hour_cos,
            day_num, day_sin, day_cos,
            is_weekend,
            temp,
            params["ev_count_state"],
            params["chargers"],
            params["vehicle_charger_ratio"],
            state_encoded
        ]])

        pred = _model.predict(features)[0]
        predictions.append(max(1, round(float(pred))))

    return {
        "state": state,
        "date": now.strftime("%Y-%m-%d"),
        "day": now.strftime("%A"),
        "is_weekend": bool(is_weekend),
        "hours": list(range(24)),
        "demand": predictions,
        "model": {
            "type": "XGBoost",
            "r2": _meta["r2"],
            "mae": _meta["mae"],
        },
    }
