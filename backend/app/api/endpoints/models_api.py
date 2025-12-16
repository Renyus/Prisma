from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import httpx
import logging

from app.core.config import settings
from app.core.llm import get_model_config

router = APIRouter(prefix="/models", tags=["Models"])
logger = logging.getLogger(__name__)

class ModelItem(BaseModel):
    id: str
    name: str

class ModelListResponse(BaseModel):
    models: List[ModelItem]

class ActiveModelResponse(BaseModel):
    name: str
    vendor: str

def _detect_generation_vendor() -> str:
    # 简单的供应商检测逻辑
    url = settings.GLOBAL_LLM_URL.lower()
    if "siliconflow" in url: return "SiliconFlow"
    if "deepseek" in url: return "DeepSeek"
    if "openai" in url: return "OpenAI"
    return "Custom"

async def _fetch_remote_models() -> List[ModelItem]:
    """
    尝试从配置的 URL 拉取真实模型列表。
    """
    # 获取 Chat 模块的配置
    config = get_model_config(settings.CHAT_MODEL)
    api_key = config.get("api_key")
    base_url = config.get("base_url", "")
    
    # 简单的 URL 处理：把 /chat/completions 替换为 /models
    # 大多数 OpenAI 兼容接口都支持 GET /v1/models
    # 注意：我们的 config 里的 api_url 是 /chat/completions 结尾的
    # base_url 则是原始配置的 URL (通常以 /v1 结尾)
    models_url = base_url.rstrip("/") + "/models"
    
    if not api_key:
        return []

    try:
        logger.info(f"[ModelsAPI] Fetching models from: {models_url} with key: {api_key[:8]}...")
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                models_url,
                headers={"Authorization": f"Bearer {api_key}"}
            )
            logger.info(f"[ModelsAPI] Status: {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                logger.info(f"[ModelsAPI] Raw response keys: {data.keys() if isinstance(data, dict) else 'not dict'}")
                
                # 兼容 { "data": [...] } 和 { "models": [...] } 甚至直接 [...]
                raw_list = data.get("data", []) if isinstance(data, dict) else data
                
                if isinstance(raw_list, list):
                    logger.info(f"[ModelsAPI] Found {len(raw_list)} models.")
                    return [
                        ModelItem(id=m.get("id"), name=m.get("id")) 
                        for m in raw_list 
                        if isinstance(m, dict) and "id" in m
                    ]
            else:
                logger.error(f"[ModelsAPI] Error response: {resp.text}")
    except Exception as e:
        logger.warning(f"无法从供应商拉取模型列表: {e}")
    
    return []

@router.get("", response_model=ModelListResponse)
async def list_models():
    """
    动态获取模型列表。
    优先尝试从供应商 API 拉取。如果失败，仅返回 .env 配置的模型。
    绝不返回硬编码的假数据。
    """
    current_id = settings.CHAT_MODEL
    
    # 1. 尝试远程拉取
    remote_models = await _fetch_remote_models()
    
    if remote_models:
        # 排序优化：把当前配置的模型放到第一位 (如果它在列表里)
        # 或者如果不在，把它手动加进去 (防止 .env 写了个别名，但列表里只有原名)
        
        # 检查是否存在
        exists = any(m.id == current_id for m in remote_models)
        
        # 排序：当前模型置顶
        sorted_models = sorted(
            remote_models, 
            key=lambda x: 0 if x.id == current_id else 1
        )
        
        if not exists:
            # 如果配置的模型不在列表里 (可能是别名)，强制加到第一位
            sorted_models.insert(0, ModelItem(id=current_id, name=f"{current_id} (Configured)"))
            
        return {"models": sorted_models}

    # 2. 如果远程拉取失败，仅返回配置的那个，不瞎猜
    return {"models": [
        ModelItem(id=current_id, name=f"{current_id} (Configured)")
    ]}


@router.get("/active", response_model=ActiveModelResponse)
def get_active_model():
    """返回当前 .env 中配置的生成模型名称与提供商"""
    return ActiveModelResponse(
        name=settings.CHAT_MODEL, 
        vendor=_detect_generation_vendor(),
    )