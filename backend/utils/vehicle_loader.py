import json
from pathlib import Path


def load_vehicles():
    data_path = Path(__file__).resolve().parents[2] / "data" / "ev_vehicles.json"

    with open(data_path, "r") as f:
        vehicles = json.load(f)

    return vehicles


def get_vehicle(vehicle_id: str):
    vehicles = load_vehicles()

    for v in vehicles:
        if v["id"] == vehicle_id:
            return v

    return None