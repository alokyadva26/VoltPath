from fastapi import APIRouter
import json
from pathlib import Path

router = APIRouter()

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "ev_policy_data.json"

@router.get("/api/state-ev-vs-chargers")
def get_state_ev_vs_chargers():
    """
    Return EV vs Chargers count for all states and calculate gap_score.
    """
    try:
        with open(DATA_PATH, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        return {"states": []}

    states = []
    
    for state, info in data.items():
        evs = info.get("evs_registered", 0)
        chargers = info.get("active_chargers", 0)
        gap_score = round(evs / chargers, 1) if chargers > 0 else 0
        
        states.append({
            "state": state,
            "ev_count": evs,
            "chargers": chargers,
            "gap_score": gap_score
        })
        
    return {"states": states}
