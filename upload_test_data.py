import json
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
import sys
from datetime import datetime, timezone

# Add backend to path to use config and rule engine
sys.path.append(os.path.join(os.getcwd(), "backend"))

# Load environment variables from backend folder before importing settings
from dotenv import load_dotenv
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

from backend.utils.config import settings
from backend.services.rule_engine import evaluate_transaction

async def upload_test_data():
    # Load dataset
    with open("test_dataset.json", "r") as f:
        data = json.load(f)

    # Handle both list format and dict format
    transactions = data if isinstance(data, list) else data.get("transactions", [])
    accounts = [] if isinstance(data, list) else data.get("accounts", [])
    alerts = [] if isinstance(data, list) else data.get("alerts", [])

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.mongodb_url)
    db = client[settings.database_name]

    print(f"Connected to database: {settings.database_name}")

    # Clear existing data
    print("Clearing existing collections...")
    await db.transactions.delete_many({})
    await db.accounts.delete_many({})
    await db.alerts.delete_many({})

    # Process and insert transactions with rule engine evaluation
    if transactions:
        print(f"Processing {len(transactions)} transactions...")
        processed_txs = []
        for tx in transactions:
            # Parse timestamp
            ts_str = tx["timestamp"].replace("Z", "+00:00")
            ts = datetime.fromisoformat(ts_str)
            
            # Evaluate using rule engine
            evaluation = await evaluate_transaction(
                db=db,
                sender_id=tx["sender_id"],
                receiver_id=tx["receiver_id"],
                amount=float(tx["amount"]),
                timestamp=ts
            )
            
            processed_tx = {
                "sender_id": tx["sender_id"],
                "receiver_id": tx["receiver_id"],
                "amount": float(tx["amount"]),
                "timestamp": ts.replace(tzinfo=None), # Store as naive UTC
                "risk_score": evaluation["risk_score"],
                "risk_flags": evaluation["risk_flags"],
                "is_high_risk": evaluation["is_high_risk"],
                "reasoning": evaluation["reasoning"],
                "confidence_score": evaluation.get("confidence_score", 1.0),
                "factors": evaluation.get("factors", []),
                "status": "completed" if not evaluation["is_high_risk"] else "HOLD"
            }
            processed_txs.append(processed_tx)
            
            # Insert one by one to let subsequent transactions see previous ones (for velocity rules)
            await db.transactions.insert_one(processed_tx)
            
            # Update account activity
            await db.accounts.update_one(
                {"account_id": tx["sender_id"]},
                {"$set": {"last_active_at": ts.replace(tzinfo=None)}},
                upsert=True
            )
            await db.accounts.update_one(
                {"account_id": tx["receiver_id"]},
                {"$set": {"last_active_at": ts.replace(tzinfo=None)}},
                upsert=True
            )
        print(f"Inserted {len(processed_txs)} processed transactions.")

    # Insert account profiles if present
    if accounts:
        print(f"Updating {len(accounts)} account profiles...")
        for acc in accounts:
            await db.accounts.update_one(
                {"account_id": acc["account_id"]},
                {"$set": {
                    "risk_profile": acc.get("risk_profile", "low"),
                    "patterns": acc.get("patterns", [])
                }},
                upsert=True
            )

    # Insert alerts if present
    if alerts:
        print(f"Inserting {len(alerts)} alerts...")
        await db.alerts.insert_many(alerts)

    print("Successfully uploaded and processed new test dataset!")
    client.close()

if __name__ == "__main__":
    asyncio.run(upload_test_data())
