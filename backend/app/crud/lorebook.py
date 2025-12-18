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
        # [修复] 这里的属性名是 entries，不是 items
        for item in book.entries:
            if item.keys:
                item.keys = item.keys.split(",")
            else:
                item.keys = []
    return books

def get_lorebook(db: Session, book_id: str):
    book = db.query(db_models.Lorebook).filter(db_models.Lorebook.id == book_id).first()
    if book:
        # [修复] items -> entries
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
        # [修复] items -> entries
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
    
    # [修复] 使用 LorebookEntry
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
    # 恢复 keys 为列表以便返回
    db_obj.keys = item.keys
    return db_obj

def update_lore_item(db: Session, item_id: str, update_data: LoreItemUpdate):
    # [修复] 使用 LorebookEntry
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
    # [修复] 使用 LorebookEntry
    db_obj = db.query(db_models.LorebookEntry).filter(db_models.LorebookEntry.id == item_id).first()
    if db_obj:
        db.delete(db_obj)
        db.commit()
        return True
    return False

# --- 🔥 [新增] 仅获取 Active 的条目 (Server-side Logic) ---
def get_active_lore_entries(db: Session, user_id: str):
    """
    获取指定用户所有 Active Lorebook 下的所有 Enabled Entry
    返回 List[Dict] 格式，Key 风格为 CamelCase 以匹配 lorebook_service
    """
    # 1. 找到该用户所有激活的 Lorebook ID
    active_book_ids = (
        db.query(db_models.Lorebook.id)
        .filter(db_models.Lorebook.user_id == user_id, db_models.Lorebook.is_active == True)
        .all()
    )
    # result is like [('id1',), ('id2',)]
    active_book_ids = [r[0] for r in active_book_ids]

    if not active_book_ids:
        return []

    # 2. 查找这些 Book 下所有 enabled=True 的 Entry
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
        
        # 映射为 CamelCase，供 lorebook_service 使用
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
            # CamelCase Mapping
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

# --- 🔥 [新增] 关键词匹配检索 ---
def search_lore_entries_by_keywords(active_entries: List[Dict], query_text: str, limit: int = 10):
    """
    基于关键词的简单匹配检索
    直接在已获取的条目列表中进行匹配，避免重复数据库查询
    
    Args:
        active_entries: 已获取的活跃条目列表
        query_text: 查询文本
        limit: 返回结果数量限制
    
    Returns:
        匹配的完整条目对象列表
    """
    if not active_entries:
        return []
    
    matched_entries = []
    query_lower = query_text.lower()
    
    for entry in active_entries:
        keywords = entry.get("keywords", [])
        if not keywords:
            continue
            
        # 检查是否有关键词匹配
        for keyword in keywords:
            if not keyword.strip():
                continue
                
            keyword_lower = keyword.lower()
            
            # 简单的包含匹配（可以后续扩展为正则匹配）
            if keyword_lower in query_lower:
                matched_entries.append(entry)
                break  # 找到一个匹配就足够了
    
    # 返回限制数量的结果
    return matched_entries[:limit]
