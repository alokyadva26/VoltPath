import json
from pathlib import Path


def load_chargers():
    data_path = Path(__file__).resolve().parents[2] / "data" / "chargers_delhi_ncr.json"

    with open(data_path, "r") as f:
        chargers = json.load(f)

    return chargers