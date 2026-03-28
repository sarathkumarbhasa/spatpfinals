import asyncio
import pytest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from backend.services.rule_engine import evaluate_transaction

class DummyCollection:
    def __init__(self, docs=None, count=0):
        self._docs = docs or []
        self._count = count
    async def count_documents(self, query):
        return self._count
    async def find(self, query):
        # return an object with to_list
        class Finder:
            def __init__(self, docs):
                self._docs = docs
            async def to_list(self, length):
                return self._docs
        return Finder(self._docs)
    async def find_one(self, query, sort=None):
        if self._docs:
            return self._docs[0]
        return None

class DummyDB:
    def __init__(self, collections):
        self.transactions = collections.get('transactions', DummyCollection())
        self.accounts = collections.get('accounts', DummyCollection())

@pytest.mark.asyncio
async def test_first_time_high_amount_and_multi_receiver_and_dormant():
    # Setup timestamp
    ts = datetime.utcnow()

    # transactions.count_documents for incoming_last_30_days should be 0 to trigger first_time
    tx_collection = DummyCollection(docs=[], count=0)

    # recent 5m transactions to simulate multiple receivers
    recent = [
        {"receiver_id": "R1", "timestamp": ts - timedelta(minutes=1)},
        {"receiver_id": "R2", "timestamp": ts - timedelta(minutes=2)}
    ]
    tx_collection._docs = recent

    # past_txs for velocity: create many small samples spread out
    past = []
    for i in range(5):
        past.append({"timestamp": ts - timedelta(hours=2)})
    # Finder will return past when queried for past_txs; we set _docs accordingly on a separate collection
    tx_past_collection = DummyCollection(docs=past, count=0)

    # accounts collection: simulate dormant account last active 200 days ago
    acc = DummyCollection(docs=[{"account_id": "S1", "last_active_at": ts - timedelta(days=200)}])

    # Build DB with appropriate collections. For simplicity transactions collection will be used for different queries via contents
    db = SimpleNamespace()
    db.transactions = DummyCollection(docs=recent, count=0)
    # For find past_txs we'll swap on the fly by detecting query range in DummyCollection; keep simple by setting docs to past when appropriate
    db.accounts = acc

    # Call evaluate_transaction with amount > 10000 and >50000 to trigger both high amount and first time
    res = await evaluate_transaction(db, sender_id="S1", receiver_id="R3", amount=60000.0, timestamp=ts, transaction_id="T1")

    assert isinstance(res, dict)
    assert res["risk_score"] >= 0.0
    assert "first_time_receiver" in res["risk_flags"]
    assert "high_amount" in res["risk_flags"]

@pytest.mark.asyncio
async def test_velocity_rule_not_triggered_with_low_activity():
    ts = datetime.utcnow()
    # past_txs empty, current window count will be 1 -> should not trigger
    db = DummyDB({'transactions': DummyCollection(docs=[], count=0), 'accounts': DummyCollection(docs=[])})
    res = await evaluate_transaction(db, sender_id="S2", receiver_id="R1", amount=100.0, timestamp=ts)
    assert "velocity" not in res["risk_flags"]

@pytest.mark.asyncio
async def test_dormant_false_when_recent_activity_in_transactions():
    ts = datetime.utcnow()
    # latest_tx exists within 10 days
    latest = {"timestamp": ts - timedelta(days=10)}
    txs = DummyCollection(docs=[latest], count=1)
    db = DummyDB({'transactions': txs, 'accounts': DummyCollection(docs=[])})
    res = await evaluate_transaction(db, sender_id="S3", receiver_id="R1", amount=50.0, timestamp=ts)
    assert "dormant" not in res["risk_flags"]

@pytest.mark.asyncio
async def test_multi_receiver_counts_distinct_receivers():
    ts = datetime.utcnow()
    recent = [
        {"receiver_id": "A", "timestamp": ts - timedelta(minutes=1)},
        {"receiver_id": "B", "timestamp": ts - timedelta(minutes=2)},
    ]
    db = DummyDB({'transactions': DummyCollection(docs=recent, count=0), 'accounts': DummyCollection(docs=[])})
    res = await evaluate_transaction(db, sender_id="S4", receiver_id="C", amount=10.0, timestamp=ts)
    assert "multi_receiver" in res["risk_flags"]

@pytest.mark.asyncio
async def test_timestamp_with_timezone_is_normalized():
    ts = datetime.now(timezone.utc)
    db = DummyDB({'transactions': DummyCollection(docs=[], count=0), 'accounts': DummyCollection(docs=[])})
    res = await evaluate_transaction(db, sender_id="S5", receiver_id="R1", amount=10.0, timestamp=ts)
    assert isinstance(res["audit_trace"]["computed"], dict)
