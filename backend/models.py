import json
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class TechCard(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    original_title: str
    summary: Optional[str] = None
    key_points: str  # JSON-encoded list[str]
    difficulty: int  # 1=Beginner, 2=Intermediate, 3=Advanced
    tags: str  # JSON-encoded list[str]
    source: str
    url: str
    image_url: Optional[str] = None
    published_date: Optional[str] = None
    topic: str = "llm"
    saved: bool = False
    ignored: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TechCardRead(SQLModel):
    id: int
    title: str
    original_title: str
    summary: Optional[str] = None
    key_points: list[str]
    difficulty: int
    tags: list[str]
    source: str
    url: str
    image_url: Optional[str] = None
    published_date: Optional[str] = None
    topic: str


def card_to_read(card: TechCard) -> TechCardRead:
    return TechCardRead(
        id=card.id,
        title=card.title,
        original_title=card.original_title,
        summary=card.summary,
        key_points=json.loads(card.key_points),
        difficulty=card.difficulty,
        tags=json.loads(card.tags),
        source=card.source,
        url=card.url,
        image_url=card.image_url,
        published_date=card.published_date,
        topic=card.topic,
    )
