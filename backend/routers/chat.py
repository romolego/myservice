from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/mock", response_model=schemas.ChatMockResponse)
def mock_chat(payload: schemas.ChatMockRequest, db: Session = Depends(get_db)):
    keywords = [word.lower() for word in payload.message.split() if len(word.strip()) > 2]

    cards: List[models.Card] = []

    if keywords:
        query = db.query(models.Card).join(models.Domain)
        patterns = [f"%{kw}%" for kw in keywords]
        conditions = [
            or_(models.Card.title.ilike(pattern), models.Card.description.ilike(pattern))
            for pattern in patterns
        ]
        query = query.filter(or_(*conditions))
        cards = query.limit(5).all()

    used_cards = [
        schemas.ChatUsedCard(
            id=card.id,
            title=card.title,
            domain_name=card.domain.name if card.domain else None,
            status=card.status,
        )
        for card in cards
    ]

    if not used_cards:
        answer = (
            "Пока я не нашёл подходящих карточек по вашему запросу. "
            "Попробуйте уточнить формулировку или добавить другие ключевые слова."
        )
    else:
        titles = ", ".join(card.title for card in cards)
        answer = (
            f"По вашему запросу я отобрал {len(cards)} карточек: {titles}. "
            "Сейчас сервис работает в режиме имитации и не генерирует полный текст ответа, "
            "но вы можете открыть эти карточки и посмотреть подробности и источники."
        )

    return schemas.ChatMockResponse(answer=answer, used_cards=used_cards)
