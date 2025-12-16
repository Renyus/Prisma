# app/api/prompt_debug.py
from __future__ import annotations

from typing import Dict, List, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.crud import chat as chat_crud
from app.schemas.prompt_debug import PromptDebugRequest, PromptDebugResponse
from app.services.prompt_builder import build_normalized_prompt

router = APIRouter(prefix="/debug", tags=["Debug"])


# 这些默认值只影响“调试接口”，不会动你正式 /chat
DEFAULT_MAX_HISTORY_MSG = 30       # 默认最多查多少条历史
HARD_MAX_HISTORY_MSG = 100         # 安全硬上限
DEFAULT_MAX_HISTORY_TOKENS = 2400  # 默认历史 token 预算


@router.post("/prompt", response_model=PromptDebugResponse)
async def debug_prompt(payload: PromptDebugRequest, db: Session = Depends(get_db)):
    """
    调试专用接口：
    - 不调用 LLM
    - 不写入数据库
    - 只把当前这轮的 system + messages + lore + 统计信息返回出来
    """
    user_id = (payload.user_id or "").strip()
    message = (payload.message or "").strip()

    if not user_id:
        raise HTTPException(status_code=400, detail="user_id 不能为空")
    if not message:
        raise HTTPException(status_code=400, detail="message 不能为空")

    # 1) 读取最近 N 条历史（仅用于构造 prompt，不会改动 DB）
    history_limit = payload.max_context_messages or DEFAULT_MAX_HISTORY_MSG
    history_limit = max(0, min(history_limit, HARD_MAX_HISTORY_MSG))

    history_rows = chat_crud.get_recent_chat_history(db, user_id, limit=history_limit)
    history: List[Dict[str, str]] = [
        {"role": row.role, "content": row.content} for row in history_rows
    ]
    is_first_user_message = len(history_rows) == 0

    # 2) 调用你现有的 PromptBuilder（里面已经做了：角色卡 + 世界书 + 历史裁剪）
    max_history_tokens = payload.max_context_tokens or DEFAULT_MAX_HISTORY_TOKENS

    norm = build_normalized_prompt(
        card=payload.card or {},
        lore_entries=payload.lore or [],
        history=history,
        user_message=message,
        is_first_user_message=is_first_user_message,
        max_history_tokens=max_history_tokens,
    )

    # 注意：这里不会调 LLM，只是把“将要发给 LLM 的 messages”组出来给你看
    messages_for_llm: List[Dict[str, Any]] = [
        {"role": "system", "content": norm["systemPrompt"]},
        *norm["messages"],
    ]

    # 尝试从 norm 里拿 debug 信息；如果你的 build_normalized_prompt 没带 debug 字段，这里会是空
    debug_meta = norm.get("debug") or {}

    # 加一点当前接口层能看到的 meta（不和原来 chat 冲突）
    meta: Dict[str, Any] = {
        "historyQueried": len(history_rows),
        "maxHistoryTokens": max_history_tokens,
        **debug_meta,
    }

    return PromptDebugResponse(
        systemPrompt=norm["systemPrompt"],
        messages=messages_for_llm,
        usedLore=norm.get("loreBlock"),
        meta=meta,
    )
