from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.db.session import get_db
from app.db import models

router = APIRouter()

class PromptModuleSchema(BaseModel):
    id: str
    name: str
    content: str
    is_enabled: bool
    position: int
    
    class Config:
        orm_mode = True

@router.get("", response_model=List[PromptModuleSchema])
def get_all_modules(db: Session = Depends(get_db)):
    return db.query(models.SystemPromptModule).order_by(models.SystemPromptModule.position.asc()).all()

@router.put("/{module_id}")
def update_module(module_id: str, payload: PromptModuleSchema, db: Session = Depends(get_db)):
    mod = db.query(models.SystemPromptModule).filter(models.SystemPromptModule.id == module_id).first()
    if not mod:
        raise HTTPException(status_code=404, detail="Module not found")
    
    mod.content = payload.content
    mod.is_enabled = payload.is_enabled
    mod.position = payload.position
    # id 和 name 通常不建议改，或者单独处理
    db.commit()
    db.refresh(mod)
    return mod