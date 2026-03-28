from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta, timezone
import random
import string
from services.rule_engine import evaluate_transaction

def generate_account_id(prefix="acc"):
    return f"{prefix}_{''.join(random.choices(string.ascii_lowercase + string.digits, k=6))}"

async def simulate_transactions(
    db: AsyncIOMotorDatabase,
    normal_count: int,
    fraud_chain_length: int,
    amount_min: float,
    amount_max: float
) -> dict:
    
    generated_txs = []
    
    async def _add_tx(sender: str, receiver: str, amount: float, ts: datetime):
        eval_res = await evaluate_transaction(db, sender, receiver, amount, ts)
        doc = {
            "sender_id": sender,
            "receiver_id": receiver,
            "amount": amount,
            "timestamp": ts,
            "risk_score": eval_res["risk_score"],
            "risk_flags": eval_res["risk_flags"],
            "is_high_risk": eval_res["is_high_risk"]
        }
        res = await db.transactions.insert_one(doc)
        doc["id"] = str(res.inserted_id)
        doc.pop("_id", None)
        
        await db.accounts.update_one(
            {"account_id": sender}, {"$set": {"last_active_at": ts}}, upsert=True
        )
        await db.accounts.update_one(
            {"account_id": receiver}, {"$set": {"last_active_at": ts}}, upsert=True
        )
        generated_txs.append(doc)
        return doc

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    
    normal_senders = [generate_account_id("norm") for _ in range(10)]
    normal_receivers = [generate_account_id("norm") for _ in range(10)]
    
    for _ in range(normal_count):
        s = random.choice(normal_senders)
        r = random.choice(normal_receivers)
        while s == r:
            r = random.choice(normal_receivers)
        amt = round(random.uniform(amount_min, amount_max), 2)
        ts = now - timedelta(hours=random.randint(1, 24), minutes=random.randint(0, 59))
        await _add_tx(s, r, amt, ts)
        
    fraud_nodes = [generate_account_id("fraud") for _ in range(fraud_chain_length)]
    
    chain_time = now - timedelta(minutes=5)
    fraud_amt = max(50001.0, amount_max)
    
    ninety_one_days_ago = now - timedelta(days=91)
    for node in fraud_nodes:
        await _add_tx(node, generate_account_id("dummy"), 1.0, ninety_one_days_ago)

    for i in range(fraud_chain_length - 1):
        sender = fraud_nodes[i]
        receiver = fraud_nodes[i+1]
        
        for j in range(5):
            tiny_ts = chain_time + timedelta(seconds=j)
            await _add_tx(sender, generate_account_id("dummy"), 5.0, tiny_ts)
            
        main_ts = chain_time + timedelta(seconds=10)
        await _add_tx(sender, receiver, fraud_amt, main_ts)
        chain_time = main_ts + timedelta(minutes=1)
        
    return {
        "generated_count": len(generated_txs),
        "fraud_chain": fraud_nodes,
        "transactions": generated_txs
    }
