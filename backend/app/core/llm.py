import httpx
from typing import List, Dict, Optional, Any
import json
from app.core.config import settings

# 将 .env 配置映射到内部逻辑名称
GENERATION_MODEL = settings.CHAT_MODEL
SUMMARY_MODEL = settings.UTILITY_MODEL
MEMORY_MODEL = settings.UTILITY_MODEL # 记忆和总结共用 UTILITY_MODEL

def get_model_config(model_name: str) -> Dict[str, Any]:
    """
    根据模型名称动态匹配配置。
    """
    # 1. 如果是 Chat 模型
    if model_name == settings.CHAT_MODEL:
        key, url = settings.CHAT_CREDENTIALS
        return _fmt_config(key, url, temp=0.7)
    
    # 2. 如果是 Utility 模型
    if model_name == settings.UTILITY_MODEL:
        key, url = settings.UTILITY_CREDENTIALS
        return _fmt_config(key, url, temp=0.1)
    
    # 3. 未知模型 (可能是前端传来的自定义模型，或者旧的默认值)
    # 默认使用 Chat 的配置尝试去跑
    key, url = settings.CHAT_CREDENTIALS
    return _fmt_config(key, url, temp=0.7)

def _fmt_config(key: str, base_url: str, temp: float) -> Dict[str, Any]:
    # 自动修正 URL：如果以 /v1 结尾，补上 /chat/completions
    # 如果已经是 /chat/completions 结尾，保持不变
    # 这是一个简单的容错处理
    url = base_url
    if not url.endswith("/chat/completions"):
        url = url.rstrip("/") + "/chat/completions"
    
    return {
        "api_key": key,
        "api_url": url,
        "default_temp": temp,
        "base_url": base_url # 原始 Base URL，供 list_models 使用
    }

def standardize_usage(raw_usage: Dict[str, Any], model: str) -> Dict[str, int]:
    """
    标准化不同供应商的 usage 字段名为统一格式。
    
    Args:
        raw_usage: 原始 usage 数据
        model: 模型名称，用于识别供应商
    
    Returns:
        Dict[str, int]: 标准化格式 {"cacheHit": int, "cacheMiss": int, "total": int}
    """
    # 默认值
    standardized = {
        "cacheHit": 0,
        "cacheMiss": 0,
        "total": 0
    }
    
    if not raw_usage:
        return standardized
    
    # 根据模型名称判断供应商
    model_lower = model.lower()
    
    # DeepSeek 相关字段映射
    if "deepseek" in model_lower:
        # DeepSeek 使用 prompt_cache_hit_tokens 表示缓存命中
        cache_hit = raw_usage.get("prompt_cache_hit_tokens", 0)
        # 计算缓存未命中 = 总输入tokens - 缓存命中tokens
        total_input = raw_usage.get("prompt_tokens", 0)
        cache_miss = max(0, total_input - cache_hit)
        total = raw_usage.get("total_tokens", 0)
        
        standardized.update({
            "cacheHit": cache_hit,
            "cacheMiss": cache_miss,
            "total": total
        })
    
    # Claude 相关字段映射
    elif "claude" in model_lower:
        # Claude 使用 cache_read_input_tokens 表示缓存读取
        cache_hit = raw_usage.get("cache_read_input_tokens", 0)
        # 计算缓存未命中 = 总输入tokens - 缓存命中tokens
        total_input = raw_usage.get("input_tokens", 0)
        cache_miss = max(0, total_input - cache_hit)
        total = raw_usage.get("total_tokens", 0)
        
        standardized.update({
            "cacheHit": cache_hit,
            "cacheMiss": cache_miss,
            "total": total
        })
    
    # Gemini 相关字段映射
    elif "gemini" in model_lower:
        # Gemini 的字段名可能需要根据实际API响应调整
        cache_hit = raw_usage.get("cached_content_tokens", 0)
        total_input = raw_usage.get("prompt_tokens", 0)
        cache_miss = max(0, total_input - cache_hit)
        total = raw_usage.get("total_tokens", 0)
        
        standardized.update({
            "cacheHit": cache_hit,
            "cacheMiss": cache_miss,
            "total": total
        })
    
    # 其他供应商的通用处理
    else:
        # 尝试从常见的字段名中提取数据
        cache_hit = (
            raw_usage.get("prompt_cache_hit_tokens", 0) or
            raw_usage.get("cache_read_input_tokens", 0) or
            raw_usage.get("cached_content_tokens", 0) or
            0
        )
        
        total_input = (
            raw_usage.get("prompt_tokens", 0) or
            raw_usage.get("input_tokens", 0) or
            0
        )
        
        cache_miss = max(0, total_input - cache_hit)
        total = raw_usage.get("total_tokens", 0)
        
        standardized.update({
            "cacheHit": cache_hit,
            "cacheMiss": cache_miss,
            "total": total
        })
    
    return standardized

