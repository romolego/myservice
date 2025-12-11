from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/cards", tags=["cards"])


@router.get("/", response_model=List[schemas.CardRead])
def list_cards(db: Session = Depends(get_db)):
    return db.query(models.Card).all()


@router.get("/{card_id}", response_model=schemas.CardRead)
def get_card(card_id: int, db: Session = Depends(get_db)):
    card = db.get(models.Card, card_id)
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    return card


@router.post("/", response_model=schemas.CardRead, status_code=status.HTTP_201_CREATED)
def create_card(card: schemas.CardCreate, db: Session = Depends(get_db)):
    db_card = models.Card(**card.model_dump())
    db.add(db_card)
    db.commit()
    db.refresh(db_card)
    return db_card


@router.put("/{card_id}", response_model=schemas.CardRead)
def update_card(card_id: int, card: schemas.CardUpdate, db: Session = Depends(get_db)):
    db_card = db.get(models.Card, card_id)
    if not db_card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    for key, value in card.model_dump(exclude_unset=True).items():
        setattr(db_card, key, value)

    db.commit()
    db.refresh(db_card)
    return db_card


@router.delete("/{card_id}", response_model=schemas.CardRead)
def delete_card(card_id: int, db: Session = Depends(get_db)):
    db_card = db.get(models.Card, card_id)
    if not db_card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    result = schemas.CardRead.model_validate(db_card)
    db.delete(db_card)
    db.commit()
    return result
