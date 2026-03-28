import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def clear_db():
    # Explicitly use 127.0.0.1 and the known DB name
    client = AsyncIOMotorClient("mongodb://127.0.0.1:27017")
    db = client["fraud_detection"]
    print("Clearing collections...")
    await db.transactions.delete_many({})
    await db.accounts.delete_many({})
    print("Cleanup complete.")
    client.close()

if __name__ == "__main__":
    asyncio.run(clear_db())
