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
    chargers = load_chargers()

    nearby = []

    for charger in chargers:
        for coord in route_coords:

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

                break

    return nearby