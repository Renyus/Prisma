from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class MemoryConfig(BaseModel):
    enabled: bool = True
    limit: int = 5


class TokenStats(BaseModel):
    """Token 统计信息"""
    system: int = 0  # 系统提示词 token 数
    user: int = 0    # 用户输入 token 数
    history: int = 0 # 历史记录 token 数
    budget_left: int = 0  # 剩余预算
    model_limits: Dict[str, Any] = {}  # 模型限制信息
    lore_budget: int = 0  # 世界书预算
    estimation_method: str = "manual_conservative"  # 估算方法
    smart_context_used: bool = False  # 是否使用智能上下文
    smart_context_tokens: int = 0  # 智能上下文 token 数


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


class TriggeredLoreEntry(BaseModel):
    """触发的世界书条目"""
    id: str
    content: str
    type: str  # "vector" | "keyword"
    title: Optional[str] = None
    priority: Optional[int] = None


class ChatResponse(BaseModel):
    reply: str
    systemPreview: Optional[str] = None
    usedLore: Optional[Any] = None
    triggered_entries: Optional[List[TriggeredLoreEntry]] = None  # 新增触发的世界书条目
    model: Optional[str] = None
    tokenStats: Optional[TokenStats] = None  # 新增 token 统计信息


class ChatHistoryMessage(BaseModel):
    id: str
    role: str
    content: str
    created_at: Optional[datetime] = None


class ChatHistoryResponse(BaseModel):
    messages: List[ChatHistoryMessage]
