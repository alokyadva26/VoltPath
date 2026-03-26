from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import route_router, charger_router, policy_router, forecast_router, coverage_gap_router, analytics_router

app = FastAPI(title="VoltPath API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow all origins (for development)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# routers
app.include_router(route_router.router)
app.include_router(charger_router.router)
app.include_router(policy_router.router)
app.include_router(forecast_router.router)
app.include_router(coverage_gap_router.router)
app.include_router(analytics_router.router)


@app.get("/")
def home():
    return {"message": "VoltPath backend running"}