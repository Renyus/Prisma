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
from app.services.prompt_builder import build_normalized_prompt, _estimate_tokens
from app.crud import chat as chat_crud
from app.crud import memory as memory_crud
from app.crud import lorebook as lorebook_crud
from app.db.session import SessionLocal

# 强制显示 INFO 日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 默认配置
DEFAULT_MAX_HISTORY_MSG = 30
HARD_MAX_HISTORY_MSG = 100
DEFAULT_MAX_HISTORY_TOKENS = 2400
DEFAULT_MODEL = settings.CHAT_MODEL
# [修改] 既然你有 160k 窗口，直接给记忆分配 15000 tokens
# 这样哪怕检索 50-100 条短记忆也能全部塞进去
MAX_MEMORY_TOKENS = 15000

async def _run_compact_history_task(session_id: str):
    """
    后台压缩历史记录任务
    在独立数据库会话中执行，避免主请求结束后 Session 被关闭的问题
    """
    with SessionLocal() as db:
        try:
            await _maybe_compact_history(db, session_id)
        except Exception as e:
            logger.error(f"后台摘要任务失败: {e}")
        finally:
            db.close()

async def _maybe_compact_history(db: Session, session_id: str) -> None:
    """
    基于 Token 数量的历史记录压缩
    当历史记录总 Token 超过模型窗口的 75% 时触发压缩
    """
    # 获取当前模型的上下文窗口大小
    try:
        if hasattr(settings, "get_model_limit"):
            model_limits = settings.get_model_limit(settings.CHAT_MODEL)
            context_window = model_limits["context_window"]
        else:
            # Fallback: 使用默认上下文窗口
            context_window = getattr(settings, "MAX_MODEL_CONTEXT_LENGTH", 4096)
    except Exception as e:
        logger.warning(f"获取模型限制失败，使用默认上下文窗口: {e}")
        context_window = 4096

    # 计算 Token 压缩阈值（模型窗口的 75%）
    token_threshold = int(context_window * 0.75)
    
    # 获取所有未归档的历史消息（按时间正序）
    all_messages = (
        db.query(db_models.ChatMessage)
        .filter(db_models.ChatMessage.user_id == session_id)
        .filter(db_models.ChatMessage.is_archived == False)  # 只处理未归档的消息
        .order_by(db_models.ChatMessage.created_at.asc())
        .all()
    )
    
    if not all_messages:
        return

    # 计算总 Token 数（排除摘要消息）
    total_tokens = 0
    non_summary_messages = []
    
    for msg in all_messages:
        if msg.content and not (msg.role == "system" and "摘要" in msg.content):
            # 计算消息的 Token 数（包含 ChatML 格式开销）
            msg_tokens = _estimate_tokens(msg.content) + 4
            total_tokens += msg_tokens
            non_summary_messages.append((msg, msg_tokens))

    # 如果总 Token 未超过阈值，不需要压缩
    if total_tokens <= token_threshold:
        return

    logger.info(f"[{session_id}] 历史记录 Token 超限: {total_tokens}/{token_threshold}，触发压缩")

    # 计算需要压缩的 Token 数（保留 50% 的空间）
    target_tokens = int(context_window * 0.5)
    tokens_to_compress = total_tokens - target_tokens
    
    if tokens_to_compress <= 0:
        return

    # 从最旧的消息开始，选择要压缩的消息
    messages_to_compress = []
    compressed_tokens = 0
    
    for msg, msg_tokens in non_summary_messages:
        if compressed_tokens + msg_tokens <= tokens_to_compress:
            messages_to_compress.append(msg)
            compressed_tokens += msg_tokens
        else:
            # 如果加上这条消息会超出，就停止
            break

    if not messages_to_compress:
        logger.warning(f"[{session_id}] 没有找到合适的压缩消息")
        return

    # 准备摘要源数据
    summary_sources = [
        {"role": msg.role, "content": msg.content}
        for msg in messages_to_compress
        if msg.content
    ]
    
    if not summary_sources:
        return

    try:
        # 生成摘要
        summary_text = (await call_summary_llm(summary_sources)).strip()
    except Exception as exc:
        logger.warning(f"[{session_id}] Summary 压缩失败: {exc}")
        return

    if not summary_text:
        return

    # 归档要压缩的消息（而不是删除）
    ids_to_archive = [msg.id for msg in messages_to_compress if msg.id]
    if not ids_to_archive:
        return

    chat_crud.archive_chat_messages_by_ids(db, ids_to_archive)
    logger.info(f"[{session_id}] 已归档 {len(ids_to_archive)} 条消息")

    # 计算摘要插入的时间点（放在保留下来的第一条消息之前微秒级）
    remaining_messages = [msg for msg in non_summary_messages if msg[0] not in messages_to_compress]
    if remaining_messages:
        earliest_retained_entry = remaining_messages[0][0]
        summary_timestamp = earliest_retained_entry.created_at - timedelta(microseconds=1)
    else:
        # 如果所有消息都被压缩了，就用当前时间
        summary_timestamp = datetime.utcnow()

    # 插入摘要作为 System 消息
    chat_crud.create_chat_message(
        db,
        session_id,
        "system", 
        f"【历史摘要】\n{summary_text}",
        created_at=summary_timestamp,
    )
    db.commit()
    
    logger.info(f"[{session_id}] 压缩完成: {len(messages_to_compress)} 条消息 -> 1 条摘要，节省约 {compressed_tokens} tokens")


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

    # 3. 历史记录获取与处理 已废弃
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
            
            current_tokens = 0
            for m in relevant_memories_objs:
                # 使用 Token 估算而不是字符数
                memory_tokens = _estimate_tokens(m.content)
                if current_tokens + memory_tokens > MAX_MEMORY_TOKENS:
                    break
                relevant_memories.append(m.content)
                current_tokens += memory_tokens
            
            if relevant_memories:
                logger.info(f"[{session_id}] Memory RAG 注入: {len(relevant_memories)} 条 (约 {current_tokens} tokens)")
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

    # 混合检索: 向量搜索 + 关键词匹配 Lorebook
    # 优化：直接获取完整条目对象，避免重复检索
    vector_entries = []  # 向量命中的完整条目
    keyword_entries = []  # 关键词命中的完整条目
    
    # 1. 向量检索 (语义搜索) - 直接获取完整条目对象
    if lore_entries and vector_store.is_available():
        active_book_ids = set()
        for e in lore_entries:
            bid = e.get("lorebookId") or e.get("lorebook_id")
            if bid: active_book_ids.add(str(bid))
        
        if active_book_ids:
            try:
                # 语义搜索 - 传入完整条目列表，直接返回匹配的对象
                vector_matches = await vector_store.search_lore(message, list(active_book_ids), limit=3, all_entries=lore_entries)
                if vector_matches:
                    vector_entries = vector_matches
                    logger.info(f"📘 [Lore RAG] 向量命中 {len(vector_matches)} 条")
            except Exception as e:
                logger.warning(f"Lore RAG Error: {e}")
        else:
            logger.info("ℹ️ [Lore RAG] 跳过向量检索 (无 active_book_ids)")

    # 2. 关键词检索 (精确匹配) - 直接获取完整条目对象
    try:
        keyword_matches = lorebook_crud.search_lore_entries_by_keywords(lore_entries, message, limit=5)
        if keyword_matches:
            keyword_entries = keyword_matches
            logger.info(f"🔍 [Lore RAG] 关键词命中 {len(keyword_matches)} 条")
    except Exception as e:
        logger.warning(f"Lore 关键词检索 Error: {e}")

    # 3. 构建 triggered_entries - 直接从检索结果构造，避免重复遍历
    triggered_entries = []
    seen_ids = set()
    
    # 先添加向量命中的条目（优先级更高）
    for entry in vector_entries:
        entry_id = str(entry.get("id"))
        if entry_id not in seen_ids:
            seen_ids.add(entry_id)
            # 提取标题（优先使用comment，其次使用content的前20个字符）
            title = entry.get("comment") or ""
            if not title:
                content_preview = entry.get("content", "")[:20]
                title = content_preview + "..." if len(content_preview) >= 20 else content_preview
            
            triggered_entries.append({
                "id": entry_id,
                "content": entry.get("content", ""),
                "type": "vector",
                "title": title,
                "priority": entry.get("priority", 0)
            })
    
    # 再添加关键词命中的条目（避免重复）
    for entry in keyword_entries:
        entry_id = str(entry.get("id"))
        if entry_id not in seen_ids:
            seen_ids.add(entry_id)
            # 提取标题
            title = entry.get("comment") or ""
            if not title:
                content_preview = entry.get("content", "")[:20]
                title = content_preview + "..." if len(content_preview) >= 20 else content_preview
            
            triggered_entries.append({
                "id": entry_id,
                "content": entry.get("content", ""),
                "type": "keyword",
                "title": title,
                "priority": entry.get("priority", 0)
            })

    # 收集所有命中的条目ID用于router_decision
    all_triggered_ids = set()
    for entry in vector_entries + keyword_entries:
        all_triggered_ids.add(str(entry.get("id")))

    if triggered_entries:
        logger.info(f"🎯 [Lore RAG] 混合检索总命中 {len(triggered_entries)} 条 (向量:{len(vector_entries)} + 关键词:{len(keyword_entries)})")
    else:
        logger.info(f"📭 [Lore RAG] 未命中任何条目")

    # 6. 构建 Prompt (核心修改: 传入动态 Limits)
    # 注意: max_context_tokens 这里只是前端传来的期望值，我们主要依赖后端的 max_model_tokens 来做硬限制
    user_max_history = payload.max_context_tokens or DEFAULT_MAX_HISTORY_TOKENS

    norm = build_normalized_prompt(
        card=payload.card or {},
        lore_entries=lore_entries or [],
        history=[{"role": i["role"], "content": i["content"]} for i in history_for_prompt],
        user_message=message,
        max_history_tokens=user_max_history,           # 软上限: 历史记录期望长度
        memories=relevant_memories,
        history_summary=history_summary, 
        system_modules=processed_modules,
        router_decision={"rag_lore_ids": list(all_triggered_ids)}
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

        background_tasks.add_task(_run_compact_history_task, session_id)
        
    except Exception as exc:
        logger.error("DB 写入失败: %s", exc)

    return ChatResponse(
        reply=reply_content,
        systemPreview=norm.get("systemPrompt"),
        usedLore=norm.get("loreBlock"),
        triggered_entries=triggered_entries if triggered_entries else None,
        triggeredLoreItems=norm.get("triggeredLore"),
        tokenStats=norm.get("tokenStats"),
    )
