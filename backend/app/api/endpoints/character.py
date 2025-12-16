# backend/app/api/endpoints/character.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.schemas.character import CharacterCardResponse, CharacterCardCreate, CharacterCardUpdate
from app.crud import character as crud_character

router = APIRouter()

@router.get("/", response_model=List[CharacterCardResponse])
def read_cards(db: Session = Depends(get_db)):
    return crud_character.get_cards(db)

@router.post("/", response_model=CharacterCardResponse)
def create_card(card: CharacterCardCreate, db: Session = Depends(get_db)):
    return crud_character.create_card(db, card)

@router.patch("/{card_id}", response_model=CharacterCardResponse)
def update_card(card_id: str, card: CharacterCardUpdate, db: Session = Depends(get_db)):
    db_card = crud_character.update_card(db, card_id, card)
    if not db_card:
        raise HTTPException(status_code=404, detail="Character card not found")
    return db_card

@router.delete("/{card_id}")
def delete_card(card_id: str, db: Session = Depends(get_db)):
    success = crud_character.delete_card(db, card_id)
    if not success:
        raise HTTPException(status_code=404, detail="Character card not found")
    return {"status": "success"}