# backend/app/services/role_service.py
from __future__ import annotations
from typing import Any, Dict, List

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

def build_role_system_prompt(card: Dict[str, Any] | None) -> str:
    """
    精简版：只负责注入角色数据，不包含任何指令性规则。
    所有的指令规则（如人称、破甲等）都移交给 System Prompt 模块控制。
    """
    if not card or not isinstance(card, dict):
        return ""

    # 1. 提取基础信息
    name = (card.get("name") or "").strip()
    description = _clip(card.get("description"), 800)
    persona = _clip(card.get("persona"), 600)
    scenario = _clip(card.get("scenario"), 600)
    system_extra = _clip(card.get("system_prompt"), 800)
    creator_notes = _clip(card.get("creator_notes"), 600)

    parts: List[str] = []

    # 2. 纯数据注入 (Data Injection Only)
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

    # 3. 示例对话 (保留，这对风格模仿至关重要)
    mes_example = _clip(card.get("first_mes"), 1200)
    if mes_example:
        parts.append(f"[Dialogue Examples]\n{mes_example}")

    return "\n\n".join(p for p in parts if p.strip())