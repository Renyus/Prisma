from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.lorebook import service
from app.schemas.lorebook import LorebookV3

router = APIRouter()

@router.post("/", summary="上传世界书")
def create_lorebook(lb: LorebookV3, db: Session = Depends(get_db)):
    return service.create_lorebook(db, lb.model_dump())

@router.get("/{lb_id}", summary="获取世界书")
def read_lorebook(lb_id: int, db: Session = Depends(get_db)):
    db_lb = service.get_lorebook(db, lb_id)
    if db_lb is None:
        raise HTTPException(status_code=404, detail="Lorebook not found")
    return db_lb