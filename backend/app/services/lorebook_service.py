# backend/app/services/lorebook_service.py

from __future__ import annotations

import re
from typing import Any, Dict, Iterable, List, Set

from app.utils.token_utils import _estimate_tokens

# --- 配置常量 ---
# 递归最大深度（防止死循环或性能损耗）
MAX_RECURSION_DEPTH = 5
# 默认 Token 预算（启发式：1 token ≈ 3 chars）
DEFAULT_TOKEN_BUDGET = 2048


def _normalize_text(text: str | None) -> str:
    return (text or "").strip()



def keyword_match(item: dict, text: str) -> bool:
    """
    增强版关键匹配：严格区分 Regex 与 文本匹配模式。
    支持使用预编译的正则表达式以提升性能。
    """
    if not text:
        return False

    entry = item["entry"]
    
    # 1. 检查是否有预编译的正则表达式
    compiled_patterns = item.get("compiled_patterns")
    if compiled_patterns:
        # 使用预编译的正则表达式进行匹配
        for pattern in compiled_patterns:
            if pattern.search(text):
                return True
        return False

    # 2. 如果没有预编译正则，使用原来的逻辑
    # 提取并清洗关键词
    keywords: List[str] = []
    if entry.get("key"):
        keywords.append(str(entry["key"]))
    if isinstance(entry.get("keywords"), list):
        for k in entry["keywords"]:
            if isinstance(k, str) and k.strip():
                keywords.append(k)
    
    # 集合去重，提高性能
    unique_keywords = set(k.strip() for k in keywords if k and k.strip())
    if not unique_keywords:
        return False

    use_regex = bool(entry.get("useRegex"))
    case_sensitive = bool(entry.get("caseSensitive"))
    whole_word = bool(entry.get("matchWholeWord"))

    # 3. 匹配逻辑
    # 预处理 haystack (文本源)
    haystack = text if case_sensitive else text.lower()

    for kw in unique_keywords:
        if use_regex:
            # --- Regex 模式 ---
            flags = 0 if case_sensitive else re.IGNORECASE
            try:
                # 即使是 Regex，如果用户开启了 Whole Word，我们也尝试包裹边界
                # 但通常建议 Regex 用户自己处理 \b
                pattern = kw
                if whole_word:
                    pattern = rf"\b{kw}\b"
                
                if re.search(pattern, text, flags=flags):
                    return True
            except re.error:
                # 正则语法错误，跳过该关键词（不做降级处理，避免误判）
                continue
        else:
            # --- 文本模式 ---
            target = kw if case_sensitive else kw.lower()
            
            if whole_word:
                # 使用 Regex 的 \b 边界处理普通文本匹配
                # escape 确保关键词中的特殊符号不被当做正则解析
                pattern = r"\b" + re.escape(target) + r"\b"
                if re.search(pattern, haystack):
                    return True
            else:
                # 简单的子串包含
                if target in haystack:
                    return True

    return False


