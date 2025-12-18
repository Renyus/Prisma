# backend/app/services/prompt_builder.py
from __future__ import annotations
from typing import Any, Dict, List, Optional
import re
from app.services.role_service import build_role_system_prompt
from app.services.lorebook_service import select_triggered_lore_entries, build_lore_blocks
from app.core.config import settings
from app.utils.token_utils import _estimate_tokens

def _truncate_history(history: List[Dict[str, str]], remaining_budget: int, max_single_msg_chars: int = 10000) -> List[Dict[str, str]]:
    """
    倒序截取历史记录，直到填满 remaining_budget。
    """
    if not history or remaining_budget <= 0: return []
    
    kept = []
    used = 0
    
    # 倒序遍历（保留最新的）
    for msg in reversed(history):
        content = msg.get("content", "") or ""
        
        # 1. 只有极长的单条消息才会被截断 (防止恶意长文本)
        if len(content) > max_single_msg_chars: 
            content = content[-max_single_msg_chars:]
            
        # 2. 计算当前消息 Token
        # +4 是为了由 ChatML 格式带来的额外开销 (<|im_start|>role...<|im_end|>)
        msg_tokens = _estimate_tokens(content) + 4
        
        if used + msg_tokens > remaining_budget:
            break
            
        # 重新构造 msg 以防原对象被修改
        kept.append({"role": msg.get("role", "user"), "content": content})
        used += msg_tokens
        
    kept.reverse() # 恢复时间正序
    return kept

