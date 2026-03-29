from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, timezone
from typing import List

class TransactionBase(BaseModel):
    sender_id: str
    receiver_id: str
    amount: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    withdrawal_type: str = "UPI" # Default value

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: str
    risk_score: float
    risk_flags: List[str]
    is_high_risk: bool

    model_config = ConfigDict(populate_by_name=True)
