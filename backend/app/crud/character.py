# backend/app/crud/character.py
from sqlalchemy.orm import Session
from app.db.models import CharacterCard
from app.schemas.character import CharacterCardCreate, CharacterCardUpdate

def get_cards(db: Session):
    # [修复] tags 是 JSON 类型，SQLAlchemy 会自动转为 list，无需手动 split
    return db.query(CharacterCard).all()

def create_card(db: Session, card: CharacterCardCreate):
    db_card = CharacterCard(
        id=card.id,
        name=card.name,
        description=card.description,
        persona=card.persona,
        scenario=card.scenario,
        first_mes=card.first_mes,
        system_prompt=card.system_prompt,
        creator_notes=card.creator_notes,
        # [修复] 直接传入 list，不需要 join
        tags=card.tags, 
        alternate_greetings=card.alternate_greetings, # [新增]
        user_alias=card.user_alias
    )
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card

def update_card(db: Session, card_id: str, card_update: CharacterCardUpdate):
    db_card = db.query(CharacterCard).filter(CharacterCard.id == card_id).first()
    if not db_card:
        return None

    update_data = card_update.model_dump(exclude_unset=True)

    # [修复] 自动处理所有字段，包括 tags 和 user_alias
    # 因为 tags 在 Pydantic 里已经是 list，数据库也是 JSON，直接赋值即可
    for key, value in update_data.items():
        setattr(db_card, key, value)

    db.commit()
    db.refresh(db_card)
    return db_card

def delete_card(db: Session, card_id: str):
    db_card = db.query(CharacterCard).filter(CharacterCard.id == card_id).first()
    if db_card:
        db.delete(db_card)
        db.commit()
        return True
    return False