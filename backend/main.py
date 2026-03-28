from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import connect_to_mongo, close_mongo_connection
from routes.transactions import router as transactions_router
from routes.alerts import router as alerts_router
from routes.graph import router as graph_router
from routes.hold import router as hold_router
from routes.simulation import router as simulation_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(
    title="Rule-Based Fraud Detection API",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(transactions_router, prefix="/transactions", tags=["Transactions"])
app.include_router(alerts_router, prefix="/alerts", tags=["Alerts"])
app.include_router(graph_router, prefix="/graph", tags=["Graph"])
app.include_router(hold_router, tags=["Hold"])
app.include_router(simulation_router, prefix="/simulate", tags=["Simulation"])

@app.get("/")
async def root():
    return {"message": "Fraud Detection API running"}
