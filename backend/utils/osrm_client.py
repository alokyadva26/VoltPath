import requests


def get_route_data(origin, destination):
    """
    Fetch full route data from OSRM
    """

    lon1, lat1 = origin[1], origin[0]
    lon2, lat2 = destination[1], destination[0]

    url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson"

    response = requests.get(url)
    data = response.json()

    route = data["routes"][0]

    distance_km = route["distance"] / 1000

    geometry = route["geometry"]["coordinates"]

    return {
        "distance_km": round(distance_km, 2),
        "geometry": geometry
    }