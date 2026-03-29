import json
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase

async def evaluate_transaction(db: AsyncIOMotorDatabase, sender_id: str, receiver_id: str, amount: float, timestamp: datetime, transaction_id: str = "TBD") -> dict:
    
    amount = float(amount)
    if timestamp.tzinfo is not None:
        timestamp = timestamp.astimezone(timezone.utc).replace(tzinfo=None)

    # 1. First-Time Receiver (Strict 30 days window logic)
    thirty_days_ago = timestamp - timedelta(days=30)
    incoming_last_30_days = await db.transactions.count_documents({
        "receiver_id": receiver_id,
        "timestamp": {"$gt": thirty_days_ago, "$lt": timestamp}
    })
    rule_first_time = (incoming_last_30_days == 0 and amount > 10000.0)
    score_first_time = 0.4 if rule_first_time else 0.0

    # 2. High Amount
    rule_high_amount = (amount > 50000.0)
    score_high_amount = 0.3 if rule_high_amount else 0.0

    # 3. Velocity Spike (Strict Baseline Enforcement)
    one_hour_ago = timestamp - timedelta(hours=1)
    twenty_four_hours_ago = timestamp - timedelta(hours=24)
    
    current_window_count = await db.transactions.count_documents({
        "sender_id": sender_id,
        "timestamp": {"$gte": one_hour_ago, "$lt": timestamp}
    })
    current_window_count += 1
    
    past_txs = await db.transactions.find({
        "sender_id": sender_id,
        "timestamp": {"$gte": twenty_four_hours_ago, "$lt": one_hour_ago}
    }).to_list(length=1000)
    
    samples = [0] * 23
    for tx in past_txs:
        tx_time = tx.get("timestamp")
        if tx_time.tzinfo is not None:
            tx_time = tx_time.astimezone(timezone.utc).replace(tzinfo=None)
        
        delta_hours = int((one_hour_ago - tx_time).total_seconds() // 3600)
        if 0 <= delta_hours < 23:
            samples[22 - delta_hours] += 1
            
    previous_window_count = sum(1 for s in samples if s > 0)
    previous_window_average = round(sum(samples) / 23.0, 2)
    
    rule_velocity = (
        previous_window_count >= 3 and 
        previous_window_average >= 1.0 and 
        current_window_count > round(3.0 * previous_window_average, 2)
    )
    score_velocity = 0.5 if rule_velocity else 0.0

    # 4. Dormant Account
    account = await db.accounts.find_one({"account_id": sender_id})
    last_active = None
    
    if account and account.get("last_active_at"):
        last_active = account.get("last_active_at")
    else:
        latest_tx = await db.transactions.find_one(
            {"sender_id": sender_id, "timestamp": {"$lt": timestamp}},
            sort=[("timestamp", -1)]
        )
        if latest_tx and latest_tx.get("timestamp"):
            last_active = latest_tx["timestamp"]
            
    days_since_last_activity = 0.0
    if last_active:
        if last_active.tzinfo is not None:
            last_active = last_active.astimezone(timezone.utc).replace(tzinfo=None)
        
        time_diff = timestamp - last_active
        days_since_last_activity = time_diff.total_seconds() / 86400.0
        rule_dormant = (days_since_last_activity >= 90.0)
    else:
        rule_dormant = False
        
    score_dormant = 0.4 if rule_dormant else 0.0

    # 5. Multi-Receiver
    five_mins_ago = timestamp - timedelta(minutes=5)
    recent_txs_5m = await db.transactions.find({
        "sender_id": sender_id,
        "timestamp": {"$gte": five_mins_ago, "$lt": timestamp}
    }).to_list(length=100)
    
    receivers = {tx["receiver_id"] for tx in recent_txs_5m if "receiver_id" in tx}
    receivers.add(receiver_id)
    distinct_receivers_in_5min = len(receivers)
    transactions_last_5min = len(recent_txs_5m) + 1
    
    rule_multi_receiver = (distinct_receivers_in_5min >= 3)
    score_multi_receiver = 0.3 if rule_multi_receiver else 0.0

    # 6. Rapid Outflow (Layering Detection)
    # Check if sender received money recently (last 24h) and is now sending it out
    twenty_four_hours_ago = timestamp - timedelta(hours=24)
    recent_inbound = await db.transactions.find({
        "receiver_id": sender_id,
        "timestamp": {"$gte": twenty_four_hours_ago, "$lt": timestamp}
    }).to_list(length=100)
    
    total_received_24h = sum(tx.get("amount", 0) for tx in recent_inbound)
    rule_layering = (total_received_24h > 0 and amount >= (0.8 * total_received_24h))
    score_layering = 0.5 if rule_layering else 0.0

    # 7. Money Mule Profile (High churn, low balance)
    # Check if sender's account has a lot of transactions but a very low balance relative to turnover
    # For simplicity, we check the ratio of (received / sent) for the sender in the last 7 days
    seven_days_ago = timestamp - timedelta(days=7)
    past_sent = await db.transactions.find({
        "sender_id": sender_id,
        "timestamp": {"$gte": seven_days_ago, "$lt": timestamp}
    }).to_list(length=500)
    
    past_received = await db.transactions.find({
        "receiver_id": sender_id,
        "timestamp": {"$gte": seven_days_ago, "$lt": timestamp}
    }).to_list(length=500)
    
    total_sent_7d = sum(tx.get("amount", 0) for tx in past_sent) + amount
    total_received_7d = sum(tx.get("amount", 0) for tx in past_received)
    
    # Mule indicator: High throughput but stays empty (received ~= sent)
    # If they have received > 50k and sent > 90% of it, and balance is low
    rule_mule = (total_received_7d > 50000 and total_sent_7d >= (0.9 * total_received_7d))
    score_mule = 0.4 if rule_mule else 0.0
    
    # Weight of each factor
    WEIGHTS = {
        "dormant": 0.25,
        "velocity": 0.30,
        "first_time_receiver": 0.35,
        "high_amount": 0.40,
        "multi_receiver": 0.30,
        "layering": 0.50,
        "mule": 0.40
    }

    # Confidence calculation based on data availability
    confidence_score = 1.0 if samples else 0.85

    # Tally Math determinism
    risk_score = round(score_first_time + score_high_amount + score_velocity + score_dormant + score_multi_receiver + score_layering + score_mule, 2)

    # Generate human-readable forensic reasoning with weights
    factors = []
    if rule_first_time: factors.append({"factor": "First-time receiver", "weight": WEIGHTS["first_time_receiver"], "reason": "No incoming tx in 30 days + Amount > 10k"})
    if rule_high_amount: factors.append({"factor": "High value", "weight": WEIGHTS["high_amount"], "reason": f"Transaction amount ₹{amount:,.0f} exceeds 50k threshold"})
    if rule_velocity: factors.append({"factor": "Velocity spike", "weight": WEIGHTS["velocity"], "reason": f"Current window count {current_window_count} vs baseline {previous_window_average}"})
    if rule_dormant: factors.append({"factor": "Dormancy", "weight": WEIGHTS["dormant"], "reason": f"Reactivated after {int(days_since_last_activity)} days of inactivity"})
    if rule_multi_receiver: factors.append({"factor": "Multi-receiver", "weight": WEIGHTS["multi_receiver"], "reason": f"Burst of {distinct_receivers_in_5min} distinct recipients in 5m"})
    if rule_layering: factors.append({"factor": "Layering Pattern", "weight": WEIGHTS["layering"], "reason": f"Rapid outflow detected: sending ₹{amount:,.0f} after receiving ₹{total_received_24h:,.0f} within 24h"})
    if rule_mule: factors.append({"factor": "Money Mule Profile", "weight": WEIGHTS["mule"], "reason": f"High churn: Received ₹{total_received_7d:,.0f} and sent ₹{total_sent_7d:,.0f} in 7 days"})
    
    reasoning = " | ".join([f.get("reason") for f in factors]) if factors else "Standard transaction activity."

    audit_trace = {
        "computed": {
            "days_since_last_activity": round(days_since_last_activity, 4),
            "current_window_count": current_window_count,
            "previous_window_average": previous_window_average,
            "previous_window_count": previous_window_count,
            "previous_window_samples": samples,
            "incoming_last_30_days": incoming_last_30_days,
            "distinct_receivers_in_5min": distinct_receivers_in_5min,
            "transactions_last_5min": transactions_last_5min,
            "total_received_24h": total_received_24h,
            "total_received_7d": total_received_7d,
            "total_sent_7d": total_sent_7d,
            "confidence_score": confidence_score
        },
        "factors": factors,
        "rules": {
            "dormant": rule_dormant,
            "velocity": rule_velocity,
            "first_time_receiver": rule_first_time,
            "high_amount": rule_high_amount,
            "multi_receiver": rule_multi_receiver,
            "layering": rule_layering,
            "mule": rule_mule
        },
        "score_breakdown": {
            "dormant": score_dormant,
            "velocity": score_velocity,
            "first_time_receiver": score_first_time,
            "high_amount": score_high_amount,
            "multi_receiver": score_multi_receiver,
            "layering": score_layering,
            "mule": score_mule
        },
        "final_score": risk_score
    }

    return {
        "risk_score": risk_score,
        "risk_flags": [k for k, v in audit_trace["rules"].items() if v],
        "is_high_risk": risk_score >= 0.7,
        "reasoning": reasoning,
        "confidence_score": confidence_score,
        "factors": factors,
        "audit_trace": audit_trace
    }
