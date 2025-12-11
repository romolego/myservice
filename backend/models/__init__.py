from sqlalchemy import Column, Integer

from ..db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)


class Domain(Base):
    __tablename__ = "domains"
    id = Column(Integer, primary_key=True, index=True)


class Source(Base):
    __tablename__ = "sources"
    id = Column(Integer, primary_key=True, index=True)


class Card(Base):
    __tablename__ = "cards"
    id = Column(Integer, primary_key=True, index=True)


class Expert(Base):
    __tablename__ = "experts"
    id = Column(Integer, primary_key=True, index=True)


class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
