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
    print(">>> Forensic Ingestion Started")
    try:
        import pandas as pd
        import asyncio
        # Robust CSV path finding
        possible_paths = [
            "train_final (1).csv",
            "backend/train_final (1).csv",
            "../train_final (1).csv",
            os.path.join(os.path.dirname(os.path.dirname(__file__)), "train_final (1).csv"),
            os.path.join(os.getcwd(), "train_final (1).csv"),
            os.path.join(os.getcwd(), "backend", "train_final (1).csv")
        ]
        
        csv_path = None
        for p in possible_paths:
            if os.path.exists(p):
                csv_path = p
                print(f">>> Found CSV at: {p}")
                break
        
        if not csv_path:
            print("ERROR: CSV file 'train_final (1).csv' not found in any expected location")
            return {"success": False, "message": "Forensic CSV file not found on server disk.", "error": "FILE_NOT_FOUND"}
            
        try:
            print(f">>> Reading CSV: {os.path.abspath(csv_path)}")
            df = pd.read_csv(csv_path)
            print(f">>> CSV Read Success. Total rows: {len(df)}")
        except Exception as csv_err:
            print(f"!!! CSV Read Error: {csv_err}")
            return {"success": False, "message": f"Server failed to read forensic data: {str(csv_err)}", "error": "CSV_READ_ERROR"}

        df = df.sort_values('Layer')
        # Limit to 50 rows for cloud stability (free tier memory limits)
        rows = df.head(50).to_dict('records')
        print(f">>> Processing top {len(rows)} records...")

        # Clear existing data
        print(">>> Clearing stale database records...")
        await db.transactions.delete_many({})
        await db.accounts.delete_many({})

        # Victim Accounts (Roots)
        victims = ["62350102489", "50100250798812"]
        base_date = datetime(2020, 2, 26, 10, 0, 0)
        
        withdrawal_types = ["Cash Withdrawal", "ATM Withdrawal", "PhonePe", "Google Pay", "UPI", "NEFT", "RTGS", "IMPS", "Bank Transfer", "Others"]

        processed_count = 0
        batch_size = 5
        # Pre-cache existing accounts to avoid redundant lookups
        existing_accounts = await db.accounts.find().to_list(length=1000)
        account_map = {acc["account_id"]: acc for acc in existing_accounts}

        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            print(f">>> Processing batch {i//batch_size + 1}/{len(rows)//batch_size + 1}...")
            
            # Use gather to parallelize within the batch if possible, or just be careful
            # For now, let's keep it sequential but faster
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
                    
                    # Map withdrawal type from primary amount for realism
                    w_type = "UPI"
                    if amount > 100000: w_type = "RTGS"
                    elif amount > 50000: w_type = "NEFT"
                    elif amount > 20000: w_type = "IMPS"
                    elif amount < 5000: w_type = "PhonePe"
                    
                    ts = base_date + timedelta(days=int(row['Txn_Day']), hours=int(row['Txn_Hour']), minutes=idx % 60)

                    # Optimize: For ingestion, maybe skip the full evaluation if it's too slow
                    # or at least make it faster.
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
                        "is_confirmed_fraud": bool(is_fraud),
                        "reasoning": reasoning,
                        "confidence_score": 1.0 if is_fraud else 0.8,
                        "factors": evaluation.get("factors", []),
                        "status": "HOLD" if (final_risk >= 0.7 or is_fraud) else "completed",
                        "layer": layer,
                        "persona": "Victim Source" if layer == 1 else "Mule/Layering"
                    }
                    
                    await db.transactions.insert_one(doc)
                    
                    looted_inc = amount if (is_fraud and layer == 1) else 0.0
                    
                    # Optimized updates
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
                    print(f"!!! Error processing row {idx}: {row_err}")
                    continue
            # Yield to event loop to keep the server responsive
            await asyncio.sleep(0.01)

        print(f">>> Success: Loaded {processed_count} records")
        return {"success": True, "message": f"Successfully ingested {processed_count} forensic records.", "error": None}
    except Exception as e:
        print(f"!!! CRITICAL ENDPOINT ERROR: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": "A critical server error occurred during ingestion.", "error": str(e)}

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
        
        # Calculate dashboard summary
        total_txs = await db.transactions.count_documents({})
        high_risk_count = await db.transactions.count_documents({"risk_score": {"$gte": 0.7}})
        
        # Avoid double counting: Only count transactions from Layer 1 (Victims) as total looted
        total_looted = await db.transactions.aggregate([
            {"$match": {"layer": 1, "is_confirmed_fraud": True}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]).to_list(length=1)
        
        looted_sum = total_looted[0]["total"] if total_looted else 0.0

        for tx in txs:
            tx["id"] = str(tx["_id"])
            tx.pop("_id", None)
            
        return {
            "success": True, 
            "data": {
                "transactions": txs,
                "summary": {
                    "total_count": total_txs,
                    "high_risk_count": high_risk_count,
                    "total_looted": looted_sum
                }
            }, 
            "error": None
        }
    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}
