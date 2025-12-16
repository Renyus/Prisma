from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class MemoryCreate(BaseModel):
    user_id: str
    content: str
    importance: int = Field(default=1, ge=1, le=5, description="记忆重要性 1-5")

class MemoryResponse(BaseModel):
    id: str
    user_id: str
    content: str
    importance: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True  # 让 Pydantic 可以直接读取 SQLAlchemy 模型