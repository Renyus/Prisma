from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class MemoryConfig(BaseModel):
    enabled: bool = True
    limit: int = 5


class ChatRequest(BaseModel):
    user_id: str
    message: str
    card: Optional[Dict[str, Any]] = None
    lore: Optional[List[Dict[str, Any]]] = None

    # 调节上下文控制
    max_context_messages: Optional[int] = None
    max_context_tokens: Optional[int] = None
    model: Optional[str] = None
    summary_history_limit: Optional[int] = None
    
    # 🎨 模型生成参数 (可由前端覆盖)
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    max_tokens: Optional[int] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None

    memory_config: Optional[MemoryConfig] = None


class ChatResponse(BaseModel):
    reply: str
    systemPreview: Optional[str] = None
    usedLore: Optional[Any] = None
    model: Optional[str] = None


class ChatHistoryMessage(BaseModel):
    id: str
    role: str
    content: str
    created_at: Optional[datetime] = None


class ChatHistoryResponse(BaseModel):
    messages: List[ChatHistoryMessage]
