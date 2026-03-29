import requests
import json

def test_load():
    url = "http://127.0.0.1:8000/transactions/load-real-case"
    try:
        print(f"Calling POST {url}...")
        response = requests.post(url, timeout=60)
        print(f"Status Code: {response.status_code}")
        print("Response Content:")
        print(json.dumps(response.json(), indent=2))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_load()
