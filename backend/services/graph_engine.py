import networkx as nx
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta, timezone
import asyncio

async def build_account_graph(db: AsyncIOMotorDatabase, root_account_id: str) -> dict:
    G = nx.DiGraph()
    
    # Financial state tracking
    balances = {} # {account_id: {"received": 0, "sent": 0, "looted": 0}}
    
    # Time-aware edge tracking for rapid transfer detection
    tx_times = [] # List of (timestamp, sender, receiver, amount, type, id, risk)
    
    # 1. Fetch all transactions to build state (No time filter for forensic completeness)
    cursor = db.transactions.find({}).sort("timestamp", 1)
    all_txs = await cursor.to_list(length=10000)
    
    for tx in all_txs:
        s, r = tx["sender_id"], tx["receiver_id"]
        amt = float(tx.get("amount", 0))
        ts = tx.get("timestamp")
        is_fraud = tx.get("risk_score", 0) >= 0.7 or tx.get("status") == "HOLD"
        
        # Update balances
        if s not in balances: balances[s] = {"received": 0, "sent": 0, "looted": 0}
        if r not in balances: balances[r] = {"received": 0, "sent": 0, "looted": 0}
        balances[s]["sent"] += amt
        balances[r]["received"] += amt
        
        if is_fraud:
            balances[s]["looted"] += amt
        
        tx_times.append({
            "ts": ts,
            "s": s,
            "r": r,
            "amt": amt,
            "id": str(tx["_id"]),
            "withdrawal_type": tx.get("withdrawal_type", "UPI"),
            "risk": tx.get("risk_score", 0),
            "status": tx.get("status", "NORMAL"),
            "reasoning": tx.get("reasoning", ""),
            "factors": tx.get("factors", []),
            "confidence": tx.get("confidence_score", 1.0)
        })

    # 2. Build graph and compute depth (BFS from root)
    for tx in tx_times:
        G.add_edge(tx["s"], tx["r"], weight=tx["amt"], timestamp=tx["ts"], risk=tx["risk"], id=tx["id"], status=tx["status"], reasoning=tx["reasoning"], factors=tx["factors"], confidence=tx["confidence"], withdrawal_type=tx["withdrawal_type"])

    # BFS for depth
    # Find all victim accounts to use as roots if the specified root is a victim
    victim_accounts = await db.accounts.find({"is_victim": True}).to_list(length=10)
    victim_ids = [acc["account_id"] for acc in victim_accounts]
    
    # Calculate unique looted amount from victims only to avoid double counting
    unique_looted = 0
    victim_processed_txs = set()

    for tx in tx_times:
        if tx["s"] in victim_ids and tx["id"] not in victim_processed_txs:
            # Check if this transaction is high risk or confirmed fraud
            if tx["risk"] >= 0.7 or tx["status"] == "HOLD":
                unique_looted += tx["amt"]
                victim_processed_txs.add(tx["id"])

    roots = [root_account_id]
    if root_account_id in victim_ids:
        roots = victim_ids
    
    queue = [(rid, 0) for rid in roots if rid in G.nodes]
    visited = set(rid for rid in roots if rid in G.nodes)
    depth_map = {rid: 0 for rid in roots if rid in G.nodes}
    
    while queue:
        curr, depth = queue.pop(0)
        depth_map[curr] = depth
        if depth < 5:
            for neighbor in G.successors(curr):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, depth + 1))

    # 3. Enrich edges and nodes
    nodes_data = []
    edges_data = []
    
    # Calculate min/max looted for color coding
    looted_amounts = [b["looted"] for b in balances.values() if b["looted"] > 0]
    max_looted = max(looted_amounts) if looted_amounts else 0
    min_looted = min(looted_amounts) if looted_amounts else 0

    for acc_id in visited:
        bal = balances.get(acc_id, {"received": 0, "sent": 0, "looted": 0})
        sent = bal["sent"]
        received = bal["received"]
        looted = bal["looted"]
        
        current_balance = received - sent
        recoverable = max(0, current_balance)
        lost = sent 
        
        node_txs = [t for t in tx_times if t["s"] == acc_id or t["r"] == acc_id]
        max_risk = max([t["risk"] for t in node_txs]) if node_txs else 0
        best_tx = next((t for t in node_txs if t["risk"] == max_risk), node_txs[0] if node_txs else {})
        
        acc_profile = await db.accounts.find_one({"account_id": acc_id})
        
        node_status = best_tx.get("status", "NORMAL")
        node_risk = max_risk
        node_reasoning = best_tx.get("reasoning", "")
        
        # Color coding logic
        node_color = "default"
        if looted > 0:
            if looted == max_looted:
                node_color = "max_looted" # Dark Red
            elif looted == min_looted:
                node_color = "min_looted" # Green
            else:
                node_color = "looted" # Medium Red/Orange
        elif received > 0 and looted == 0:
             node_color = "safe" # Green

        if acc_profile:
            if acc_profile.get("status") == "FRAUD_CONFIRMED":
                node_status = "FRAUD_CONFIRMED"
                node_risk = 1.0
                node_reasoning = acc_profile.get("reasoning", node_reasoning)
            elif acc_profile.get("status") == "HOLD":
                node_status = "HOLD"

        # Intelligence Layer Status Logic (Simplified per updated requirements)
        # FFAP (Post-Fraud) - Layer 3
        is_high_risk = node_status in ["HOLD", "FRAUD_CONFIRMED"]
        ffap_active = is_high_risk and any(t["amt"] > 20000 for t in node_txs if t["s"] == acc_id)
        
        # System Trace Timeline
        timeline = []
        for t in sorted(node_txs, key=lambda x: x["ts"]):
            action = "Received" if t["r"] == acc_id else "Sent"
            timeline.append({
                "time": t["ts"].strftime("%H:%M:%S"),
                "event": f"₹{t['amt']:,.0f} {action.lower()}",
                "detail": f"{'To' if action == 'Sent' else 'From'} {t['r'] if action == 'Sent' else t['s']}"
            })
        if node_status == "HOLD":
            timeline.append({"time": datetime.now().strftime("%H:%M:%S"), "event": "Freeze applied", "detail": "FFAP Layer tracking active"})

        nodes_data.append({
            "id": acc_id,
            "data": {
                "label": acc_id,
                "depth": depth_map[acc_id],
                "risk_score": node_risk,
                "status": node_status,
                "reasoning": node_reasoning,
                "factors": best_tx.get("factors", []),
                "confidence": best_tx.get("confidence", 1.0),
                "is_new_account": (acc_profile.get("risk_profile") == "high") if acc_profile else (sent > 50000),
                "is_unknown_account": not bool(acc_profile),
                "financials": {
                    "received": received,
                    "sent": sent,
                    "balance": current_balance,
                    "recoverable": recoverable,
                    "lost": lost,
                    "total_looted_amount": looted
                },
                "node_color_type": node_color,
                "intelligence": {
                    "ffap": {
                        "status": "ACTIVE" if ffap_active else "INACTIVE",
                        "recoverable": recoverable,
                        "lost": lost
                    }
                },
                "timeline": timeline
            }
        })

    sorted_txs = sorted(tx_times, key=lambda x: x["ts"])
    last_tx_at_account = {} 

    for tx in sorted_txs:
        if tx["s"] in visited and tx["r"] in visited:
            prev_recv_ts = last_tx_at_account.get(tx["s"])
            delta_seconds = (tx["ts"] - prev_recv_ts).total_seconds() if prev_recv_ts else None
            last_tx_at_account[tx["r"]] = tx["ts"] 
            
            is_rapid = delta_seconds is not None and delta_seconds < 60
            
            edges_data.append({
                "id": tx["id"],
                "source": tx["s"],
                "target": tx["r"],
                "label": f"₹{tx['amt']:,.0f}",
                "data": {
                    "amount": tx["amt"],
                    "timestamp": tx["ts"].isoformat(),
                    "type": tx["withdrawal_type"],
                    "time_delta": delta_seconds,
                    "is_rapid": is_rapid,
                    "risk_score": tx["risk"]
                }
            })

    return {
        "nodes": nodes_data,
        "edges": edges_data,
        "summary": {
            "total_looted": unique_looted,
            "total_recoverable": sum(max(0, balances[acc_id]["received"] - balances[acc_id]["sent"]) for acc_id in visited),
            "high_risk_nodes": sum(1 for n in nodes_data if n["data"]["risk_score"] >= 0.7),
            "rapid_transfers": sum(1 for e in edges_data if e["data"].get("is_rapid")),
            "total_accounts": len(visited),
            "total_transactions": len(edges_data)
        }
    }
