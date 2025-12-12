from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, or_
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


@router.get("/feed", response_model=schemas.CardFeedResponse, tags=["cards_scenarios"])
def get_cards_feed(
    domain_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
):
    page = max(page, 1)
    page_size = min(max(page_size, 1), 100)

    base_query = (
        db.query(models.Card)
        .join(models.Domain)
        .join(models.User)
        .outerjoin(models.CardSource)
        .outerjoin(models.Event)
    )

    if domain_id is not None:
        base_query = base_query.filter(models.Card.domain_id == domain_id)
    if status is not None:
        base_query = base_query.filter(models.Card.status == status)
    if search:
        pattern = f"%{search}%"
        base_query = base_query.filter(
            or_(models.Card.title.ilike(pattern), models.Card.description.ilike(pattern))
        )

    total = base_query.with_entities(func.count(func.distinct(models.Card.id))).scalar()

    results = (
        base_query.with_entities(
            models.Card.id.label("card_id"),
            models.Card.title,
            models.Card.status,
            models.Card.created_at,
            models.Card.updated_at,
            models.Domain.id.label("domain_id"),
            models.Domain.code.label("domain_code"),
            models.Domain.name.label("domain_name"),
            models.User.id.label("owner_id"),
            models.User.name.label("owner_name"),
            func.count(func.distinct(models.CardSource.source_id)).label("source_count"),
            func.max(models.Event.created_at).label("last_event_at"),
        )
        .group_by(
            models.Card.id,
            models.Card.title,
            models.Card.status,
            models.Card.created_at,
            models.Card.updated_at,
            models.Domain.id,
            models.Domain.code,
            models.Domain.name,
            models.User.id,
            models.User.name,
        )
        .order_by(models.Card.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        schemas.CardFeedItem(
            id=row.card_id,
            title=row.title,
            status=row.status,
            domain=schemas.DomainShort(id=row.domain_id, code=row.domain_code, name=row.domain_name),
            owner=schemas.UserShort(id=row.owner_id, name=row.owner_name),
            source_count=row.source_count,
            last_event_at=row.last_event_at,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
        for row in results
    ]

    return schemas.CardFeedResponse(items=items, total=total or 0, page=page, page_size=page_size)


@router.post("/", response_model=schemas.CardRead, status_code=status.HTTP_201_CREATED)
def create_card(card: schemas.CardCreate, db: Session = Depends(get_db)):
    payload = card.model_dump()
    if not payload.get("status"):
        payload["status"] = "draft"
    db_card = models.Card(**payload)
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


@router.get("/{card_id}/full", response_model=schemas.CardFull, tags=["cards_scenarios"])
def get_full_card(card_id: int, db: Session = Depends(get_db)):
    card = db.get(models.Card, card_id)
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")

    events = (
        db.query(models.Event)
        .filter(models.Event.card_id == card_id)
        .order_by(models.Event.created_at.desc())
        .limit(20)
        .all()
    )

    return schemas.CardFull(
        card=schemas.CardRead.model_validate(card),
        domain=schemas.DomainShort.model_validate(card.domain),
        owner=schemas.UserShort.model_validate(card.owner),
        sources=[schemas.SourceShort.model_validate(source) for source in card.sources],
        events=[schemas.EventShort.model_validate(event) for event in events],
    )