def select_triggered_lore_entries(
    lore_entries: Iterable[Dict[str, Any]],
    history: List[Dict[str, str]],
    user_message: str,
    token_budget: int = DEFAULT_TOKEN_BUDGET,
    max_entries: int = 30,
    forced_activation_ids: Set[str] = None
) -> List[Dict[str, Any]]:
    """
    核心触发逻辑（支持递归 + Token 控制）：
    forced_activation_ids: 强制激活的条目ID集合（例如来自向量检索）
    """
    if forced_activation_ids is None: forced_activation_ids = set()

    # 1. 准备固定的基础扫描文本 (使用最近历史，避免过长)
    recent_history = history[-5:] # 取最近5条即可，太早的触发没意义
    base_text = "\n".join(h.get("content", "") for h in recent_history)
    base_scan_text = f"{base_text}\n{user_message}"  # 固定的基础文本
    
    # 动态扫描文本（每轮递归新触发的内容）
    dynamic_scan_text = ""

    # 状态追踪
    triggered_ids: Set[str] = set() 
    
    pool = []
    for idx, entry in enumerate(lore_entries):
        if not isinstance(entry, dict): continue
        if entry.get("enabled") is False: continue
        content = _normalize_text(str(entry.get("content", "")))
        if not content: continue
        
        # 兼容 entry id (如果有)
        entry_id = str(entry.get("id", ""))
        
        # 预编译正则表达式（如果启用）
        compiled_patterns = None
        if bool(entry.get("useRegex")):
            keywords: List[str] = []
            if entry.get("key"):
                keywords.append(str(entry["key"]))
            if isinstance(entry.get("keywords"), list):
                for k in entry["keywords"]:
                    if isinstance(k, str) and k.strip():
                        keywords.append(k)
            
            # 集合去重
            unique_keywords = set(k.strip() for k in keywords if k and k.strip())
            
            if unique_keywords:
                compiled_patterns = []
                case_sensitive = bool(entry.get("caseSensitive"))
                whole_word = bool(entry.get("matchWholeWord"))
                
                for kw in unique_keywords:
                    try:
                        pattern = kw
                        if whole_word:
                            pattern = rf"\b{kw}\b"
                        
                        flags = 0 if case_sensitive else re.IGNORECASE
                        compiled_patterns.append(re.compile(pattern, flags))
                    except re.error:
                        # 正则语法错误，跳过该关键词
                        continue
        
        pool.append({
            "_index": idx,
            "_id": entry_id,
            "entry": entry,
            "content": content,
            "constant": bool(entry.get("constant")),
            "priority": float(entry.get("priority") or 0),
            "order": float(entry.get("order") or 0),
            "compiled_patterns": compiled_patterns  # 预编译的正则表达式
        })

    final_results: List[Dict[str, Any]] = []
    
    # 2. 递归扫描循环
    # Constant 或 Forced 条目直接加入
    for item in pool:
        is_forced = item["_id"] in forced_activation_ids
        if item["constant"] or is_forced:
            if item["_index"] not in triggered_ids:
                triggered_ids.add(item["_index"])
                final_results.append(item["entry"])
                # 将内容追加到动态扫描文本中
                dynamic_scan_text += f"\n{item['content']}"

    # 循环扫描非 Constant 条目
    for depth in range(MAX_RECURSION_DEPTH):
        found_new = False
        new_triggered_content = []  # 记录本轮新触发的内容
        
        # 筛选尚未触发的条目
        candidates = [i for i in pool if i["_index"] not in triggered_ids]
        
        for item in candidates:
            # 组合扫描文本：基础文本 + 动态文本
            full_scan_text = base_scan_text + dynamic_scan_text
            
            # 匹配检查
            if keyword_match(item, full_scan_text):
                triggered_ids.add(item["_index"])
                final_results.append(item["entry"])
                # 记录新触发的内容，稍后统一追加到动态文本
                new_triggered_content.append(item['content'])
                found_new = True
        
        # 将本轮新触发的内容追加到动态扫描文本
        if new_triggered_content:
            dynamic_scan_text += "\n" + "\n".join(new_triggered_content)
            
            # 可选：限制动态文本长度，避免无限增长
            # 如果动态文本超过阈值，可以考虑截断或清理策略
            max_dynamic_length = 5000  # 限制动态文本最大长度
            if len(dynamic_scan_text) > max_dynamic_length:
                # 保留最近的内容，丢弃较早的
                dynamic_scan_text = dynamic_scan_text[-max_dynamic_length:]
        
        # 如果这一轮没有发现新条目，则停止递归
        if not found_new:
            break

    # 3. 排序 (Priority DESC, Order ASC)
    def sort_key(e: Dict[str, Any]):
        p = float(e.get("priority") or 0)
        o = float(e.get("order") or 0)
        return (-p, o)

    final_results.sort(key=sort_key)

    # 4. 预算控制 (Token Budget & Max Entries)
    # 我们按优先级从高到低尝试加入，直到预算耗尽
    output: List[Dict[str, Any]] = []
    current_tokens = 0
    
    for entry in final_results:
        if len(output) >= max_entries:
            break
            
        content_tokens = _estimate_tokens(str(entry.get("content", "")))
        
        if current_tokens + content_tokens > token_budget:
            # 预算不足，跳过此条目（或者我们可以选择 break 强行截断，视需求而定）
            # 这里选择 break，保证高优先级的完整性，后面的低优先级直接丢弃
            continue
            
        output.append(entry)
        current_tokens += content_tokens

    return output


def build_lore_blocks(entries: Iterable[Dict[str, Any]]) -> Dict[str, str]:
    """
    标准组装逻辑，保持不变
    """
    blocks = {
        "beforeChar": [],
        "afterChar": [],
        "beforeUser": [],
        "afterUser": [],
    }

    for e in entries:
        content = _normalize_text(str(e.get("content", "")))
        if not content:
            continue

        # 标准化 position key (兼容前端驼峰或后端下划线)
        pos_raw = str(e.get("position", "before_char")).lower().replace("_", "")
        
        if "beforechar" in pos_raw:
            blocks["beforeChar"].append(content)
        elif "afterchar" in pos_raw:
            blocks["afterChar"].append(content)
        elif "beforeuser" in pos_raw:
            blocks["beforeUser"].append(content)
        elif "afteruser" in pos_raw:
            blocks["afterUser"].append(content)
        else:
            blocks["beforeChar"].append(content)

    return {k: "\n\n".join(v) for k, v in blocks.items()}
