# backend/app/crud/lorebook.py
from sqlalchemy.orm import Session
from app.db import models as db_models
from app.schemas.lorebook import LorebookCreate, LorebookUpdate, LoreItemCreate, LoreItemUpdate
from typing import List, Dict

# --- Lorebook CRUD ---

def get_lorebooks(db: Session, user_id: str):
    # 使用 created_at 排序
    books = db.query(db_models.Lorebook).filter(db_models.Lorebook.user_id == user_id).order_by(db_models.Lorebook.created_at.desc()).all()
    
    # 填充 entries 的 keys (string -> list)
    for book in books:
        for item in book.entries:
            if item.keys:
                item.keys = item.keys.split(",")
            else:
                item.keys = []
    return books

def get_lorebook(db: Session, book_id: str):
    book = db.query(db_models.Lorebook).filter(db_models.Lorebook.id == book_id).first()
    if book:
        for item in book.entries:
            if item.keys:
                item.keys = item.keys.split(",")
            else:
                item.keys = []
    return book

def create_lorebook(db: Session, book: LorebookCreate):
    db_obj = db_models.Lorebook(
        id=book.id,
        user_id=book.user_id,
        name=book.name,
        description=book.description,
        is_active=book.is_active
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_lorebook(db: Session, book_id: str, update_data: LorebookUpdate):
    db_obj = db.query(db_models.Lorebook).filter(db_models.Lorebook.id == book_id).first()
    if not db_obj:
        return None
    
    data = update_data.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(db_obj, k, v)
        
    db.commit()
    db.refresh(db_obj)
    
    # 手动处理 keys (string -> list)
    try:
        for item in db_obj.entries:
            raw_keys = item.keys
            if not raw_keys:
                item.keys = []
            elif isinstance(raw_keys, str):
                item.keys = raw_keys.split(",")
    except Exception as e:
        print(f"Error processing keys: {e}")

    return db_obj

def delete_lorebook(db: Session, book_id: str):
    db_obj = db.query(db_models.Lorebook).filter(db_models.Lorebook.id == book_id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
        return True
    return False

# --- LoreItem (LorebookEntry) CRUD ---

def create_lore_item(db: Session, item: LoreItemCreate):
    keys_str = ",".join(item.keys) if item.keys else ""
    
    db_obj = db_models.LorebookEntry(
        id=item.id,
        lorebook_id=item.lorebook_id,
        keys=keys_str,
        content=item.content,
        comment=item.comment,
        enabled=item.enabled,
        priority=item.priority,
        order=item.order,
        probability=item.probability,
        use_regex=item.use_regex,
        case_sensitive=item.case_sensitive,
        match_whole_word=item.match_whole_word,
        exclude=item.exclude,
        constant=item.constant,
        contextual=item.contextual,
        authors_note=item.authors_note
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    db_obj.keys = item.keys
    return db_obj

def update_lore_item(db: Session, item_id: str, update_data: LoreItemUpdate):
    db_obj = db.query(db_models.LorebookEntry).filter(db_models.LorebookEntry.id == item_id).first()
    if not db_obj:
        return None

    data = update_data.model_dump(exclude_unset=True)
    
    if "keys" in data:
        keys_list = data.pop("keys")
        db_obj.keys = ",".join(keys_list) if keys_list else ""
        
    for k, v in data.items():
        setattr(db_obj, k, v)
        
    db.commit()
    db.refresh(db_obj)
    
    if db_obj.keys:
        db_obj.keys = db_obj.keys.split(",")
    else:
        db_obj.keys = []
        
    return db_obj

def delete_lore_item(db: Session, item_id: str):
    db_obj = db.query(db_models.LorebookEntry).filter(db_models.LorebookEntry.id == item_id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
        return True
    return False

# --- 🔥 [核心逻辑] 获取活跃条目 (供 chat_service 调用) ---
def get_active_lore_entries(db: Session, user_id: str):
    """
    获取指定用户所有 Active Lorebook 下的所有 Enabled Entry
    返回 List[Dict]，字段名转为 camelCase 以匹配前端习惯
    """
    # 1. 找到所有激活的 Book ID
    active_book_ids = (
        db.query(db_models.Lorebook.id)
        .filter(db_models.Lorebook.user_id == user_id, db_models.Lorebook.is_active == True)
        .all()
    )
    active_book_ids = [r[0] for r in active_book_ids]

    if not active_book_ids:
        return []

    # 2. 找到这些 Book 下所有启用的 Entry
    entries = (
        db.query(db_models.LorebookEntry)
        .filter(
            db_models.LorebookEntry.lorebook_id.in_(active_book_ids),
            db_models.LorebookEntry.enabled == True
        )
        .all()
    )

    result = []
    for e in entries:
        keys_list = e.keys.split(",") if e.keys else []
        
        entry_dict = {
            "id": e.id,
            "lorebookId": e.lorebook_id,
            "keywords": keys_list, 
            "content": e.content,
            "comment": e.comment,
            "enabled": e.enabled,
            "priority": e.priority,
            "order": e.order,
            "probability": e.probability,
            "useRegex": e.use_regex,
            "caseSensitive": e.case_sensitive,
            "matchWholeWord": e.match_whole_word,
            "exclude": e.exclude,
            "constant": e.constant,
            "contextual": e.contextual,
            "authorsNote": e.authors_note
        }
        result.append(entry_dict)
    
    return result

# --- 🔥 [核心修复] 关键词检索 (必须返回对象列表！) ---
def search_lore_entries_by_keywords(active_entries: List[Dict], query_text: str, limit: int = 10) -> List[Dict]:
    """
    基于关键词的简单匹配检索
    
    BUG 修复: 
    旧版本可能返回了 matched_ids (List[str])，导致 chat_service 里的 entry.get('id') 报错。
    现在确保返回 matched_entries (List[Dict])。
    """
    if not active_entries:
        return []
    
    matched_entries = []
    query_lower = query_text.lower()
    
    for entry in active_entries:
        keywords = entry.get("keywords", [])
        if not keywords:
            continue
            
        # 检查关键词匹配
        for keyword in keywords:
            if not keyword.strip():
                continue
                
            keyword_lower = keyword.lower()
            
            # 简单的包含匹配
            if keyword_lower in query_lower:
                matched_entries.append(entry) # <--- 关键点：这里放入完整对象
                break  # 只要命中一个关键词就算触发
    
    # 限制返回数量
    return matched_entries[:limit]