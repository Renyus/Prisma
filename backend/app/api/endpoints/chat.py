from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.prompt_engine import ContextAssembler

# 引入之前的搬运工，方便取数据
from app.modules.character import service as char_service
from app.modules.preset import service as preset_service
# 如果以后有世界书，也可以引入 lorebook_service

router = APIRouter()

# --- 定义请求体模型 ---
# 前端发请求时，必须带上这些信息
class ChatRequest(BaseModel):
    char_id: int
    preset_id: int
    # 聊天记录格式：[{"role": "user", "content": "你好"}, ...]
    messages: List[Dict[str, str]] = []
    user_name: str = "User"
    
    # 世界书ID (可选)
    lorebook_id: Optional[int] = None

# --- 调试接口：只拼装，不发给 AI ---
@router.post("/debug/assemble", summary="[调试] 预览拼装后的 Prompt")
def debug_assemble_prompt(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    这个接口用于测试 ContextAssembler 是否工作正常。
    它会返回最终发给 LLM 的 messages 列表。
    """
    # 1. 取出角色卡
    char = char_service.get_character(db, payload.char_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    # 2. 取出预设
    preset = preset_service.get_preset(db, payload.preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")

    # 3. 初始化拼装引擎
    assembler = ContextAssembler(
        card=char,
        preset=preset,
        history=payload.messages,
        user_name=payload.user_name
        # lorebook=... 以后再加
    )

    # 4. 执行拼装
    try:
        final_messages = assembler.assemble()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Assembly failed: {str(e)}")

    # 5. 返回结果
    return {
        "info": "Assembly Success",
        "total_messages": len(final_messages),
        "prompt": final_messages  # 这里就是最终产物！
    }