from sqlalchemy.orm import Session
from app.modules.lorebook.models import LorebookModel
from app.schemas.lorebook import LorebookV3

def create_lorebook(db: Session, raw_json: dict):
    # 1. 检查
    lb = LorebookV3(**raw_json)
    
    # 2. 入库
    db_obj = LorebookModel(
        name=lb.name or "Untitled Lorebook",
        data=raw_json
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def get_lorebook(db: Session, lb_id: int):
    return db.query(LorebookModel).filter(LorebookModel.id == lb_id).first()