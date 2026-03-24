import json
from pathlib import Path
from fastapi import APIRouter, Query

router = APIRouter()

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "ev_policy_data.json"


def load_policy_data():
    with open(DATA_PATH, "r") as f:
        return json.load(f)


@router.get("/policy")
def get_policy(state: str = Query(default="Delhi")):
    """
    Return EV policy analytics for a given Indian state.
    """
    data = load_policy_data()

    if state not in data:
        return {"error": f"State '{state}' not found", "available_states": sorted(data.keys())}

    state_data = data[state]

    evs = state_data["evs_registered"]
    chargers = state_data["active_chargers"]
    ratio = round(evs / chargers) if chargers > 0 else 0

    return {
        "state": state,
        "evs_registered": evs,
        "active_chargers": chargers,
        "vehicle_charger_ratio": ratio,
        "desert_zones": state_data["desert_zones"],
        "growth_pct": state_data["growth_pct"],
        "charger_growth": state_data["charger_growth"],
        "priority_zones": state_data["priority_zones"],
        "hourly_demand": state_data["hourly_demand"],
    }


@router.get("/policy/states")
def get_states():
    """
    Return list of all available states.
    """
    data = load_policy_data()
    return {"states": sorted(data.keys())}
