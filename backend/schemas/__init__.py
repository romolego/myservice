from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class UserBase(BaseModel):
    email: str
    name: str
    role: str


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None


class UserRead(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserShort(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class DomainBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


class DomainCreate(DomainBase):
    pass


class DomainUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None


class DomainRead(DomainBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class DomainShort(BaseModel):
    id: int
    code: str
    name: str

    model_config = ConfigDict(from_attributes=True)


class SourceBase(BaseModel):
    domain_id: int
    title: str
    type: str
    uri: str
    is_active: bool = True


class SourceCreate(SourceBase):
    pass


class SourceUpdate(BaseModel):
    domain_id: Optional[int] = None
    title: Optional[str] = None
    type: Optional[str] = None
    uri: Optional[str] = None
    is_active: Optional[bool] = None


class SourceRead(SourceBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SourceShort(BaseModel):
    id: int
    title: str
    type: str
    uri: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class CardBase(BaseModel):
    domain_id: int
    title: str
    description: str
    status: str
    owner_id: int


class CardCreate(CardBase):
    pass


class CardUpdate(BaseModel):
    domain_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    owner_id: Optional[int] = None


class CardRead(CardBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EventShort(BaseModel):
    id: int
    event_type: str
    created_at: datetime
    payload: Optional[str] = None
    user: UserShort

    model_config = ConfigDict(from_attributes=True)


class CardFeedItem(BaseModel):
    id: int
    title: str
    status: str
    domain: DomainShort
    owner: UserShort
    source_count: int
    last_event_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CardFeedResponse(BaseModel):
    items: List[CardFeedItem]
    total: int
    page: int
    page_size: int


class CardFull(BaseModel):
    card: CardRead
    domain: DomainShort
    owner: UserShort
    sources: List[SourceShort]
    events: List[EventShort]


class ExpertBase(BaseModel):
    user_id: int
    domain_id: int
    level: str


class ExpertCreate(ExpertBase):
    pass


class ExpertUpdate(BaseModel):
    user_id: Optional[int] = None
    domain_id: Optional[int] = None
    level: Optional[str] = None


class ExpertRead(ExpertBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class EventBase(BaseModel):
    card_id: int
    user_id: int
    event_type: str
    payload: Optional[str] = None


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    card_id: Optional[int] = None
    user_id: Optional[int] = None
    event_type: Optional[str] = None
    payload: Optional[str] = None


class EventRead(EventBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatMockRequest(BaseModel):
    message: str
    card_id: Optional[int] = None


class ChatUsedCard(BaseModel):
    id: int
    title: str
    domain_name: Optional[str] = None
    status: Optional[str] = None


class ChatMockResponse(BaseModel):
    answer: str
    used_cards: List[ChatUsedCard]
