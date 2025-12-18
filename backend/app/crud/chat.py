from datetime import datetime
from typing import Iterable
from uuid import uuid4

from sqlalchemy.orm import Session

from app.db import models as db_models


def get_recent_chat_history(db: Session, user_id: str, limit: int = 1000, include_archived: bool = False):
    """
    获取某个 user_id 最近的对话记录。
    include_archived: 是否包含已归档的消息，默认为 False（只返回未归档的消息）
    """
    query = db.query(db_models.ChatMessage).filter(db_models.ChatMessage.user_id == user_id)
    
    # 如果不包含已归档的消息，则过滤掉
    if not include_archived:
        query = query.filter(db_models.ChatMessage.is_archived == False)
    
    recent_records = (
        query.order_by(db_models.ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(recent_records))


def create_chat_message(
    db: Session,
    user_id: str,
    role: str,
    content: str,
    created_at: datetime | None = None,
):
    """
    保存单条消息，保持事务风格与调用方一致。
    """
    message = db_models.ChatMessage(
        id=uuid4().hex,
        user_id=user_id,
        role=role,
        content=content,
    )
    if created_at:
        message.created_at = created_at
    db.add(message)
    return message


def delete_chat_messages_by_ids(db: Session, ids: Iterable[str]) -> int:
    """根据 id 批量删除消息（用于自动摘要后清理老条目）。"""
    if not ids:
        return 0
    deleted = (
        db.query(db_models.ChatMessage)
        .filter(db_models.ChatMessage.id.in_(ids))
        .delete(synchronize_session=False)
    )
    return deleted


def delete_chat_history_by_user_id(db: Session, user_id: str) -> int:
    """
    删除某个 user_id 的所有聊天记录。
    """
    deleted = (
        db.query(db_models.ChatMessage)
        .filter(db_models.ChatMessage.user_id == user_id)
        .delete(synchronize_session=False)
    )
    return deleted


def delete_chat_history_by_prefix(db: Session, user_id_prefix: str) -> int:
    """
    删除 user_id 以指定前缀开头的所有 chat message。
    """
    deleted = (
        db.query(db_models.ChatMessage)
        .filter(db_models.ChatMessage.user_id.startswith(user_id_prefix))
        .delete(synchronize_session=False)
    )
    return deleted


def get_all_chat_history(db: Session, user_id: str):
    """返回完整对话历史记录（正序）。"""
    return (
        db.query(db_models.ChatMessage)
        .filter(db_models.ChatMessage.user_id == user_id)
        .order_by(db_models.ChatMessage.created_at.asc())
        .all()
    )


def archive_chat_messages_by_ids(db: Session, ids: Iterable[str]) -> int:
    """根据 id 批量归档消息（将 is_archived 设为 True）。"""
    if not ids:
        return 0
    archived = (
        db.query(db_models.ChatMessage)
        .filter(db_models.ChatMessage.id.in_(ids))
        .update({db_models.ChatMessage.is_archived: True}, synchronize_session=False)
    )
    return archived


def get_archived_chat_history(db: Session, user_id: str, limit: int = 1000):
    """获取某个 user_id 的已归档对话记录。"""
    archived_records = (
        db.query(db_models.ChatMessage)
        .filter(db_models.ChatMessage.user_id == user_id)
        .filter(db_models.ChatMessage.is_archived == True)
        .order_by(db_models.ChatMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(archived_records))


def unarchive_chat_messages_by_ids(db: Session, ids: Iterable[str]) -> int:
    """根据 id 批量取消归档消息（将 is_archived 设为 False）。"""
    if not ids:
        return 0
    unarchived = (
        db.query(db_models.ChatMessage)
        .filter(db_models.ChatMessage.id.in_(ids))
        .update({db_models.ChatMessage.is_archived: False}, synchronize_session=False)
    )
    return unarchived
