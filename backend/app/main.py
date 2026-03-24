from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import route_router, charger_router

app = FastAPI(title="VoltPath API")

# ---- CORS CONFIGURATION (allows frontend to call backend) ----
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # allow all during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- ROUTERS ----
app.include_router(route_router.router)
app.include_router(charger_router.router)

# ---- ROOT TEST ENDPOINT ----
@app.get("/")
def home():
    return {"message": "VoltPath backend running"}