from fastapi import APIRouter
from models.schemas import RouteRequest
from utils.vehicle_loader import get_vehicle
from utils.soc_engine import estimate_soc_after_distance
from utils.osrm_client import get_route_data
from utils.charger_finder import find_chargers_along_route
from utils.charging_planner import plan_charging_stop

router = APIRouter()


@router.post("/route")
def calculate_route(data: RouteRequest):

    vehicle = get_vehicle(data.vehicle)

    if not vehicle:
        return {"error": "Vehicle not found"}

    route_data = get_route_data(
        data.origin,
        data.destination
    )

    distance_km = route_data["distance_km"]

    remaining_soc = estimate_soc_after_distance(
        data.soc,
        distance_km,
        vehicle["range_km"]
    )

    chargers = find_chargers_along_route(
        route_data["geometry"]
    )

    charging_plan = plan_charging_stop(
        remaining_soc,
        chargers
    )

    return {
        "vehicle": vehicle["name"],
        "distance_km": distance_km,
        "remaining_soc": remaining_soc,
        "geometry": {
            "coordinates": route_data["geometry"]
        },
        "chargers_along_route": chargers,
        "charging_plan": charging_plan
    }