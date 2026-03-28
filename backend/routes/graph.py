from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from database import get_db
from services.graph_engine import build_account_graph

router = APIRouter()

@router.get("/", response_model=dict)
async def get_graph(account_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        graph_data = await build_account_graph(db, account_id)
        
        return {
            "success": True,
            "data": graph_data,
            "error": None
        }
    except Exception as e:
        return {"success": False, "data": {}, "error": str(e)}
