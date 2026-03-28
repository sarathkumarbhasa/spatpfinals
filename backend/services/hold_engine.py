from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta, timezone

async def propagate_hold(db: AsyncIOMotorDatabase, root_account_id: str) -> dict:
    # CAP is total amount to hold across all nodes in this chain
    cap = 500000.0
    total_held = 0.0
    
    queue = [(root_account_id, 0)]
    visited = {root_account_id}
    held_transactions = []
    
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    # FIX: Increase hold time to 24 hours for better forensic window
    hold_until = now + timedelta(hours=24)
    
    while queue and total_held < cap:
        current_acc, depth = queue.pop(0)
        
        # FIX: Support up to 5 levels of propagation as per requirements
        if depth >= 5:
            continue
            
        # Find transactions sent FROM this account (downstream)
        cursor = db.transactions.find({"sender_id": current_acc}).sort("timestamp", 1)
        txs = await cursor.to_list(length=1000)
        
        for tx in txs:
            if total_held >= cap:
                break
                
            receiver = tx["receiver_id"]
            amount = float(tx.get("amount", 0.0))
            
            if receiver not in visited:
                visited.add(receiver)
                
                # Update receiver account status
                await db.accounts.update_one(
                    {"account_id": receiver},
                    {"$set": {
                        "status": "HOLD",
                        "hold_reason": f"Propagated from {root_account_id}",
                        "hold_until": hold_until
                    }},
                    upsert=True
                )
                
                # Update the transaction status
                await db.transactions.update_one(
                    {"_id": tx["_id"]},
                    {"$set": {
                        "status": "HOLD",
                        "hold_until": hold_until
                    }}
                )
                
                total_held += amount
                held_transactions.append(str(tx["_id"]))
                
                # Add receiver to queue to propagate further
                queue.append((receiver, depth + 1))
                
    return {
        "root_account": root_account_id,
        "total_held_amount": total_held,
        "nodes_affected": len(visited) - 1,
        "held_transactions": held_transactions,
        "hold_until": hold_until.isoformat()
    }

async def confirm_fraud_logic(db: AsyncIOMotorDatabase, account_id: str) -> dict:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    # Mark account as fraud
    await db.accounts.update_one(
        {"account_id": account_id},
        {"$set": {
            "status": "FRAUD_CONFIRMED",
            "risk_score": 1.0,
            "reasoning": "Fraud confirmed by investigator.",
            "confirmed_at": now
        }},
        upsert=True
    )
    
    # Mark all transactions involving this account as fraud
    result = await db.transactions.update_many(
        {"$or": [{"sender_id": account_id}, {"receiver_id": account_id}]},
        {"$set": {
            "status": "FRAUD_CONFIRMED",
            "risk_score": 1.0,
            "is_high_risk": True,
            "reasoning": "Involved with confirmed fraud account."
        }}
    )
    
    return {
        "status": "FRAUD_CONFIRMED", 
        "account_id": account_id,
        "transactions_updated": result.modified_count
    }
