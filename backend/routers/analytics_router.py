from fastapi import APIRouter
import json
from pathlib import Path
from app.services.ev_data_service import get_real_ev_data

router = APIRouter()

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "ev_policy_data.json"

@router.get("/api/state-ev-vs-chargers")
def get_state_ev_vs_chargers():
    """
    Return EV vs Chargers count for all states and calculate gap_score.
    Uses real CSV dataset so the UI gets real numbers.
    """
    try:
        with open(DATA_PATH, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        data = {}

    real_data_map = get_real_ev_data()
    states = []
    
    # We want to use states present in the real_data_map, 
    # but also fallback to data.items() if something is missing.
    # Actually, iterate real_data_map directly since it's the source of truth now.
    for state, info in real_data_map.items():
        evs = info["ev_count"]
        chargers = info["chargers"]
        gap_score = round(evs / chargers, 1) if chargers > 0 else 0
        
        states.append({
            "state": state,
            "ev_count": evs,
            "chargers": chargers,
            "gap_score": gap_score
        })
        
    return {"states": states}

@router.get("/api/ev-vs-chargers")
def get_raw_ev_vs_chargers():
    """
    Explicit endpoint returning pure list format:
    [{"state":"Delhi","ev":330000,"chargers":1200}, ...]
    """
    real_data_map = get_real_ev_data()
    result = []
    for state, info in real_data_map.items():
        result.append({
            "state": state,
            "ev": info["ev_count"],
            "chargers": info["chargers"]
        })
    return result
