# backend/app/api/endpoints/lorebook.py
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
import uuid
import asyncio

from app.db.session import get_db
from app.db import models
from app.crud import lorebook as crud_lorebook
from app.schemas import lorebook as schemas
from app.core.vector_store import vector_store

router = APIRouter() 

from pydantic import BaseModel
class LorebookImportSchema(BaseModel):
    name: str
    description: Optional[str] = ""
    entries: List[Dict[str, Any]]

# --- Endpoints ---

@router.get("/books", response_model=List[schemas.LorebookResponse])
def list_lorebooks(user_id: str, db: Session = Depends(get_db)):
    return crud_lorebook.get_lorebooks(db, user_id=user_id)

@router.post("/books", response_model=schemas.LorebookResponse)
def create_lorebook(payload: schemas.LorebookBase, user_id: str, db: Session = Depends(get_db)):
    book_data = schemas.LorebookCreate(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=payload.name,
        description=payload.description,
        is_active=payload.is_active
    )
    return crud_lorebook.create_lorebook(db, book_data)

@router.delete("/books/{book_id}")
def delete_lorebook(book_id: str, db: Session = Depends(get_db)):
    success = crud_lorebook.delete_lorebook(db, book_id)
    if not success:
        raise HTTPException(status_code=404, detail="Lorebook not found")
    return {"status": "success", "id": book_id}

@router.put("/books/{book_id}", response_model=schemas.LorebookResponse)
def update_lorebook(book_id: str, payload: schemas.LorebookUpdate, db: Session = Depends(get_db)):
    book = crud_lorebook.update_lorebook(db, book_id, payload)
    if not book:
        raise HTTPException(status_code=404, detail="Lorebook not found")
    return book

# 批量导入接口
async def _sync_lore_entries(entries):
    """后台同步条目到向量存储"""
    for entry in entries:
        if entry.enabled and entry.content:
            try:
                await vector_store.upsert_lore(entry.id, entry.content, entry.lorebook_id, tags=[entry.keys])
            except Exception as e:
                print(f"❌ 向量同步失败 (ID={entry.id}): {e}")

@router.post("/import")
async def import_whole_lorebook(
    payload: LorebookImportSchema,
    user_id: str = Query("local-user"),
    db: Session = Depends(get_db)
):
    print(f"📥 正在导入世界书: {payload.name}, 包含 {len(payload.entries)} 条目")
    
    new_book = models.Lorebook(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=payload.name, 
        description=payload.description
    )
    db.add(new_book)
    db.commit()
    db.refresh(new_book)
    
    new_entries = []
    entries_for_sync = []
    for item in payload.entries:
        raw_keys = item.get("keys", [])
        keys_str = ""
        if isinstance(raw_keys, list):
            keys_str = ",".join(str(k) for k in raw_keys)
        elif isinstance(raw_keys, str):
            keys_str = raw_keys
            
        # [修复] 使用 LorebookEntry
        entry = models.LorebookEntry(
            id=str(uuid.uuid4()),
            lorebook_id=new_book.id,
            keys=keys_str,
            content=item.get("content", ""),
            comment=item.get("comment", ""),
            enabled=item.get("enabled", True),
            priority=item.get("priority", 10),
            order=item.get("order", 100),
            probability=item.get("probability", 100),
            use_regex=item.get("useRegex", item.get("use_regex", False)),
            case_sensitive=item.get("caseSensitive", item.get("case_sensitive", False)),
            match_whole_word=item.get("matchWholeWord", item.get("match_whole_word", False)),
            exclude=item.get("exclude", False),
            constant=item.get("constant", False),
            authors_note=item.get("authorsNote", False)
        )
        new_entries.append(entry)
        
        # 收集需要同步到向量存储的条目
        if entry.enabled and entry.content:
            entries_for_sync.append(entry)
    
    if new_entries:
        db.bulk_save_objects(new_entries)
        db.commit()
    
    # 在后台异步处理向量存储同步
    if entries_for_sync:
        asyncio.create_task(_sync_lore_entries(entries_for_sync))
    
    return {"id": new_book.id, "name": new_book.name, "count": len(new_entries)}

# --- 条目管理 ---

@router.post("/items", response_model=schemas.LoreItemResponse)
async def create_entry(entry_in: schemas.LoreItemBase, book_id: str, db: Session = Depends(get_db)):
    item_data = schemas.LoreItemCreate(
        id=str(uuid.uuid4()),
        lorebook_id=book_id,
        **entry_in.model_dump(by_alias=False)
    )
    new_item = crud_lorebook.create_lore_item(db, item_data)
    
    # [Vector Sync]
    if new_item.enabled:
        await vector_store.upsert_lore(
            new_item.id, 
            new_item.content, 
            new_item.lorebook_id, 
            tags=new_item.keys
        )
        
    return new_item

@router.put("/items/{item_id}", response_model=schemas.LoreItemResponse)
async def update_entry(item_id: str, payload: schemas.LoreItemUpdate, db: Session = Depends(get_db)):
    item = crud_lorebook.update_lore_item(db, item_id, payload)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    # [Vector Sync]
    if item.enabled:
        await vector_store.upsert_lore(
            item.id, 
            item.content, 
            item.lorebook_id, 
            tags=item.keys
        )
    else:
        # If disabled, remove from vector store
        await vector_store.delete_lore(item.id)
        
    return item

@router.delete("/items/{item_id}")
async def delete_entry(item_id: str, db: Session = Depends(get_db)):
    success = crud_lorebook.delete_lore_item(db, item_id)
    if not success:
        raise HTTPException(status_code=404)
        
    # [Vector Sync]
    await vector_store.delete_lore(item_id)
    
    return {"ok": True}
