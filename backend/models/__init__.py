from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from ..db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    cards = relationship("Card", back_populates="owner", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="user", cascade="all, delete-orphan")
    expert_profiles = relationship("Expert", back_populates="user", cascade="all, delete-orphan")


class Domain(Base):
    __tablename__ = "domains"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    sources = relationship("Source", back_populates="domain", cascade="all, delete-orphan")
    cards = relationship("Card", back_populates="domain", cascade="all, delete-orphan")
    experts = relationship("Expert", back_populates="domain", cascade="all, delete-orphan")


class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=False)
    title = Column(String, nullable=False)
    type = Column(String, nullable=False)
    uri = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    domain = relationship("Domain", back_populates="sources")
    cards = relationship("Card", secondary="cardsources", back_populates="sources")


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    status = Column(String, nullable=True, default="draft")
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    domain = relationship("Domain", back_populates="cards")
    owner = relationship("User", back_populates="cards")
    events = relationship("Event", back_populates="card", cascade="all, delete-orphan")
    sources = relationship("Source", secondary="cardsources", back_populates="cards")


class Expert(Base):
    __tablename__ = "experts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=False)
    level = Column(String, nullable=False)

    user = relationship("User", back_populates="expert_profiles")
    domain = relationship("Domain", back_populates="experts")


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_type = Column(String, nullable=False)
    payload = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    card = relationship("Card", back_populates="events")
    user = relationship("User", back_populates="events")


class CardSource(Base):
    __tablename__ = "cardsources"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id"), nullable=False)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=False)
    note = Column(String, nullable=True)

    card = relationship("Card", back_populates="card_sources")
    source = relationship("Source", back_populates="card_sources")


Card.card_sources = relationship(
    "CardSource", back_populates="card", cascade="all, delete-orphan"
)
Source.card_sources = relationship(
    "CardSource", back_populates="source", cascade="all, delete-orphan"
)
