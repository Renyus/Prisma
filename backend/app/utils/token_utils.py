# backend/app/utils/token_utils.py
from __future__ import annotations
from typing import Any, Dict, List, Optional
import re

# 尝试导入 tiktoken 作为可选的精确 token 估算器
try:
    import tiktoken
    TIKTOKEN_AVAILABLE = True
except ImportError:
    TIKTOKEN_AVAILABLE = False

def _estimate_tokens(text: str) -> int:
    """
    优化的 Token 估算函数，支持多种估算策略：
    1. tiktoken 精确估算（如果可用）
    2. 改进的手动估算（作为回退）
    
    策略：
    - CJK 字符及全角符号: 按 2 token 计算 (安全高估，防止溢出)
    - 其他 ASCII 字符: 按 0.5 token 计算 (更保守，防止复杂标点符号下溢出)
    - 额外加上 buffer
    """
    if not text:
        return 0
    
    # 策略 1: 尝试使用 tiktoken 进行精确估算
    if TIKTOKEN_AVAILABLE:
        try:
            # 使用 cl100k_base 编码器（适用于 GPT-4, DeepSeek 等）
            encoder = tiktoken.get_encoding("cl100k_base")
            tokens = encoder.encode(text)
            return len(tokens)
        except Exception:
            # 如果 tiktoken 失败，回退到手动估算
            pass
    
    # 策略 2: 改进的手动估算（回退方案）
    # 简单的正则匹配 CJK 范围
    cjk_pattern = re.compile(r'[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\uff00-\uffef]')
    cjk_count = len(cjk_pattern.findall(text))
    ascii_count = len(text) - cjk_count
    
    # 使用更保守的估算：ASCII 字符按 0.5 token 计算
    estimated = (cjk_count * 2.0) + (ascii_count * 0.5)
    return int(estimated) + 1
