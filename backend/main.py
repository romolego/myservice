from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from . import models
from .db import Base, engine
from .routers import (
    users_router,
    domains_router,
    sources_router,
    cards_router,
    experts_router,
    events_router,
    chat_router,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MyService API")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/app", StaticFiles(directory=FRONTEND_DIR, html=True), name="app")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(users_router)
app.include_router(domains_router)
app.include_router(sources_router)
app.include_router(cards_router)
app.include_router(experts_router)
app.include_router(events_router)
app.include_router(chat_router)
