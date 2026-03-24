import math
from utils.charger_loader import load_chargers


def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two coordinates in km
    """

    R = 6371

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def find_nearby_chargers(origin_lat, origin_lon, radius_km=20):
    chargers = load_chargers()

    nearby = []

    for charger in chargers:
        distance = haversine(
            origin_lat,
            origin_lon,
            charger["lat"],
            charger["lng"]
        )

        if distance <= radius_km:
            charger["distance_km"] = round(distance, 2)
            nearby.append(charger)

    return nearby

def find_chargers_along_route(route_coords, radius_km=5):
    """
    Find chargers within radius_km of the route.
    Samples every 10th coordinate for performance.
    """
    chargers = load_chargers()

    nearby = []
    seen_ids = set()

    # Sample route points for performance (OSRM can return thousands)
    step = max(1, len(route_coords) // 100)
    sampled = route_coords[::step]

    # Always include first and last point
    if route_coords[-1] not in sampled:
        sampled.append(route_coords[-1])

    for charger in chargers:
        if charger["id"] in seen_ids:
            continue

        for idx, coord in enumerate(sampled):

            lon, lat = coord

            distance = haversine(
                lat,
                lon,
                charger["lat"],
                charger["lng"]
            )

            if distance <= radius_km:

                charger["distance_km"] = round(distance, 2)

                nearby.append(charger)
                seen_ids.add(charger["id"])

                break

    return nearby