from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_db

router = APIRouter()

@router.get("/", response_model=dict)
async def get_alerts(db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        high_risk_cursor = db.transactions.find({"is_high_risk": True}).sort("timestamp", -1).limit(100)
        high_risk_txs = await high_risk_cursor.to_list(length=100)
        for tx in high_risk_txs:
            tx["id"] = str(tx["_id"])
            tx.pop("_id", None)
            
        hold_cursor = db.transactions.find({"status": "HOLD"}).sort("timestamp", -1).limit(100)
        hold_txs = await hold_cursor.to_list(length=100)
        for tx in hold_txs:
            tx["id"] = str(tx["_id"])
            tx.pop("_id", None)
            
        return {
            "success": True,
            "data": {
                "high_risk_transactions": high_risk_txs,
                "hold_transactions": hold_txs
            },
            "error": None
        }
    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}
