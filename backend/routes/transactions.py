from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import timezone
from models.transaction import TransactionCreate
from database import get_db
from services.rule_engine import evaluate_transaction

router = APIRouter()

@router.post("/", response_model=dict)
async def create_transaction(tx: TransactionCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        # Convert timestamp to naive UTC for MongoDB storage
        if tx.timestamp.tzinfo is not None:
            ts = tx.timestamp.astimezone(timezone.utc).replace(tzinfo=None)
        else:
            ts = tx.timestamp

        evaluation = await evaluate_transaction(
            db=db,
            sender_id=tx.sender_id,
            receiver_id=tx.receiver_id,
            amount=tx.amount,
            timestamp=ts
        )

        doc = {
            "sender_id": tx.sender_id,
            "receiver_id": tx.receiver_id,
            "amount": tx.amount,
            "timestamp": ts,
            "risk_score": evaluation["risk_score"],
            "risk_flags": evaluation["risk_flags"],
            "is_high_risk": evaluation["is_high_risk"],
            "reasoning": evaluation["reasoning"],
            "confidence_score": evaluation.get("confidence_score", 1.0),
            "factors": evaluation.get("factors", []),
            "status": "HOLD" if evaluation["is_high_risk"] else "completed"
        }
        
        result = await db.transactions.insert_one(doc)
        doc["id"] = str(result.inserted_id)
        doc.pop("_id", None)
        
        # Update account activity to maintain dormancy rules
        await db.accounts.update_one(
            {"account_id": tx.sender_id},
            {"$set": {"last_active_at": ts}},
            upsert=True
        )
        await db.accounts.update_one(
            {"account_id": tx.receiver_id},
            {"$set": {"last_active_at": ts}},
            upsert=True
        )
        
        return {"success": True, "data": doc, "error": None}
    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}

@router.get("/", response_model=dict)
async def list_transactions(limit: int = 50, skip: int = 0, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        txs = await db.transactions.find().sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)
        for tx in txs:
            tx["id"] = str(tx["_id"])
            tx.pop("_id", None)
            
        return {"success": True, "data": {"transactions": txs}, "error": None}
    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}
