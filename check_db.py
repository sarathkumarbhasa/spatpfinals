import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Load env from backend
load_dotenv(os.path.join(os.getcwd(), "backend", ".env"))

async def check():
    url = os.getenv("MONGODB_URL")
    db_name = os.getenv("DATABASE_NAME")
    print(f"Connecting to {url} / {db_name}")
    client = AsyncIOMotorClient(url)
    db = client[db_name]
    count = await db.transactions.count_documents({})
    print(f"Transactions Count: {count}")
    
    # List high risk tx
    high_risk_tx = await db.transactions.find_one({"is_high_risk": True})
    print(f"High Risk Tx: {high_risk_tx}")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(check())
