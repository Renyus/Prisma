# app/services/role_service.py
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
    根据前端的 CharacterCard 生成最终的 systemPrompt。

    兼容字段（都用 .get 安全读取）：
    - name:            角色名
    - description:     角色描述
    - persona:         性格 / 说话风格
    - scenario:        初始场景 / 世界观背景
    - system_prompt:   额外行为规范
    - creator_notes:   创作者备注
    - tags:            标签数组
    - mes_example:     Tavern 导入时可能保留的示例对话（如果有）
    """
    # 基础规则：即使没有角色卡，也保留一段通用说明
    base_rules = (
        "你是一名虚构角色，将在一个故事世界中以第一人称和用户对话。\n"
        "对话要求：始终保持在此角色身份中，以第一人称说话；避免提及“设定”“系统提示”；"
        "如果用户的内容与世界观矛盾，可委婉提示并尝试在世界观内圆回来。"
    )

    if not card or not isinstance(card, dict):
        return base_rules

    name = (card.get("name") or "").strip() or "角色"

    description = _clip(card.get("description"), 800)
    persona = _clip(card.get("persona"), 600)
    scenario = _clip(card.get("scenario"), 600)
    system_extra = _clip(card.get("system_prompt"), 800)
    creator_notes = _clip(card.get("creator_notes"), 600)

    # tags: string[]
    tags_raw = card.get("tags") or []
    tags: List[str] = []
    if isinstance(tags_raw, list):
        for t in tags_raw:
            if isinstance(t, str) and t.strip():
                tags.append(t.strip())

    # 如果 Tavern PNG 导入时保留了 mes_example，也顺带吃进去
    mes_example = _clip(card.get("first_mes"), 1200)

    parts: List[str] = [base_rules]

    parts.append(f"当前扮演角色：{name}")

    if description:
        parts.append("【角色简介】\n" + description)

    if persona:
        parts.append("【性格特征】\n" + persona)

    if scenario:
        parts.append("【初始场景】\n" + scenario)

    if system_extra:
        parts.append("【额外行为规范】\n" + system_extra)

    if creator_notes:
        parts.append("【创作者备注】\n" + creator_notes)

    if tags:
        parts.append("【标签】\n" + ", ".join(tags))

    if mes_example:
        parts.append("【示例对话片段】\n" + mes_example)

    # 去掉空段后拼接
    return "\n\n".join(p for p in parts if p.strip())
