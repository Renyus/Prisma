# app/schemas/prompt_debug.py
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class PromptDebugRequest(BaseModel):
    user_id: str
    message: str
    card: Optional[Dict[str, Any]] = None
    lore: Optional[List[Dict[str, Any]]] = None

    # 跟正式接口一样，可以传上下文长度配置；不传就用默认
    max_context_messages: Optional[int] = None
    max_context_tokens: Optional[int] = None


class PromptDebugResponse(BaseModel):
    # 拼好的 system
    systemPrompt: str
    # 真正发给 AI 的 messages（system + history + user）
    messages: List[Dict[str, Any]]
    # 世界书预览（你前端也在用）
    usedLore: Optional[Any] = None
    # 元信息：用来检查“省 token”是否生效
    meta: Dict[str, Any]
