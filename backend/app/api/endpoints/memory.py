from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.schemas.memory import MemoryCreate, MemoryResponse
from app.crud import memory as memory_crud

router = APIRouter(prefix="/memory", tags=["Memory"])

@router.get("", response_model=List[MemoryResponse])
def get_memories(user_id: str, db: Session = Depends(get_db)):
    """获取指定用户的所有记忆"""
    # 读操作如果只查 SQL，通常可以是同步的，除非你也想让它走 vector 检索
    # 目前 memory_crud.get_memories_by_user 是同步函数，保持原样即可
    return memory_crud.get_memories_by_user(db, user_id)

@router.post("", response_model=MemoryResponse)
async def add_memory(payload: MemoryCreate, db: Session = Depends(get_db)):
    """添加一条新记忆"""
    # [FIX] 改为 async/await，因为 CRUD 层现在包含异步的向量写入操作
    return await memory_crud.create_memory(db, payload)