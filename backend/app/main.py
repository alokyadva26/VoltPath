from fastapi import FastAPI
from routers import route_router, charger_router

app = FastAPI(title="VoltPath API")

app.include_router(route_router.router)
app.include_router(charger_router.router)


@app.get("/")
def home():
    return {"message": "VoltPath backend running"}