def plan_charging_stop(remaining_soc, chargers):
    """
    Decide if charging stop is required
    """

    if remaining_soc >= 20:
        return {
            "charging_needed": False,
            "recommended_stop": None
        }

    if not chargers:
        return {
            "charging_needed": True,
            "recommended_stop": None
        }

    # choose closest charger
    best_charger = min(chargers, key=lambda c: c["distance_km"])

    return {
        "charging_needed": True,
        "recommended_stop": best_charger
    }