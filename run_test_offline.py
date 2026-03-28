import json
import asyncio
import sys
import os
sys.path.append(os.path.abspath('backend'))
from datetime import datetime, timezone
from backend.services.rule_engine import evaluate_transaction
from bson import ObjectId

class MockCursor:
    def __init__(self, data):
        self.data = data
    async def to_list(self, length=None):
        return self.data[:length] if length else self.data
    def sort(self, *args, **kwargs):
        if args and args[0] == "timestamp":
            self.data = sorted(self.data, key=lambda x: x.get("timestamp", datetime.min), reverse=(args[1]==-1))
        return self

class MockCollection:
    def __init__(self):
        self.docs = []
    async def find_one(self, query=None, sort=None):
        res = self._filter(query)
        if sort and sort[0] == ("timestamp", -1):
            res = sorted(res, key=lambda x: x.get("timestamp", datetime.min), reverse=True)
        return res[0] if res else None
    def find(self, query=None):
        return MockCursor(self._filter(query))
    async def count_documents(self, query=None):
        return len(self._filter(query))
    async def insert_one(self, doc):
        doc["_id"] = ObjectId()
        self.docs.append(doc)
        class Res: inserted_id = doc["_id"]
        return Res()
    async def update_one(self, query, update, upsert=False):
        doc = await self.find_one(query)
        if doc:
            for k, v in update.get("$set", {}).items():
                doc[k] = v
        elif upsert:
            new_doc = {**query}
            for k, v in update.get("$set", {}).items():
                new_doc[k] = v
            self.docs.append(new_doc)
            
    def _filter(self, query):
        res = []
        for doc in self.docs:
            match = True
            for k, v in (query or {}).items():
                if isinstance(v, dict):
                    if "$gte" in v and "$lte" in v:
                        if not (v["$gte"] <= doc.get(k, datetime.min) <= v["$lte"]): match = False
                elif k == "$or":
                    or_match = False
                    for cond in v:
                        for ck, cv in cond.items():
                            if doc.get(ck) == cv:
                                or_match = True; break
                    if not or_match: match = False
                else:
                    if doc.get(k) != v: match = False
            if match: res.append(doc)
        return res

class MockDatabase:
    def __init__(self):
        self.transactions = MockCollection()
        self.accounts = MockCollection()

async def main():
    with open("test_dataset.json", "r") as f:
        data = json.load(f)
        if isinstance(data, dict) and "transactions" in data:
            data = data["transactions"]
        
    db = MockDatabase()
    results = []
    
    print(f"Starting offline evaluation of {len(data)} transactions...")
    for tx in data:
        ts = datetime.fromisoformat(tx["timestamp"].replace("Z", "+00:00")).replace(tzinfo=None)
        
        eval_res = await evaluate_transaction(
            db=db,
            sender_id=tx["sender_id"],
            receiver_id=tx["receiver_id"],
            amount=tx["amount"],
            timestamp=ts
        )
        
        doc = {
            "sender_id": tx["sender_id"],
            "receiver_id": tx["receiver_id"],
            "amount": tx["amount"],
            "timestamp": ts,
            "risk_score": eval_res["risk_score"],
            "risk_flags": eval_res["risk_flags"],
            "is_high_risk": eval_res["is_high_risk"]
        }
        await db.transactions.insert_one(doc)
        await db.accounts.update_one({"account_id": tx["sender_id"]}, {"$set": {"last_active_at": ts}}, upsert=True)
        await db.accounts.update_one({"account_id": tx["receiver_id"]}, {"$set": {"last_active_at": ts}}, upsert=True)
        
        results.append(doc)
        print(f"Eval: {tx['sender_id']} -> {tx['receiver_id']} | Amt: {tx['amount']} | Score: {eval_res['risk_score']} | Flags: {eval_res['risk_flags']}")

    print("\n--- Summary ---")
    high_risk = [r for r in results if r["is_high_risk"]]
    print(f"Total: {len(results)}, High Risk: {len(high_risk)}")
    if high_risk:
        print("High Risk Transactions:")
        for r in high_risk:
            print(f"  - {r['sender_id']} -> {r['receiver_id']} | Score: {r['risk_score']} | Flags: {r['risk_flags']}")

if __name__ == "__main__":
    asyncio.run(main())
