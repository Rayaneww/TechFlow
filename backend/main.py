import asyncio
import json
import os
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from ai import generate_card
from db import create_db_and_tables, engine, get_session
from models import TechCard, TechCardRead, card_to_read
from rss import TOPICS, fetch_articles

load_dotenv()

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
_wildcard_cors = CORS_ORIGINS == ["*"]

# Track in-progress ingestion per topic to avoid concurrent fetches
_ingesting: set[str] = set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(title="TechFlow API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=not _wildcard_cors,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def ingest_topic(topic: str, session: Session):
    """Fetch RSS articles for a topic and generate TechCards, skipping duplicates."""
    if topic in _ingesting:
        return
    _ingesting.add(topic)
    try:
        articles = await fetch_articles(topic, limit=10)
        existing_urls = set(
            row for row in session.exec(select(TechCard.url).where(TechCard.topic == topic))
        )

        new_articles = [a for a in articles if a["url"] not in existing_urls]
        if not new_articles:
            return

        # Generate cards one at a time to stay within Groq free tier limits
        sem = asyncio.Semaphore(1)

        async def _gen(article: dict):
            async with sem:
                return article, await generate_card(article)

        results = await asyncio.gather(*[_gen(a) for a in new_articles], return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                print(f"[ingest] Card generation error: {result}")
                continue
            article, card_data = result
            card = TechCard(
                title=card_data["title"],
                original_title=article["original_title"],
                summary=card_data.get("summary", ""),
                key_points=json.dumps(card_data["key_points"]),
                difficulty=card_data["difficulty"],
                tags=json.dumps(card_data["tags"]),
                source=article["source"],
                url=article["url"],
                image_url=article.get("image_url"),
                published_date=article.get("published_date", ""),
                topic=topic,
                reading_time=card_data.get("reading_time"),
            )
            session.add(card)

        session.commit()
        print(f"[ingest] Added {len(new_articles)} cards for topic '{topic}'")
    finally:
        _ingesting.discard(topic)


# ── Routes ──────────────────────────────────────────────────────────────────


@app.get("/topics")
async def get_topics():
    return [
        {"id": "llm", "label": "LLM & AI"},
        {"id": "bioinformatics", "label": "Bioinformatics"},
        {"id": "cybersecurity", "label": "Cybersecurity"},
        {"id": "devops", "label": "DevOps"},
    ]


@app.get("/cards", response_model=list[TechCardRead])
async def get_cards(
    topic: str = Query("all"),
    limit: int = Query(10, ge=1, le=50),
    background_tasks: BackgroundTasks = None,
    session: Session = Depends(get_session),
):
    query = select(TechCard).where(TechCard.saved == False).where(TechCard.ignored == False)

    if topic != "all":
        if topic not in TOPICS:
            raise HTTPException(status_code=400, detail=f"Unknown topic: {topic}")
        query = query.where(TechCard.topic == topic)

    available = session.exec(query.limit(limit)).all()

    # Trigger background ingestion if queue is low
    if len(available) < limit and background_tasks:
        topics_to_ingest = list(TOPICS.keys()) if topic == "all" else [topic]
        for t in topics_to_ingest:
            if t not in _ingesting:
                background_tasks.add_task(ingest_topic, t, Session(engine))

    return [card_to_read(c) for c in available]


@app.post("/ingest")
async def trigger_ingest(topic: str = Query("all")):
    """Manually trigger RSS ingestion. topic='all' ingests every topic."""
    topics_to_ingest = list(TOPICS.keys()) if topic == "all" else [topic]
    for t in topics_to_ingest:
        if t not in TOPICS:
            raise HTTPException(status_code=400, detail=f"Unknown topic: {t}")
        # Always create a fresh session so it outlives the request
        asyncio.create_task(ingest_topic(t, Session(engine)))
    return {"status": "ingestion started", "topics": topics_to_ingest}


@app.post("/cards/{card_id}/save", response_model=TechCardRead)
async def save_card(card_id: int, session: Session = Depends(get_session)):
    card = session.get(TechCard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    card.saved = True
    session.add(card)
    session.commit()
    session.refresh(card)
    return card_to_read(card)


@app.post("/cards/{card_id}/ignore", response_model=TechCardRead)
async def ignore_card(card_id: int, session: Session = Depends(get_session)):
    card = session.get(TechCard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    card.ignored = True
    card.ignored_at = datetime.utcnow()
    session.add(card)
    session.commit()
    session.refresh(card)
    return card_to_read(card)


@app.post("/cards/{card_id}/unsave", response_model=TechCardRead)
async def unsave_card(card_id: int, session: Session = Depends(get_session)):
    card = session.get(TechCard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    card.saved = False
    session.add(card)
    session.commit()
    session.refresh(card)
    return card_to_read(card)


@app.post("/cards/{card_id}/restore", response_model=TechCardRead)
async def restore_card(card_id: int, session: Session = Depends(get_session)):
    """Restore an ignored card back to the feed."""
    card = session.get(TechCard, card_id)
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    card.ignored = False
    card.ignored_at = None
    session.add(card)
    session.commit()
    session.refresh(card)
    return card_to_read(card)


@app.get("/saved", response_model=list[TechCardRead])
async def get_saved(session: Session = Depends(get_session)):
    cards = session.exec(
        select(TechCard).where(TechCard.saved == True).order_by(TechCard.created_at.desc())
    ).all()
    return [card_to_read(c) for c in cards]


@app.get("/history", response_model=list[TechCardRead])
async def get_history(
    period: str = Query("7d"),
    topic: str = Query("all"),
    session: Session = Depends(get_session),
):
    """Return ignored (left-swiped) cards filtered by period and topic."""
    query = select(TechCard).where(TechCard.ignored == True)

    if period != "all":
        days = int(period.replace("d", ""))
        cutoff = datetime.utcnow() - timedelta(days=days)
        query = query.where(TechCard.created_at >= cutoff)

    if topic != "all":
        if topic not in TOPICS:
            raise HTTPException(status_code=400, detail=f"Unknown topic: {topic}")
        query = query.where(TechCard.topic == topic)

    cards = session.exec(query.order_by(TechCard.created_at.desc())).all()
    return [card_to_read(c) for c in cards]


@app.delete("/admin/reset")
async def reset_cards(session: Session = Depends(get_session)):
    """Delete ALL cards so they get re-generated fresh."""
    from sqlalchemy import delete as sa_delete
    session.exec(sa_delete(TechCard))
    session.commit()
    return {"status": "all cards deleted"}


@app.get("/health")
async def health():
    return {"status": "ok"}
