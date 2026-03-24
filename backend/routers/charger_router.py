from fastapi import APIRouter
from utils.charger_loader import load_chargers

router = APIRouter()


@router.get("/chargers")
def get_chargers():
    chargers = load_chargers()

    return {
        "count": len(chargers),
        "chargers": chargers
    }