# app/services/chat_export_service.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.crud import chat as chat_crud
from app.schemas.chat_export import (
    ChatExportPayload,
    ChatImportPayload,
    MessageExport,
    SessionExport,
    SessionMeta,
    CharacterCardExport,
)


def _db_get_all_messages(db: Session, user_id: str) -> List[Dict[str, Any]]:
    """
    从 SQLite 中读出某个 user_id 的所有消息，按时间正序。
    """
    records = chat_crud.get_all_chat_history(db, user_id=user_id)

    result: List[Dict[str, Any]] = []
    for r in records:
        result.append(
            {
                "id": getattr(r, "id", None),
                "role": getattr(r, "role", "user"),
                "content": getattr(r, "content", "") or "",
                "created_at": getattr(r, "created_at", None),
                # 目前 ChatMessage 没有 meta 字段，先用空 dict 预留
                "meta": {},
            }
        )
    return result


def _db_insert_message(
    db: Session,
    user_id: str,
    role: str,
    content: str,
    created_at: Optional[datetime],
    meta: Optional[Dict[str, Any]] = None,
) -> None:
    """
    向 SQLite 中插入一条消息。

    - 实际插入委托给 chat_crud.create_chat_message
    - created_at / meta 暂时忽略，由模型默认值处理
    """
    chat_crud.create_chat_message(db, user_id=user_id, role=role, content=content)
    # commit 由上层控制


def export_chat_to_payload(
    db: Session,
    user_id: str,
    session_id: Optional[str] = None,
    *,
    character_card: Optional[CharacterCardExport] = None,
    session_meta: Optional[SessionMeta] = None,
    character_id: Optional[str] = None,  # <--- 我们需要用到这个参数
    character_name: Optional[str] = None,
    lorebook_id: Optional[str] = None,
    lorebook_name: Optional[str] = None,
) -> ChatExportPayload:
    """
    导出某个 user_id 的完整聊天记录。
    已修复：自动处理 'user_id::card::char_id' 格式的复合 ID。
    """
    
    # --- 🛠️ FIX START: 自动修正 ID 逻辑 ---
    target_id = user_id
    
    # 如果传了 character_id，且 user_id 里没有包含 "::card::"
    # 说明前端传的是原始 user_id ("local-user")，我们需要手动拼接
    if character_id and "::card::" not in user_id:
        target_id = f"{user_id}::card::{character_id}"
    # --- 🛠️ FIX END ---

    # 使用修正后的 target_id 去查数据库
    raw_messages = _db_get_all_messages(db, user_id=target_id)

    message_exports: List[MessageExport] = []
    for m in raw_messages:
        message_exports.append(
            MessageExport(
                id=m.get("id"),
                role=m.get("role", "user"),
                content=m.get("content", "") or "",
                created_at=m.get("created_at"),
                meta=m.get("meta") or {},
            )
        )

    session_export = SessionExport(
        session_id=session_id or user_id,
        title=None,
        created_at=None,
        character_id=character_id,
        character_name=character_name,
        lorebook_id=lorebook_id,
        lorebook_name=lorebook_name,
        meta=session_meta or SessionMeta(),
    )

    payload = ChatExportPayload(
        version=1,
        exported_at=datetime.utcnow(),
        app={
            "name": "local-llm-rp",
            "backend": "fastapi",
            "db": "sqlite",
        },
        session=session_export,
        messages=message_exports,
        character_card=character_card,
        lorebook_hits=[],
    )

    return payload

def import_chat_from_payload(
    db: Session,
    user_id: str,
    payload: ChatImportPayload,
) -> str:
    """
    从已经解析好的 ChatImportPayload 写一份会话到 SQLite。

    - user_id 决定导入到哪一段会话（一般是 session_id）
    - 返回值会返回 payload.session.session_id 或 user_id
    """
    if payload.version != 1:
        raise ValueError(f"Unsupported export version: {payload.version}")

    for msg in payload.messages:
        _db_insert_message(
            db=db,
            user_id=user_id,
            role=msg.role,
            content=msg.content,
            created_at=msg.created_at,
            meta=msg.meta,
        )

    # 暂时只在 DB 里恢复消息，角色名 / 世界书名留给前端自己用 payload 还原 UI
    return payload.session.session_id or user_id
