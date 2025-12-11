from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/experts", tags=["experts"])


@router.get("/", response_model=List[schemas.ExpertRead])
def list_experts(db: Session = Depends(get_db)):
    return db.query(models.Expert).all()


@router.get("/{expert_id}", response_model=schemas.ExpertRead)
def get_expert(expert_id: int, db: Session = Depends(get_db)):
    expert = db.get(models.Expert, expert_id)
    if not expert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert not found")
    return expert


@router.post("/", response_model=schemas.ExpertRead, status_code=status.HTTP_201_CREATED)
def create_expert(expert: schemas.ExpertCreate, db: Session = Depends(get_db)):
    db_expert = models.Expert(**expert.model_dump())
    db.add(db_expert)
    db.commit()
    db.refresh(db_expert)
    return db_expert


@router.put("/{expert_id}", response_model=schemas.ExpertRead)
def update_expert(expert_id: int, expert: schemas.ExpertUpdate, db: Session = Depends(get_db)):
    db_expert = db.get(models.Expert, expert_id)
    if not db_expert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert not found")

    for key, value in expert.model_dump(exclude_unset=True).items():
        setattr(db_expert, key, value)

    db.commit()
    db.refresh(db_expert)
    return db_expert


@router.delete("/{expert_id}", response_model=schemas.ExpertRead)
def delete_expert(expert_id: int, db: Session = Depends(get_db)):
    db_expert = db.get(models.Expert, expert_id)
    if not db_expert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert not found")

    result = schemas.ExpertRead.model_validate(db_expert)
    db.delete(db_expert)
    db.commit()
    return result
