from pydantic import BaseModel
from typing import List


class RouteRequest(BaseModel):
    vehicle: str
    soc: int
    origin: List[float]
    destination: List[float]


class RouteResponse(BaseModel):
    message: str
    vehicle: str
    soc: int