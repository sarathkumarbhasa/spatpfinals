from pydantic import BaseModel
from datetime import datetime

class Account(BaseModel):
    account_id: str
    last_active_at: datetime
