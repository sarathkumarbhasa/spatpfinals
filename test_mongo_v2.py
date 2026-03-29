import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

async def test_mongo():
    # Try multiple possible .env locations
    dotenv_paths = [".env", "backend/.env", "../backend/.env"]
    for path in dotenv_paths:
        if os.path.exists(path):
            load_dotenv(path)
            print(f"Loaded .env from {path}")
            break
            
    url = os.getenv("MONGODB_URL")
    db_name = os.getenv("DATABASE_NAME")
    
    if not url:
        print("ERROR: MONGODB_URL not found in environment variables")
        return

    print(f"Attempting to connect to: {url.split('@')[-1]} / {db_name}")
    try:
        client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=5000)
        await client.admin.command('ping')
        print("SUCCESS: MongoDB connection established")
        db = client[db_name]
        collections = await db.list_collection_names()
        print(f"Collections found: {collections}")
        client.close()
    except Exception as e:
        print(f"FAILED: MongoDB connection error: {e}")

if __name__ == "__main__":
    asyncio.run(test_mongo())
