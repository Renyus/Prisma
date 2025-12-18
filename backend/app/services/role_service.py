# backend/app/services/role_service.py
from __future__ import annotations
from typing import Any, Dict, List
import re

def _clip(text: str | None, max_chars: int) -> str:
    """
    简单截断，避免把超长设定整段塞给模型。
    """
    if not text:
        return ""
    s = str(text)
    if len(s) <= max_chars:
        return s
    return s[: max_chars - 3] + "..."

def _replace_placeholders(text: str, user_name: str = "User", char_name: str = "Character") -> str:
    """
    替换角色卡中的占位符变量
    支持的占位符：{{user}}, {{char}}, {{User}}, {{Character}}
    """
    if not text:
        return text
    
    # 替换占位符
    replacements = {
        '{{user}}': user_name,
        '{{User}}': user_name,
        '{{char}}': char_name,
        '{{Character}}': char_name,
    }
    
    result = text
    for placeholder, replacement in replacements.items():
        result = result.replace(placeholder, replacement)
    
    return result

def build_role_system_prompt(card: Dict[str, Any] | None, user_name: str = "User") -> str:
    """
    精简版：只负责注入角色数据，不包含任何指令性规则。
    所有的指令规则（如人称、破甲等）都移交给 System Prompt 模块控制。
    支持占位符替换：{{user}}, {{char}}, {{User}}, {{Character}}
    """
    if not card or not isinstance(card, dict):
        return ""

    # 1. 提取基础信息
    name = (card.get("name") or "").strip()
    char_name = name if name else "Character"
    
    # 2. 对所有文本内容进行占位符替换
    description = _clip(_replace_placeholders(card.get("description", ""), user_name, char_name), 800)
    persona = _clip(_replace_placeholders(card.get("persona", ""), user_name, char_name), 600)
    scenario = _clip(_replace_placeholders(card.get("scenario", ""), user_name, char_name), 600)
    system_extra = _clip(_replace_placeholders(card.get("system_prompt", ""), user_name, char_name), 800)
    creator_notes = _clip(_replace_placeholders(card.get("creator_notes", ""), user_name, char_name), 600)

    parts: List[str] = []

    # 3. 纯数据注入 (Data Injection Only)
    if name:
        parts.append(f"Target Character: {name}")

    if description:
        parts.append(f"[{name}'s Description]\n{description}")

    if persona:
        parts.append(f"[{name}'s Personality]\n{persona}")

    if scenario:
        parts.append(f"[Current Scenario]\n{scenario}")

    if system_extra:
        parts.append(f"[Special Instructions]\n{system_extra}")

    if creator_notes:
        parts.append(f"[Creator Notes]\n{creator_notes}")

    # 4. 示例对话 (保留，这对风格模仿至关重要)
    mes_example = _clip(_replace_placeholders(card.get("first_mes", ""), user_name, char_name), 1200)
    if mes_example:
        parts.append(f"[Dialogue Examples]\n{mes_example}")

    return "\n\n".join(p for p in parts if p.strip())

def replace_message_placeholders(message: str, user_name: str = "User", char_name: str = "Character") -> str:
    """
    替换消息中的占位符变量
    用于前端渲染AI回复时进行占位符替换
    """
    return _replace_placeholders(message, user_name, char_name)
