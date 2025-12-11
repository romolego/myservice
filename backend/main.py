from fastapi import FastAPI

from .db import Base, engine
from .routers import (
    users_router,
    domains_router,
    sources_router,
    cards_router,
    experts_router,
    events_router,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="MyService API")


@app.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(users_router)
app.include_router(domains_router)
app.include_router(sources_router)
app.include_router(cards_router)
app.include_router(experts_router)
app.include_router(events_router)
