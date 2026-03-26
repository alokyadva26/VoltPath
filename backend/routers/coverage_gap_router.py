"""
Coverage Gap API router — identifies underserved EV charging areas.
Returns gap_score = evs_registered / active_chargers for each state.
"""

import json
from pathlib import Path
from fastapi import APIRouter

router = APIRouter()

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "ev_policy_data.json"

# Approximate lat/lng for Indian state capitals / UT centers
STATE_COORDS = {
    "Delhi": (28.6139, 77.2090),
    "Maharashtra": (19.0760, 72.8777),
    "Karnataka": (12.9716, 77.5946),
    "Tamil Nadu": (13.0827, 80.2707),
    "Gujarat": (23.0225, 72.5714),
    "Telangana": (17.3850, 78.4867),
    "Uttar Pradesh": (26.8467, 80.9462),
    "Rajasthan": (26.9124, 75.7873),
    "Kerala": (8.5241, 76.9366),
    "West Bengal": (22.5726, 88.3639),
    "Madhya Pradesh": (23.2599, 77.4126),
    "Punjab": (30.7333, 76.7794),
    "Haryana": (28.4595, 77.0266),
    "Bihar": (25.6093, 85.1376),
    "Odisha": (20.2961, 85.8245),
    "Assam": (26.1445, 91.7362),
    "Jharkhand": (23.3441, 85.3096),
    "Chhattisgarh": (21.2514, 81.6296),
    "Uttarakhand": (30.3165, 78.0322),
    "Himachal Pradesh": (31.1048, 77.1734),
    "Goa": (15.4909, 73.8278),
    "Andhra Pradesh": (17.6868, 83.2185),
    "Manipur": (24.8170, 93.9368),
    "Meghalaya": (25.5788, 91.8933),
    "Tripura": (23.8315, 91.2868),
    "Nagaland": (25.6751, 94.1086),
    "Mizoram": (23.7271, 92.7176),
    "Arunachal Pradesh": (27.0844, 93.6053),
    "Sikkim": (27.3389, 88.6065),
    "Jammu and Kashmir": (34.0837, 74.7973),
    "Ladakh": (34.1526, 77.5771),
    "Chandigarh": (30.7333, 76.7794),
}


def load_policy_data():
    with open(DATA_PATH, "r") as f:
        return json.load(f)


@router.get("/coverage-gap")
def get_coverage_gap():
    """
    Return EV charging coverage gap data for all states.
    gap_score = evs_registered / active_chargers (higher = worse coverage).
    """
    data = load_policy_data()
    locations = []

    from app.services.ev_data_service import get_real_ev_data
    real_data_map = get_real_ev_data()

    for state, info in data.items():
        real_data = real_data_map.get(state)
        if real_data:
            evs = real_data["ev_count"]
            chargers = real_data["chargers"]
        else:
            evs = info["evs_registered"]
            chargers = info["active_chargers"]
            
        gap_score = round(evs / chargers, 1) if chargers > 0 else 0

        lat, lng = STATE_COORDS.get(state, (20.5937, 78.9629))  # fallback: India center

        locations.append({
            "state": state,
            "lat": lat,
            "lng": lng,
            "gap_score": gap_score,
            "evs_registered": evs,
            "active_chargers": chargers,
        })

    # Sort by gap_score descending (worst coverage first)
    locations.sort(key=lambda x: x["gap_score"], reverse=True)

    return {"locations": locations}
