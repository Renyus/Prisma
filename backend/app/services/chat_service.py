# backend/app/services/chat_service.py

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.llm import call_llm, call_summary_llm
from app.core.vector_store import vector_store
from app.db import models as db_models
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.payload_builder import to_openai_payload
from app.services.prompt_builder import build_normalized_prompt
from app.crud import chat as chat_crud
from app.crud import memory as memory_crud
from app.crud import lorebook as lorebook_crud

# 强制显示 INFO 日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 默认配置
DEFAULT_MAX_HISTORY_MSG = 30
HARD_MAX_HISTORY_MSG = 100
DEFAULT_MAX_HISTORY_TOKENS = 2400
DEFAULT_MODEL = settings.CHAT_MODEL
MAX_MEMORY_CHARS = 2000 

async def _run_compact_history_task(db: Session, session_id: str):
    """
    后台压缩历史记录任务
    注意: 这里的 db session 必须确保在任务执行时未被关闭。
    """
    try:
        await _maybe_compact_history(db, session_id)
    except Exception as e:
        logger.error(f"后台摘要任务失败: {e}")

async def _maybe_compact_history(db: Session, session_id: str) -> None:
    threshold = settings.SUMMARY_HISTORY_THRESHOLD
    if threshold <= 0:
        return

    total_count = (
        db.query(db_models.ChatMessage)
        .filter(db_models.ChatMessage.user_id == session_id)
        .count()
    )
    excess = max(total_count - threshold, 0)
    if excess <= 0:
        return

    # 获取最旧的消息用于生成摘要
    oldest_entries = (
        db.query(db_models.ChatMessage)
        .filter(db_models.ChatMessage.user_id == session_id)
        .order_by(db_models.ChatMessage.created_at.asc())
        .limit(excess)
        .all()
    )
    if not oldest_entries:
        return

    summary_sources = [
        {"role": entry.role, "content": entry.content}
        for entry in oldest_entries
        if entry.content
    ]
    if not summary_sources:
        return

    try:
        summary_text = (await call_summary_llm(summary_sources)).strip()
    except Exception as exc:
        logger.warning("Summary 压缩失败: %s", exc)
        return

    if not summary_text:
        return

    # 删除旧消息
    ids_to_delete = [entry.id for entry in oldest_entries if entry.id]
    if not ids_to_delete:
        return

    chat_crud.delete_chat_messages_by_ids(db, ids_to_delete)

    # 计算摘要插入的时间点（放在保留下来的第一条消息之前微秒级）
    earliest_retained_entry = (
        db.query(db_models.ChatMessage)
        .filter(db_models.ChatMessage.user_id == session_id)
        .order_by(db_models.ChatMessage.created_at.asc())
        .offset(excess)
        .limit(1)
        .first()
    )

    summary_timestamp = datetime.utcnow()
    if earliest_retained_entry and earliest_retained_entry.created_at:
         summary_timestamp = earliest_retained_entry.created_at - timedelta(microseconds=1)

    # 插入摘要作为 System 消息 (或者专门的 summary 类型，取决于你的实现，这里保持 System)
    chat_crud.create_chat_message(
        db,
        session_id,
        "system", 
        f"【历史摘要】\n{summary_text}",
        created_at=summary_timestamp,
    )
    db.commit()


