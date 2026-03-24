def estimate_soc_after_distance(initial_soc, distance_km, vehicle_range_km):
    """
    Estimate remaining battery percentage after travelling distance.
    """

    battery_used_percent = (distance_km / vehicle_range_km) * 100

    remaining_soc = initial_soc - battery_used_percent

    if remaining_soc < 0:
        remaining_soc = 0

    return round(remaining_soc, 2)