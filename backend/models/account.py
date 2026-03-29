from pydantic import BaseModel
from datetime import datetime

class Account(BaseModel):
    account_id: str
    last_active_at: datetime
    total_looted_amount: float = 0.0
