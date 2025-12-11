from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/domains", tags=["domains"])


@router.get("/", response_model=List[schemas.DomainRead])
def list_domains(db: Session = Depends(get_db)):
    return db.query(models.Domain).all()


@router.get("/{domain_id}", response_model=schemas.DomainRead)
def get_domain(domain_id: int, db: Session = Depends(get_db)):
    domain = db.get(models.Domain, domain_id)
    if not domain:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found")
    return domain


@router.post("/", response_model=schemas.DomainRead, status_code=status.HTTP_201_CREATED)
def create_domain(domain: schemas.DomainCreate, db: Session = Depends(get_db)):
    db_domain = models.Domain(**domain.model_dump())
    db.add(db_domain)
    db.commit()
    db.refresh(db_domain)
    return db_domain


@router.put("/{domain_id}", response_model=schemas.DomainRead)
def update_domain(domain_id: int, domain: schemas.DomainUpdate, db: Session = Depends(get_db)):
    db_domain = db.get(models.Domain, domain_id)
    if not db_domain:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found")

    for key, value in domain.model_dump(exclude_unset=True).items():
        setattr(db_domain, key, value)

    db.commit()
    db.refresh(db_domain)
    return db_domain


@router.delete("/{domain_id}", response_model=schemas.DomainRead)
def delete_domain(domain_id: int, db: Session = Depends(get_db)):
    db_domain = db.get(models.Domain, domain_id)
    if not db_domain:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Domain not found")

    result = schemas.DomainRead.model_validate(db_domain)
    db.delete(db_domain)
    db.commit()
    return result
