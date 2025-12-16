from sqlalchemy.orm import Session
from sqlalchemy import or_
from uuid import uuid4
from typing import List
import logging
import asyncio
from app.db import models as db_models
from app.schemas.memory import MemoryCreate
from app.core.vector_store import vector_store

# 确保能看到日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_memories_by_user(db: Session, user_id: str):
    return db.query(db_models.Memory).filter_by(user_id=user_id).all()

async def create_memory(db: Session, memory: MemoryCreate) -> db_models.Memory:
    new_id = uuid4().hex
    db_obj = db_models.Memory(
        id=new_id,
        user_id=memory.user_id,
        content=memory.content,
        importance=memory.importance
    )
    db.add(db_obj)
    
    try:
        db.commit()
        db.refresh(db_obj)
    except Exception as e:
        db.rollback()
        logger.error(f"SQL写入失败: {e}")
        raise e

    if vector_store.is_available():
        try:
            # 直接 await，不需要 to_thread
            await vector_store.add_memory(
                memory_id=new_id,
                text=memory.content,
                metadata={
                    "user_id": memory.user_id,
                    "importance": memory.importance,
                    "type": "fragment"
                }
            )
        except Exception as e:
            logger.error(f"向量写入失败，正在回滚SQL数据: {e}")
            db.delete(db_obj)
            db.commit()
            raise e 

    return db_obj

async def delete_all_memories_by_user(db: Session, user_id: str) -> int:
    memories = db.query(db_models.Memory).filter(db_models.Memory.user_id == user_id).all()
    if not memories:
        return 0
        
    ids = [m.id for m in memories]
    
    if vector_store.is_available() and ids:
        try:
            # collection.delete 是同步的，这里用 to_thread 安全
            await asyncio.to_thread(vector_store.collection.delete, ids=ids)
        except Exception as e:
            logger.error(f"批量删除向量记忆失败: {e}")
            
    deleted = db.query(db_models.Memory).filter(db_models.Memory.user_id == user_id).delete(synchronize_session=False)
    return deleted

async def search_memories(db: Session, user_id: str, query_text: str, limit: int = 5) -> List[db_models.Memory]:
    if not query_text or not query_text.strip():
        return []

    # 1. 向量检索
    vector_ids = []
    if vector_store.is_available():
        try:
            # 直接 await
            vector_ids = await vector_store.search(
                query=query_text, 
                user_id=user_id, 
                limit=limit
            )
        except Exception as e:
            logger.error(f"Async vector search failed: {e}")
            vector_ids = []
    
    # 2. 关键词检索
    text = query_text.strip()
    keywords = []
    if len(text) < 10:
         keywords = [text[i:i+2] for i in range(len(text) - 1)]
    else:
        if " " in text:
             keywords = [k for k in text.split() if len(k) > 1]
        else:
             keywords = [text[:5], text[-5:]]
    
    keywords = list(set([k for k in keywords if k.strip()]))
    
    keyword_memories = []
    if keywords:
        filters = [db_models.Memory.content.like(f"%{k}%") for k in keywords]
        keyword_memories = (
            db.query(db_models.Memory)
            .filter(db_models.Memory.user_id == user_id)
            .filter(or_(*filters))
            .order_by(db_models.Memory.importance.desc())
            .limit(limit)
            .all()
        )

    # 3. 结果融合
    final_results = []
    seen_ids = set()

    # 优先向量
    if vector_ids:
        vector_objs = db.query(db_models.Memory).filter(db_models.Memory.id.in_(vector_ids)).all()
        obj_map = {obj.id: obj for obj in vector_objs}
        for vid in vector_ids:
            if vid in obj_map and vid not in seen_ids:
                final_results.append(obj_map[vid])
                seen_ids.add(vid)
    
    # 补充关键词
    for mem in keyword_memories:
        if mem.id not in seen_ids:
            final_results.append(mem)
            seen_ids.add(mem.id)

    results = final_results[:limit]
    
    # [INFO] 强制显示最终结果
    if results:
        logger.info(f"📝 [混合检索完成] 最终返回 {len(results)} 条记忆给AI:")
        for i, m in enumerate(results):
            source = "Vector" if m.id in vector_ids else "Keyword"
            logger.info(f"   👉 {i+1}. [{source}] {m.content}")
    else:
        logger.info(f"📝 [混合检索完成] 未找到任何相关记忆。")
            
    return results