def build_normalized_prompt(
    card: Dict[str, Any],
    lore_entries: List[Dict[str, Any]],
    history: List[Dict[str, str]],
    user_message: str,
    system_modules: List[str] = None, 
    max_history_tokens: int = 4000, # 这只是一个软上限
    router_decision: Optional[Dict[str, Any]] = None,
    memories: List[str] = None, 
    history_summary: str = None,
    user_name: str = "User",  # 新增用户名参数
) -> Dict[str, Any]:
    """
    生成发给 LLM 的标准结构，严格控制 Token 预算
    """
    if memories is None: memories = []
    if system_modules is None: system_modules = []
    
    # 0. 动态获取模型限制参数
    model_limits = settings.get_model_limit(settings.CHAT_MODEL)
    context_window = model_limits["context_window"]
    max_output = model_limits["max_output"]
    safety_buffer = model_limits["safety_buffer"]
    
    # 动态计算世界书预算 - 根据总窗口的20%动态分配
    # 防止在小模型上世界书挤占太多空间，或在大模型上世界书利用不足
    LORE_TOKEN_BUDGET = int(context_window * 0.2)
    # 设置最小和最大边界，确保预算合理
    LORE_TOKEN_BUDGET = max(500, min(LORE_TOKEN_BUDGET, 3000))
    
    # 计算可用的输入空间
    # 必须预留 Output 空间，并扣除安全缓冲区防止估算误差
    SAFE_TOTAL_INPUT = context_window - max_output - safety_buffer
    if SAFE_TOTAL_INPUT <= 0:
        # 极端情况保护
        SAFE_TOTAL_INPUT = 2000
    
    use_lorebook = router_decision.get("use_lorebook", True) if router_decision else True
    
    # 1. 角色卡构建 (System 核心) - 传递用户名参数
    role_prompt = build_role_system_prompt(card, user_name)

    # 2. 世界书触发 (RAG & Keywords)
    triggered = []
    lore_blocks = {}
    if use_lorebook:
        rag_ids = set()
        if router_decision and "rag_lore_ids" in router_decision:
             rag_ids = set(router_decision["rag_lore_ids"])
        
        triggered = select_triggered_lore_entries(
            lore_entries or [], 
            history or [], 
            user_message, 
            token_budget=LORE_TOKEN_BUDGET,
            forced_activation_ids=rag_ids
        )
        lore_blocks = build_lore_blocks(triggered)

    # 3. 组装 System Prompt
    # 推荐顺序: 角色定义 -> 历史摘要 -> 长期记忆 -> 世界书(环境/词条) -> 动态模块
    system_parts: List[str] = []

    # A. 角色定义 (最重要)
    system_parts.append(role_prompt)
    
    # B. 历史摘要 (承上启下)
    if history_summary:
        system_parts.append(f"【Previous Story Summary】\n{history_summary}")

    # C. 长期记忆 (RAG 检索到的过往片段)
    if memories:
        memory_block_str = "【Recall / Long-term Memories】\n" + "\n".join(f"- {m}" for m in memories)
        system_parts.append(memory_block_str)

    # D. 世界书 (静态知识/动态环境)
    if lore_blocks.get("beforeChar"): system_parts.append("【World Setting】\n" + lore_blocks["beforeChar"])
    if lore_blocks.get("afterChar"): system_parts.append("【Additional Lore】\n" + lore_blocks["afterChar"])

    # E. 动态模块 (如时间、天气等插件)
    if system_modules:
        system_parts.extend(system_modules)

    final_system = "\n\n".join(p for p in system_parts if p.strip())

    # 4. 组装 User Prompt
    user_parts: List[str] = []
    if lore_blocks.get("beforeUser"): user_parts.append("【Scene Context】\n" + lore_blocks["beforeUser"])
    user_parts.append(user_message)
    if lore_blocks.get("afterUser"): user_parts.append("【Note】\n" + lore_blocks["afterUser"])
    user_parts.append("(Remember: Start with <thinking> tags)")

    final_user = "\n\n".join(p for p in user_parts if p.strip())

    # 5. 历史记录截断 (核心逻辑)
    
    # 先计算 System 和 User 占用了多少
    system_tokens = _estimate_tokens(final_system)
    user_tokens = _estimate_tokens(final_user)
    
    # 计算剩给历史记录的空间
    # Input Limit - (System + User)
    remaining_budget = SAFE_TOTAL_INPUT - (system_tokens + user_tokens)
    
    # 如果 System + User 已经爆了，强制保留至少 100 token 给历史（虽然大概率会报错，但尽力而为）
    if remaining_budget < 0:
        remaining_budget = 0 

    # 弹性保护机制：检查 System 模块是否过于臃肿
    MIN_HISTORY_TOKENS = 500  # 最小历史记录保留阈值
    if remaining_budget < MIN_HISTORY_TOKENS:
        import warnings
        warnings.warn(
            f"System Prompt 过于臃肿！剩余预算仅剩 {remaining_budget} tokens，"
            f"低于最小阈值 {MIN_HISTORY_TOKENS} tokens。"
            f"建议优化角色卡或世界书内容。"
            f"当前 System tokens: {system_tokens}, User tokens: {user_tokens}, "
            f"总可用输入空间: {SAFE_TOTAL_INPUT}",
            UserWarning
        )

    # 取 "配置的历史上限" 和 "实际剩余空间" 的较小值
    final_history_budget = min(max_history_tokens, remaining_budget)

    history_to_use = history or []
    
    # 完善智能上下文 (Smart Context) 逻辑
    refined_history_summary = router_decision.get("refine_history") if router_decision else ""
    smart_context_used = False
    
    if refined_history_summary:
        # 计算 refined_history 的 token 数（包含 ChatML 格式开销）
        refined_tokens = _estimate_tokens(refined_history_summary) + 4
        
        # 从预算中扣除 refined_history 的空间
        adjusted_budget = final_history_budget - refined_tokens
        if adjusted_budget >= 0:
            # 预算充足，使用 Smart Context
            final_history_budget = adjusted_budget
            smart_context_used = True
        # 如果预算不足，则忽略 refined_history，使用原有逻辑

    trimmed_history = _truncate_history(history_to_use, final_history_budget)

    messages: List[Dict[str, str]] = []
    
    # 如果使用了 Smart Context，将 refined_history 插入到顶部
    if smart_context_used:
        messages.append({
            "role": "system", 
            "content": f"【Smart Context Summary】\n{refined_history_summary}"
        })
    
    messages.extend(trimmed_history)
    messages.append({"role": "user", "content": final_user})

    return {
        "systemPrompt": final_system,
        "messages": messages,
        "loreBlock": lore_blocks, 
        "routerDecision": router_decision,
        "tokenStats": {
            "system": system_tokens,
            "user": user_tokens,
            "history": len(trimmed_history),
            "budget_left": remaining_budget,
            "model_limits": {
                "context_window": context_window,
                "max_output": max_output,
                "safety_buffer": safety_buffer
            },
            "lore_budget": LORE_TOKEN_BUDGET,
            "estimation_method": "tiktoken" if hasattr(settings, 'TIKTOKEN_AVAILABLE') else "manual_conservative",
            "smart_context_used": smart_context_used,
            "smart_context_tokens": _estimate_tokens(refined_history_summary) + 4 if smart_context_used else 0
        }
    }
