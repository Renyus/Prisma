import json
from json import JSONDecodeError
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse, ChatHistoryMessage, ChatHistoryResponse
from app.schemas.chat_export import ChatExportPayload, ChatImportPayload
from app.services.chat_service import process_chat
from app.services.chat_export_service import (
    export_chat_to_payload,
    import_chat_from_payload,
)
from app.services.memory_service import analyze_chat_for_memory
from app.crud import chat as chat_crud
from app.crud import memory as memory_crud

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat_api(
    payload: ChatRequest, 
    background_tasks: BackgroundTasks, 
    db: Session = Depends(get_db)
):
    """
    发送聊天消息
    """
    # [FIX] 传入 background_tasks，以便 service 层可以添加后台任务 (如历史压缩)
    # 注意：payload 中已包含 model 字段，无需单独传参
    response = await process_chat(db, payload, background_tasks)
    
    # 🧠 触发后台记忆观察者 (Observer)
    # 只有当用户确实发了消息时才分析
    if payload.message:
        # [NEW] 提取角色名 (用于 RAG 指代消解)
        # 尝试从 card 中获取 name，如果获取不到则默认 "AI助手"
        char_name = "AI助手"
        if payload.card and isinstance(payload.card, dict):
            char_name = payload.card.get("name", "AI助手")

        # [NEW] 将 character_name 传入后台任务
        background_tasks.add_task(
            analyze_chat_for_memory,
            user_id=payload.user_id,
            user_content=payload.message,
            ai_content=response.reply,
            character_name=char_name 
        )
    
    return response


@router.delete("/history")
async def delete_chat_history(
    user_id: str,
    character_id: Optional[str] = None,
    scope: Literal["session", "card"] = "session",
    db: Session = Depends(get_db),
):
    """
    删除聊天记录。
    scope="session": 删除当前卡片的记录。
    scope="card": 删除该用户下所有卡片的记录 (清空全部)。
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id 不能为空")

    card_id = character_id or "default"
    session_id = f"{user_id}::card::{card_id}"

    try:
        if scope == "card":
            # [FIX] 清空全部：
            # 1. 删除该用户下所有聊天记录
            deleted = chat_crud.delete_chat_history_by_prefix(db, user_id)
            # 2. 删除该用户下所有记忆 (SQL + Vector) [Async]
            await memory_crud.delete_all_memories_by_user(db, user_id)
        else:
            # [FIX] 清空当前：精确匹配 session_id
            deleted = chat_crud.delete_chat_history_by_user_id(db, session_id)
        db.commit()
    except Exception as e:  # noqa: BLE001
        db.rollback()
        raise HTTPException(status_code=500, detail=f"删除失败: {e}") from e

    return {"deleted": deleted}


@router.get("/messages", response_model=ChatHistoryResponse)
def get_chat_history(
    user_id: str,
    character_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    获取指定会话的历史消息列表。
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id 不能为空")

    card_id = character_id or "default"
    session_id = f"{user_id}::card::{card_id}"
    rows = chat_crud.get_all_chat_history(db, session_id)
    return ChatHistoryResponse(
        messages=[
            ChatHistoryMessage(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at,
            )
            for msg in rows
            # 显示所有消息，包括系统摘要消息
        ]
    )


@router.get("/archived", response_model=ChatHistoryResponse)
def get_archived_messages(
    user_id: str,
    character_id: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    """
    获取指定会话的已归档消息列表。
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id 不能为空")

    card_id = character_id or "default"
    session_id = f"{user_id}::card::{card_id}"
    rows = chat_crud.get_archived_chat_history(db, session_id, limit=limit)
    return ChatHistoryResponse(
        messages=[
            ChatHistoryMessage(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                created_at=msg.created_at,
            )
            for msg in rows
        ]
    )


@router.post("/unarchive")
async def unarchive_messages(
    message_ids: list[str],
    db: Session = Depends(get_db),
):
    """
    批量取消归档消息。
    """
    if not message_ids:
        raise HTTPException(status_code=400, detail="message_ids 不能为空")

    try:
        unarchived_count = chat_crud.unarchive_chat_messages_by_ids(db, message_ids)
        db.commit()
        return {"unarchived": unarchived_count}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"取消归档失败: {e}") from e


@router.get("/export", response_model=ChatExportPayload)
async def export_chat(
    user_id: str,
    character_id: Optional[str] = None,
    character_name: Optional[str] = None,
    lorebook_id: Optional[str] = None,
    lorebook_name: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    导出指定 user_id 的完整对话为 JSON。
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id 不能为空")

    card_id = character_id or "default"
    session_id = f"{user_id}::card::{card_id}"

    try:
        payload = export_chat_to_payload(
            db=db,
            user_id=user_id,
            session_id=session_id,
            character_card=None,
            session_meta=None,
            character_id=character_id,
            character_name=character_name,
            lorebook_id=lorebook_id,
            lorebook_name=lorebook_name,
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"导出失败: {e}") from e

    return payload


@router.post("/import")
async def import_chat(
    user_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    从上传的 JSON 文件导入对话到指定 user_id。
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id 不能为空")

    if file.content_type not in (
        "application/json",
        "text/json",
        "application/octet-stream",
    ):
        raise HTTPException(status_code=400, detail="请上传 JSON 文件")

    raw = await file.read()
    try:
        payload = ChatImportPayload(**json.loads(raw))
    except JSONDecodeError:
        raise HTTPException(status_code=400, detail="JSON 格式不正确")
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=f"导入 payload 无效: {exc}") from exc

    target_session = payload.session.session_id or user_id
    character_id_from_payload = payload.session.character_id
    if "::card::" not in target_session and character_id_from_payload:
        target_session = f"{target_session}::card::{character_id_from_payload}"

    try:
        new_session_id = import_chat_from_payload(db=db, user_id=target_session, payload=payload)
        db.commit()
    except Exception as e:  # noqa: BLE001
        db.rollback()
        raise HTTPException(status_code=500, detail=f"导入失败: {e}") from e

    return JSONResponse({"status": "ok", "session_id": new_session_id})
