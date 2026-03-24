"""
Generate synthetic EV charging demand dataset for all Indian states.
Creates hourly data with realistic demand patterns.
"""

import csv
import random
import math
from datetime import datetime, timedelta
from pathlib import Path

# State-level EV ecosystem parameters
STATES = {
    "Delhi":              {"ev_count": 330000, "chargers": 1200, "temp_base": 28, "demand_scale": 1.0},
    "Maharashtra":        {"ev_count": 520000, "chargers": 1850, "temp_base": 30, "demand_scale": 1.15},
    "Karnataka":          {"ev_count": 410000, "chargers": 1450, "temp_base": 27, "demand_scale": 1.05},
    "Tamil Nadu":         {"ev_count": 380000, "chargers": 1100, "temp_base": 32, "demand_scale": 0.95},
    "Gujarat":            {"ev_count": 290000, "chargers": 980,  "temp_base": 33, "demand_scale": 0.85},
    "Telangana":          {"ev_count": 310000, "chargers": 1050, "temp_base": 30, "demand_scale": 0.90},
    "Uttar Pradesh":      {"ev_count": 480000, "chargers": 890,  "temp_base": 29, "demand_scale": 0.80},
    "Rajasthan":          {"ev_count": 180000, "chargers": 520,  "temp_base": 35, "demand_scale": 0.60},
    "Kerala":             {"ev_count": 220000, "chargers": 780,  "temp_base": 29, "demand_scale": 0.75},
    "West Bengal":        {"ev_count": 260000, "chargers": 680,  "temp_base": 28, "demand_scale": 0.70},
    "Haryana":            {"ev_count": 200000, "chargers": 620,  "temp_base": 29, "demand_scale": 0.65},
    "Punjab":             {"ev_count": 170000, "chargers": 480,  "temp_base": 27, "demand_scale": 0.55},
    "Madhya Pradesh":     {"ev_count": 150000, "chargers": 420,  "temp_base": 30, "demand_scale": 0.50},
    "Bihar":              {"ev_count": 120000, "chargers": 280,  "temp_base": 29, "demand_scale": 0.40},
    "Andhra Pradesh":     {"ev_count": 280000, "chargers": 820,  "temp_base": 31, "demand_scale": 0.78},
    "Odisha":             {"ev_count": 95000,  "chargers": 310,  "temp_base": 30, "demand_scale": 0.35},
    "Assam":              {"ev_count": 65000,  "chargers": 180,  "temp_base": 26, "demand_scale": 0.25},
    "Jharkhand":          {"ev_count": 85000,  "chargers": 240,  "temp_base": 28, "demand_scale": 0.32},
    "Uttarakhand":        {"ev_count": 82000,  "chargers": 290,  "temp_base": 22, "demand_scale": 0.30},
    "Chhattisgarh":       {"ev_count": 72000,  "chargers": 210,  "temp_base": 30, "demand_scale": 0.28},
    "Himachal Pradesh":   {"ev_count": 48000,  "chargers": 180,  "temp_base": 18, "demand_scale": 0.22},
    "Goa":                {"ev_count": 42000,  "chargers": 160,  "temp_base": 29, "demand_scale": 0.20},
    "Chandigarh":         {"ev_count": 45000,  "chargers": 190,  "temp_base": 27, "demand_scale": 0.23},
    "Jammu and Kashmir":  {"ev_count": 55000,  "chargers": 150,  "temp_base": 16, "demand_scale": 0.22},
    "Sikkim":             {"ev_count": 15000,  "chargers": 40,   "temp_base": 15, "demand_scale": 0.10},
    "Manipur":            {"ev_count": 18000,  "chargers": 35,   "temp_base": 22, "demand_scale": 0.08},
    "Meghalaya":          {"ev_count": 22000,  "chargers": 45,   "temp_base": 20, "demand_scale": 0.09},
    "Tripura":            {"ev_count": 16000,  "chargers": 30,   "temp_base": 26, "demand_scale": 0.07},
    "Nagaland":           {"ev_count": 14000,  "chargers": 25,   "temp_base": 20, "demand_scale": 0.06},
    "Mizoram":            {"ev_count": 12000,  "chargers": 22,   "temp_base": 22, "demand_scale": 0.05},
    "Arunachal Pradesh":  {"ev_count": 10000,  "chargers": 18,   "temp_base": 18, "demand_scale": 0.04},
    "Ladakh":             {"ev_count": 5000,   "chargers": 12,   "temp_base": 8,  "demand_scale": 0.03},
}

# Hourly demand profile (normalized 0-1), peak at 18-20h
HOURLY_PROFILE = [
    0.12, 0.08, 0.06, 0.05, 0.06, 0.10,  # 0-5   (night/early morning)
    0.18, 0.30, 0.42, 0.50, 0.55, 0.58,  # 6-11  (morning ramp)
    0.60, 0.58, 0.55, 0.52, 0.56, 0.65,  # 12-17 (afternoon)
    0.85, 0.95, 1.00, 0.88, 0.68, 0.45,  # 18-23 (evening peak)
]


def generate_dataset():
    output_path = Path(__file__).resolve().parents[1] / "ev_state_demand_dataset.csv"

    rows = []
    start_date = datetime(2024, 1, 1)
    days = 365  # 1 year of data

    for day_offset in range(days):
        dt = start_date + timedelta(days=day_offset)
        day_name = dt.strftime("%A")
        is_weekend = 1 if dt.weekday() >= 5 else 0

        for state, params in STATES.items():
            for hour in range(24):
                # Base demand from hourly profile
                base = HOURLY_PROFILE[hour] * params["demand_scale"] * 650

                # Weekend effect: slightly lower morning, higher evening
                if is_weekend:
                    if hour < 10:
                        base *= 0.75
                    elif hour >= 16:
                        base *= 1.12

                # Temperature effect on demand
                temp = params["temp_base"] + random.uniform(-4, 4)
                # Slight seasonal variation
                temp += 5 * math.sin(2 * math.pi * day_offset / 365 - math.pi / 2)
                temp = round(temp, 1)

                # Hot weather increases AC usage → more charging
                temp_factor = 1.0 + max(0, (temp - 30)) * 0.008

                # Vehicle-charger ratio effect
                ratio = params["ev_count"] / max(params["chargers"], 1)
                ratio_factor = 1.0 + min(ratio / 1000, 0.15)

                # Final demand with noise
                demand = base * temp_factor * ratio_factor
                demand *= random.uniform(0.88, 1.12)  # ±12% noise
                demand = max(5, round(demand))

                row_dt = dt.replace(hour=hour)
                rows.append({
                    "datetime": row_dt.strftime("%Y-%m-%d %H:%M"),
                    "state": state,
                    "hour": hour,
                    "day_of_week": day_name,
                    "is_weekend": is_weekend,
                    "temperature": temp,
                    "ev_count_state": params["ev_count"],
                    "chargers": params["chargers"],
                    "vehicle_charger_ratio": round(ratio, 1),
                    "charging_sessions": demand,
                })

    # Write CSV
    fieldnames = [
        "datetime", "state", "hour", "day_of_week", "is_weekend",
        "temperature", "ev_count_state", "chargers",
        "vehicle_charger_ratio", "charging_sessions"
    ]

    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"Dataset generated: {output_path}")
    print(f"Total rows: {len(rows):,}")
    print(f"States: {len(STATES)}")
    print(f"Date range: {start_date.date()} → {(start_date + timedelta(days=days-1)).date()}")


if __name__ == "__main__":
    generate_dataset()