SUMMARY_SYSTEM_PROMPT = """你是一个高效的对话总结器。请仔细阅读给定的历史对话，并用简洁的语言提炼出核心信息、关键事件和用户的主要目标。你的总结将作为未来对话的上下文。请直接返回总结文本，不要包含任何前缀或解释。"""

async def call_llm(
    model: str, 
    messages: List[Dict[str, str]], 
    temperature: Optional[float] = None,
    top_p: Optional[float] = None,
    max_tokens: Optional[int] = None,
    frequency_penalty: Optional[float] = None,
    presence_penalty: Optional[float] = None,
) -> Dict[str, Any]:
    """
    统一 LLM 调用入口，返回包含 content 和 usage 的结构化数据
    """
    result = await call_chat_completions(
        model, messages, temperature, top_p, max_tokens, frequency_penalty, presence_penalty
    )
    return result

async def call_summary_llm(history: List[Dict[str, str]]) -> str:
    """调用 Utility 模型进行总结"""
    history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in history])
    messages = [
        {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
        {"role": "user", "content": f"请总结以下对话历史：\n---\n{history_text}"},
    ]
    try:
        result = await call_chat_completions(
            model=settings.UTILITY_MODEL, 
            messages=messages,
            temperature=0.1,
            max_tokens=1024
        )
        # 对于总结功能，只返回 content 部分
        return result["content"]
    except Exception as e:
        print(f"Summary failed: {e}")
        return ""

async def call_chat_completions(
    model: str, 
    messages: List[Dict[str, str]], 
    temperature: Optional[float] = None,
    top_p: Optional[float] = None,
    max_tokens: Optional[int] = None,
    frequency_penalty: Optional[float] = None,
    presence_penalty: Optional[float] = None,
) -> Dict[str, Any]:
    config = get_model_config(model)
    api_key = config["api_key"]
    url = config["api_url"]
    
    if not api_key:
        raise RuntimeError(f"Model {model} API Key not configured.")

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature if temperature is not None else config["default_temp"],
        "max_tokens": max_tokens if max_tokens is not None else 2048,
    }
    if top_p is not None: payload["top_p"] = top_p
    if frequency_penalty is not None: payload["frequency_penalty"] = frequency_penalty
    if presence_penalty is not None: payload["presence_penalty"] = presence_penalty

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=300) as client:
        resp = await client.post(url, json=payload, headers=headers)
    
    try:
        data = resp.json()
    except:
        data = resp.text

    if resp.status_code != 200:
        err = data.get("error") if isinstance(data, dict) else data
        raise RuntimeError(f"LLM API Error ({model}): {err}")

    # 提取 content
    content = data["choices"][0]["message"]["content"]
    
    # 提取并标准化 usage 数据
    raw_usage = data.get("usage", {})
    standardized_usage = standardize_usage(raw_usage, model)
    
    # 返回结构化数据
    return {
        "content": content,
        "usage": standardized_usage
    }
