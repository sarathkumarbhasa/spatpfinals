from fastapi import APIRouter, Depends, Body
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_db
from services.simulation_engine import simulate_transactions

router = APIRouter()

class SimulationConfig(BaseModel):
    normal_count: int = Field(default=50)
    fraud_chain_length: int = Field(default=4)
    amount_min: float = Field(default=5000.0)
    amount_max: float = Field(default=100000.0)

@router.post("/", response_model=dict)
async def api_simulate(config: SimulationConfig = Body(default_factory=SimulationConfig), db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        data = await simulate_transactions(
            db=db,
            normal_count=config.normal_count,
            fraud_chain_length=config.fraud_chain_length,
            amount_min=config.amount_min,
            amount_max=config.amount_max
        )
        return {"success": True, "data": data, "error": None}
    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}

@router.post("/clear", response_model=dict)
async def api_clear_data(db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        await db.transactions.delete_many({})
        await db.accounts.delete_many({})
        return {"success": True, "data": {}, "error": None}
    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}
