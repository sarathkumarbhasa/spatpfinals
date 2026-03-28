import json
import requests
import time

BASE_URL = "http://127.0.0.1:8000"

def run_test():
    try:
        with open("test_dataset.json", "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Error: test_dataset.json not found")
        return

    if isinstance(data, dict) and "transactions" in data:
        data = data["transactions"]

    print(f"Starting ingestion of {len(data)} transactions...")
    
    results = []
    for tx in data:
        payload = {
            "sender_id": tx["sender_id"],
            "receiver_id": tx["receiver_id"],
            "amount": tx["amount"],
            "timestamp": tx["timestamp"]
        }
        
        try:
            response = requests.post(f"{BASE_URL}/transactions/", json=payload, timeout=10)
            if response.status_code == 200:
                res_json = response.json()
                if res_json["success"]:
                    tx_res = res_json["data"]
                    print(f"Ingested TX: {tx['sender_id']} -> {tx['receiver_id']} | Amount: {tx['amount']} | Score: {tx_res['risk_score']} | High Risk: {tx_res['is_high_risk']}")
                    results.append(tx_res)
                else:
                    print(f"Failed to ingest TX: {res_json['error']}")
            else:
                print(f"HTTP Error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Connection Error: {e}")
            break
        
        time.sleep(1)

    print("\n--- Summary ---")
    high_risk_count = sum(1 for r in results if r["is_high_risk"])
    print(f"Total Ingested: {len(results)}")
    print(f"High Risk Detected: {high_risk_count}")
    
    if high_risk_count > 0:
        print("\nHigh Risk Transactions:")
        for r in results:
            if r["is_high_risk"]:
                print(f"  - {r['sender_id']} -> {r['receiver_id']} | Score: {r['risk_score']} | Flags: {r['risk_flags']}")

if __name__ == "__main__":
    run_test()