async def process_chat(
    db: Session, 
    payload: ChatRequest, 
    background_tasks: BackgroundTasks, 
    model: Optional[str] = None 
) -> ChatResponse:
    # 1. 获取启用的 System Modules (时间、天气等)
    active_modules = (
        db.query(db_models.SystemPromptModule)
        .filter(db_models.SystemPromptModule.is_enabled == True)
        .order_by(db_models.SystemPromptModule.position.asc())
        .all()
    )
    
    # 预处理：替换变量 (例如 {char_name})
    char_name = payload.card.get("name", "Character") if payload.card else "Character"
    processed_modules = []
    for mod in active_modules:
        try:
            content = mod.content.format(char_name=char_name)
            processed_modules.append(content)
        except KeyError:
            processed_modules.append(mod.content)
            logger.warning(f"模块 {mod.name} 格式化失败，使用原文。")

    """
    单轮消息主流程
    """
    card_id = payload.card.get("id") if payload.card else "default"
    session_id = f"{payload.user_id}::card::{card_id}"
    message = (payload.message or "").strip()
    
    # 2. 确定模型及其参数限制 (核心修改点)
    model_name = getattr(payload, "model", None) or DEFAULT_MODEL
    
    # 尝试从 Config 获取该模型的限制 (兼容旧 Config)
    if hasattr(settings, "get_model_limit"):
        model_limits = settings.get_model_limit(model_name)
    else:
        # Fallback: 如果 Config 还没更新，使用旧逻辑 + 默认 Output
        fallback_ctx = getattr(settings, "MAX_MODEL_CONTEXT_LENGTH", 4096)
        model_limits = {
            "context_window": fallback_ctx,
            "max_output": 1024, # 默认预留 1k 给回复
            "safety_buffer": 200
        }

    logger.info(f"👉 [Chat请求] User: {payload.user_id} | Model: {model_name} | Limits: {model_limits}")

    if not session_id:
        raise HTTPException(status_code=400, detail="session_id 不能为空")
    if not message:
        raise HTTPException(status_code=400, detail="message 不能为空")

    # 3. 历史记录获取与处理
    history_limit = payload.max_context_messages or DEFAULT_MAX_HISTORY_MSG
    history_limit = max(0, min(history_limit, HARD_MAX_HISTORY_MSG))
    
    fetch_limit = max(history_limit, 1)
    history_rows = chat_crud.get_recent_chat_history(db, session_id, limit=fetch_limit)
    
    # 分离历史消息中的 Summary (System) 和对话 (User/Assistant)
    raw_history: List[Dict[str, Any]] = [
        {"id": r.id, "role": r.role, "content": r.content, "created_at": r.created_at}
        for r in history_rows
    ]
    
    clean_history = []
    summary_list = []
    
    for msg in raw_history:
        if msg["role"] == "system" and "摘要" in (msg["content"] or ""):
            # 简单判断是否为摘要消息，提取内容
            summary_list.append(msg["content"])
        else:
            clean_history.append(msg)
            
    history_summary = "\n\n".join(summary_list) if summary_list else None

    # [修复] 重新定义 history_for_prompt
    history_for_prompt = clean_history[-history_limit:] if history_limit else clean_history

    # 4. RAG 记忆检索 (Memory)
    relevant_memories = []
    rag_enabled = True
    rag_limit = 5
    
    if payload.memory_config:
        rag_enabled = payload.memory_config.enabled
        rag_limit = payload.memory_config.limit

    if rag_enabled:
        try:
            relevant_memories_objs = await memory_crud.search_memories(
                db, payload.user_id, message, limit=rag_limit
            )
            
            current_chars = 0
            for m in relevant_memories_objs:
                if current_chars + len(m.content) > MAX_MEMORY_CHARS:
                    break
                relevant_memories.append(m.content)
                current_chars += len(m.content)
            
            if relevant_memories:
                logger.info(f"[{session_id}] Memory RAG 注入: {len(relevant_memories)} 条")
        except Exception as exc:
            logger.warning("Memory RAG 检索异常: %s", exc)
            relevant_memories = []

    # 5. Lorebook 自动加载与检索
    lore_entries = payload.lore
    if not lore_entries:
        try:
            # Server-side Fetch: 仅加载该用户的 Active Entries
            lore_entries = lorebook_crud.get_active_lore_entries(db, payload.user_id)
            if lore_entries:
                logger.info(f"📚 [Lorebook] 已加载 {len(lore_entries)} 条世界书条目")
        except Exception as e:
            logger.warning(f"Lorebook 加载失败: {e}")
            lore_entries = []

    # 混合检索: 向量搜索 Lorebook
    rag_lore_ids = []
    if lore_entries and vector_store.is_available():
        active_book_ids = set()
        for e in lore_entries:
            bid = e.get("lorebookId") or e.get("lorebook_id")
            if bid: active_book_ids.add(str(bid))
        
        if active_book_ids:
            try:
                # 语义搜索
                rag_lore_ids = await vector_store.search_lore(message, list(active_book_ids), limit=3)
                if rag_lore_ids:
                    logger.info(f"📘 [Lore RAG] 向量命中 {len(rag_lore_ids)} 条")
            except Exception as e:
                logger.warning(f"Lore RAG Error: {e}")

    # 6. 构建 Prompt (核心修改: 传入动态 Limits)
    # 注意: max_context_tokens 这里只是前端传来的期望值，我们主要依赖后端的 max_model_tokens 来做硬限制
    user_max_history = payload.max_context_tokens or DEFAULT_MAX_HISTORY_TOKENS

    norm = build_normalized_prompt(
        card=payload.card or {},
        lore_entries=lore_entries or [],
        history=[{"role": i["role"], "content": i["content"]} for i in history_for_prompt],
        user_message=message,
        
        # --- 核心变更开始 ---
        max_history_tokens=user_max_history,           # 软上限: 历史记录期望长度
        max_model_tokens=model_limits["context_window"], # 硬上限: 模型总窗口
        max_output_tokens=model_limits["max_output"],    # 硬上限: 预留给回复的空间
        # --- 核心变更结束 ---
        
        memories=relevant_memories,
        history_summary=history_summary, 
        system_modules=processed_modules,
        router_decision={"rag_lore_ids": rag_lore_ids}
    )

    openai_payload = to_openai_payload(norm, model_name)
    
    # [DEBUG] 打印 Token 统计 (如果 build_normalized_prompt 返回了的话)
    if "tokenStats" in norm:
        stats = norm["tokenStats"]
        logger.info(f"📊 Token预算: Sys={stats['system']} | User={stats['user']} | Hist={stats['history']} | Left={stats['budget_left']}")

    try:
        reply_content = await call_llm(
            model=model_name, 
            messages=openai_payload["messages"],
            temperature=payload.temperature,
            top_p=payload.top_p,
            max_tokens=payload.max_tokens, # 这里是让 LLM 知道什么时候停止，通常 <= max_output
            frequency_penalty=payload.frequency_penalty,
            presence_penalty=payload.presence_penalty,
        )
        
        print("\n" + "="*40)
        print(f"🧠 [LLM 原始回复]\n{reply_content}")
        print("="*40 + "\n")
        logger.info("✅ LLM 响应成功")

    except Exception as exc:
        logger.exception("LLM 调用失败")
        raise HTTPException(status_code=500, detail=f"LLM Error: {exc}")

    try:
        # 写入数据库
        chat_crud.create_chat_message(db, session_id, "user", message)
        chat_crud.create_chat_message(db, session_id, "assistant", reply_content)
        db.commit() 

        background_tasks.add_task(_run_compact_history_task, db, session_id)
        
    except Exception as exc:
        logger.error("DB 写入失败: %s", exc)

    return ChatResponse(
        reply=reply_content,
        systemPreview=norm.get("systemPrompt"),
        usedLore=norm.get("loreBlock"),
    )