import asyncio
import json
import os
from contextlib import asynccontextmanager
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def ingest_topic(topic: str, session: Session):
    """Fetch RSS articles for a topic and generate TechCards, skipping duplicates."""
    if topic in _ingesting:
        return
    _ingesting.add(topic)
    try:
        articles = await fetch_articles(topic, limit=20)
        existing_urls = set(
            row for row in session.exec(select(TechCard.url).where(TechCard.topic == topic))
        )

        new_articles = [a for a in articles if a["url"] not in existing_urls]
        if not new_articles:
            return

        # Generate cards concurrently (up to 5 at once to avoid rate limits)
        sem = asyncio.Semaphore(5)

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
    topic: str = Query("llm"),
    limit: int = Query(10, ge=1, le=50),
    background_tasks: BackgroundTasks = None,
    session: Session = Depends(get_session),
):
    if topic not in TOPICS:
        raise HTTPException(status_code=400, detail=f"Unknown topic: {topic}")

    available = session.exec(
        select(TechCard)
        .where(TechCard.topic == topic)
        .where(TechCard.saved == False)
        .where(TechCard.ignored == False)
        .limit(limit)
    ).all()

    # If fewer than requested, trigger background ingestion
    if len(available) < limit and background_tasks:
        background_tasks.add_task(ingest_topic, topic, Session(engine))

    return [card_to_read(c) for c in available]


@app.post("/ingest")
async def trigger_ingest(
    topic: str = Query("llm"),
    session: Session = Depends(get_session),
):
    """Manually trigger RSS ingestion for a topic."""
    if topic not in TOPICS:
        raise HTTPException(status_code=400, detail=f"Unknown topic: {topic}")
    asyncio.create_task(ingest_topic(topic, session))
    return {"status": "ingestion started", "topic": topic}


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


@app.get("/saved", response_model=list[TechCardRead])
async def get_saved(session: Session = Depends(get_session)):
    cards = session.exec(
        select(TechCard).where(TechCard.saved == True).order_by(TechCard.created_at.desc())
    ).all()
    return [card_to_read(c) for c in cards]


@app.get("/health")
async def health():
    return {"status": "ok"}
