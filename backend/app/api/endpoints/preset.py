from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.preset import service
from app.schemas.preset import SillyTavernPreset

router = APIRouter()

@router.post("/upload", summary="创建预设")
def create_preset(preset: SillyTavernPreset, db: Session = Depends(get_db)):
    return service.create_preset(db, preset.model_dump())

@router.get("/{preset_id}", summary="获取预设")
def read_preset(preset_id: int, db: Session = Depends(get_db)):
    db_preset = service.get_preset(db, preset_id)
    if db_preset is None:
        raise HTTPException(status_code=404, detail="Preset not found")
    return db_preset