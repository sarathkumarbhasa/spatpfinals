from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta, timezone
import os
from models.transaction import TransactionCreate
from database import get_db
from services.rule_engine import evaluate_transaction

router = APIRouter()

@router.post("/load-real-case", response_model=dict)
async def load_real_case_endpoint(db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        import pandas as pd
        import asyncio
        # Robust CSV path finding
        possible_paths = [
            "train_final (1).csv",
            "../train_final (1).csv",
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "train_final (1).csv"),
            os.path.join(os.getcwd(), "train_final (1).csv"),
            os.path.join(os.getcwd(), "..", "train_final (1).csv")
        ]
        
        csv_path = None
        for p in possible_paths:
            if os.path.exists(p):
                csv_path = p
                break
        
        if not csv_path:
            print("ERROR: CSV file 'train_final (1).csv' not found")
            return {"success": False, "message": "CSV file 'train_final (1).csv' not found in any expected location.", "error": "File Not Found"}
            
        print(f"Loading real case from: {os.path.abspath(csv_path)}")
        try:
            df = pd.read_csv(csv_path)
        except Exception as csv_err:
            print(f"CSV Read Error: {csv_err}")
            return {"success": False, "message": f"Failed to read CSV: {str(csv_err)}", "error": "CSV_READ_ERROR"}

        df = df.sort_values('Layer')
        rows = df.head(100).to_dict('records')

        # Clear existing data
        await db.transactions.delete_many({})
        await db.accounts.delete_many({})

        # Victim Accounts (Roots)
        victims = ["62350102489", "50100250798812"]
        base_date = datetime(2020, 2, 26, 10, 0, 0)
        
        withdrawal_types = ["Cash Withdrawal", "ATM Withdrawal", "PhonePe", "Google Pay", "UPI", "NEFT", "RTGS", "IMPS", "Bank Transfer", "Others"]

        processed_count = 0
        batch_size = 10
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            for idx_in_batch, row in enumerate(batch):
                idx = i + idx_in_batch
                try:
                    layer = int(row['Layer'])
                    is_fraud = int(row['is_fraud'])
                    amount = float(row['Primary_Amount'])
                    
                    if layer == 1:
                        sender_id = victims[idx % 2]
                    else:
                        sender_id = f"ACC_L{layer-1}_{idx % 5}"
                    
                    receiver_id = f"ACC_L{layer}_{idx % 5}"
                    
                    w_type = withdrawal_types[idx % len(withdrawal_types)]
                    if amount > 100000: w_type = "RTGS"
                    elif amount > 50000: w_type = "NEFT"
                    elif amount < 5000: w_type = "UPI"
                    
                    ts = base_date + timedelta(days=int(row['Txn_Day']), hours=int(row['Txn_Hour']), minutes=idx % 60)

                    evaluation = await evaluate_transaction(
                        db=db,
                        sender_id=sender_id,
                        receiver_id=receiver_id,
                        amount=amount,
                        timestamp=ts
                    )

                    final_risk = max(evaluation["risk_score"], 1.0 if is_fraud else 0.0)
                    reasoning = evaluation["reasoning"]
                    if is_fraud and "Fraud" not in reasoning:
                        reasoning = f"REAL CASE DATA: Confirmed Fraud. {reasoning}"

                    doc = {
                        "sender_id": sender_id,
                        "receiver_id": receiver_id,
                        "amount": amount,
                        "timestamp": ts,
                        "withdrawal_type": w_type,
                        "risk_score": final_risk,
                        "risk_flags": evaluation.get("risk_flags", []),
                        "is_high_risk": final_risk >= 0.7,
                        "reasoning": reasoning,
                        "confidence_score": 1.0 if is_fraud else 0.8,
                        "factors": evaluation.get("factors", []),
                        "status": "HOLD" if (final_risk >= 0.7 or is_fraud) else "completed",
                        "layer": layer
                    }
                    
                    await db.transactions.insert_one(doc)
                    
                    looted_inc = amount if is_fraud else 0.0
                    
                    await db.accounts.update_one(
                        {"account_id": sender_id},
                        {
                            "$set": {"last_active_at": ts},
                            "$inc": {"total_looted_amount": looted_inc},
                            "$setOnInsert": {"risk_profile": "high" if is_fraud else "low", "is_victim": sender_id in victims}
                        },
                        upsert=True
                    )
                    await db.accounts.update_one(
                        {"account_id": receiver_id},
                        {
                            "$set": {"last_active_at": ts},
                            "$setOnInsert": {"is_victim": False}
                        },
                        upsert=True
                    )
                    processed_count += 1
                except Exception as row_err:
                    print(f"Error processing row {idx}: {row_err}")
                    continue
            # Yield to event loop to prevent blocking and potential timeouts
            await asyncio.sleep(0.01)

        return {"success": True, "message": f"Loaded {processed_count} real records from CSV", "error": None}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"success": False, "message": str(e), "error": str(e)}

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
