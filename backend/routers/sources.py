from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("/", response_model=List[schemas.SourceRead])
def list_sources(db: Session = Depends(get_db)):
    return db.query(models.Source).all()


@router.get("/{source_id}", response_model=schemas.SourceRead)
def get_source(source_id: int, db: Session = Depends(get_db)):
    source = db.get(models.Source, source_id)
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    return source


@router.post("/", response_model=schemas.SourceRead, status_code=status.HTTP_201_CREATED)
def create_source(source: schemas.SourceCreate, db: Session = Depends(get_db)):
    db_source = models.Source(**source.model_dump())
    db.add(db_source)
    db.commit()
    db.refresh(db_source)
    return db_source


@router.put("/{source_id}", response_model=schemas.SourceRead)
def update_source(source_id: int, source: schemas.SourceUpdate, db: Session = Depends(get_db)):
    db_source = db.get(models.Source, source_id)
    if not db_source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")

    for key, value in source.model_dump(exclude_unset=True).items():
        setattr(db_source, key, value)

    db.commit()
    db.refresh(db_source)
    return db_source


@router.delete("/{source_id}", response_model=schemas.SourceRead)
def delete_source(source_id: int, db: Session = Depends(get_db)):
    db_source = db.get(models.Source, source_id)
    if not db_source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")

    result = schemas.SourceRead.model_validate(db_source)
    db.delete(db_source)
    db.commit()
    return result
