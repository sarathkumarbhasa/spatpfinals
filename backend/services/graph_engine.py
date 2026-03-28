import networkx as nx
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timedelta, timezone
import asyncio

async def build_account_graph(db: AsyncIOMotorDatabase, root_account_id: str) -> dict:
    G = nx.DiGraph()
    
    # Financial state tracking
    balances = {} # {account_id: {"received": 0, "sent": 0}}
    
    # Time-aware edge tracking for rapid transfer detection
    tx_times = [] # List of (timestamp, sender, receiver, amount, type, id, risk)
    
    # 1. Fetch all related transactions in the last year to build state
    one_year_ago = datetime.now(timezone.utc) - timedelta(days=365)
    
    cursor = db.transactions.find({"timestamp": {"$gte": one_year_ago.replace(tzinfo=None)}}).sort("timestamp", 1)
    all_txs = await cursor.to_list(length=5000)
    
    for tx in all_txs:
        s, r = tx["sender_id"], tx["receiver_id"]
        amt = float(tx.get("amount", 0))
        ts = tx.get("timestamp")
        
        # Update balances
        if s not in balances: balances[s] = {"received": 0, "sent": 0}
        if r not in balances: balances[r] = {"received": 0, "sent": 0}
        balances[s]["sent"] += amt
        balances[r]["received"] += amt
        
        tx_times.append({
            "ts": ts,
            "s": s,
            "r": r,
            "amt": amt,
            "id": str(tx["_id"]),
            "risk": tx.get("risk_score", 0),
            "status": tx.get("status", "NORMAL"),
            "reasoning": tx.get("reasoning", ""),
            "factors": tx.get("factors", []),
            "confidence": tx.get("confidence_score", 1.0)
        })

    # 2. Build graph and compute depth (BFS from root)
    for tx in tx_times:
        G.add_edge(tx["s"], tx["r"], weight=tx["amt"], timestamp=tx["ts"], risk=tx["risk"], id=tx["id"], status=tx["status"], reasoning=tx["reasoning"], factors=tx["factors"], confidence=tx["confidence"])

    # BFS for depth
    queue = [(root_account_id, 0)]
    visited = {root_account_id}
    depth_map = {root_account_id: 0}
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
    
    for acc_id in visited:
        bal = balances.get(acc_id, {"received": 0, "sent": 0})
        sent = bal["sent"]
        received = bal["received"]
        
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
        
        if acc_profile:
            if acc_profile.get("status") == "FRAUD_CONFIRMED":
                node_status = "FRAUD_CONFIRMED"
                node_risk = 1.0
                node_reasoning = acc_profile.get("reasoning", node_reasoning)
            elif acc_profile.get("status") == "HOLD":
                node_status = "HOLD"

        # Intelligence Layer Status Logic
        # MAPL (Pre-Fraud)
        mapl_active = node_risk >= 0.7 or (acc_profile and acc_profile.get("risk_profile") == "high")
        mapl_reason = node_reasoning if mapl_active else "Baseline behavioral profile normal."
        mapl_action = "Velocity cap & enhanced monitoring applied." if mapl_active else "None."

        # VACT (Fraud Moment)
        vact_active = node_status in ["HOLD", "FRAUD_CONFIRMED"]
        affected_nodes = list(nx.descendants(G, acc_id)) if vact_active else []
        
        # FFAP (Post-Fraud)
        # Check if there are cross-bank indicators (e.g. large outgoing IMPS)
        ffap_active = vact_active and any(t["amt"] > 20000 for t in node_txs if t["s"] == acc_id)
        
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
            timeline.append({"time": datetime.now().strftime("%H:%M:%S"), "event": "Freeze applied", "detail": "VACT Layer triggered"})

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
                    "lost": lost
                },
                "intelligence": {
                    "mapl": {
                        "status": "ACTIVE" if mapl_active else "INACTIVE",
                        "reason": mapl_reason,
                        "action": mapl_action
                    },
                    "vact": {
                        "status": "ACTIVE" if vact_active else "INACTIVE",
                        "source": "System/Victim" if node_status == "HOLD" else "None",
                        "affected": len(affected_nodes),
                        "targets": affected_nodes[:3] # Show first 3 targets
                    },
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
                    "type": "UPI" if tx["amt"] < 50000 else "IMPS",
                    "time_delta": delta_seconds,
                    "is_rapid": is_rapid,
                    "risk_score": tx["risk"]
                }
            })

    return {
        "nodes": nodes_data,
        "edges": edges_data
    }
