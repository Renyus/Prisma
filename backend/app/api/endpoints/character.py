from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.character import service
from app.schemas.character import TavernCardV3

router = APIRouter()

@router.post("/upload", summary="上传角色卡")
def upload_character(card: TavernCardV3, db: Session = Depends(get_db)):
    # card 参数会自动把前端传来的 JSON 校验并转成对象
    # 我们把它转回 dict 传给 service
    return service.create_character(db, card.model_dump())

@router.get("/{char_id}", summary="获取角色卡")
def read_character(char_id: int, db: Session = Depends(get_db)):
    db_char = service.get_character(db, char_id)
    if db_char is None:
        raise HTTPException(status_code=404, detail="Character not found")
    # 注意：这里直接返回数据库对象，FastAPI 会自动把它转成 JSON
    return db_char