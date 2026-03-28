from fastapi import APIRouter, Depends
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_db
from services.hold_engine import propagate_hold, confirm_fraud_logic

router = APIRouter()

class PropagateRequest(BaseModel):
    account_id: str

class ConfirmFraudRequest(BaseModel):
    account_id: str

@router.post("/hold/propagate", response_model=dict)
async def api_propagate_hold(req: PropagateRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        data = await propagate_hold(db, req.account_id)
        return {"success": True, "data": data, "error": None}
    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}

@router.post("/hold/confirm-fraud", response_model=dict)
async def api_confirm_fraud(req: ConfirmFraudRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        data = await confirm_fraud_logic(db, req.account_id)
        return {"success": True, "data": data, "error": None}
    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}
