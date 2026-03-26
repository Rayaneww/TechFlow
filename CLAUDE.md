# TechFlow — CLAUDE.md

## Project Overview
TechFlow is a "Swipe-to-Learn" web app for tech researchers and engineers.
Users swipe AI-summarized cards generated from RSS feeds (like Tinder, but for tech news).

## Stack
- **Frontend**: React + Vite + Framer Motion (swipe animations) + TailwindCSS
- **Backend**: Python 3.11 + FastAPI + feedparser + openai (or anthropic SDK)
- **Storage**: SQLite via SQLModel (dev) — swappable to Postgres in prod
- **Package manager**: pnpm (frontend) / uv (backend)

## Project Structure
techflow/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── SwipeCard.jsx       # Single card with drag gesture
│   │   │   ├── CardStack.jsx       # Stack of 3 cards, manages queue
│   │   │   ├── SavedList.jsx       # Reading list drawer
│   │   │   └── TopicSelector.jsx   # RSS topic switcher
│   │   ├── hooks/
│   │   │   └── useSwipe.js         # Swipe direction + threshold logic
│   │   ├── api/
│   │   │   └── client.js           # Fetch wrapper for FastAPI
│   │   └── App.jsx
├── backend/
│   ├── main.py                     # FastAPI app + CORS + routes
│   ├── rss.py                      # feedparser ingestion
│   ├── ai.py                       # LLM call → TechCard JSON
│   ├── models.py                   # SQLModel + Pydantic schemas
│   ├── db.py                       # SQLite session
│   └── prompts/
│       └── card_prompt.txt         # System prompt for card generation
├── CLAUDE.md
└── docker-compose.yml

## Key Data Model
A **TechCard** (sent to frontend) has:
- id, title (short, AI-generated), original_title
- key_points: list[str]  # exactly 3 bullet points
- difficulty: int  # 1=Beginner, 2=Intermediate, 3=Advanced
- tags: list[str]
- source, published_date, url, image_url

## API Endpoints
GET  /cards?topic=llm&limit=10     → list[TechCard]
POST /cards/{id}/save              → saves to reading list
POST /cards/{id}/ignore            → archives card
GET  /saved                        → list[TechCard] (reading list)
GET  /topics                       → available RSS topics

## RSS Topics (pre-configured)
- llm: HuggingFace blog, Arxiv cs.LG, Anthropic blog
- bioinformatics: Nature Biotechnology, PLoS Comp Bio, Arxiv q-bio
- cybersecurity: Krebs, Schneier, TheHackerNews
- devops: Kubernetes blog, HashiCorp blog

## Frontend Behavior
- Cards stack visually (3 visible, back cards slightly scaled down)
- Drag right → green "SAVE" badge appears → saves card
- Drag left → red "IGNORE" badge appears → archives card
- Undo button restores last swiped card
- "Read article" button opens original URL in new tab
- Auto-fetches more cards when queue drops below 3

## AI Card Generation
- Model: claude-sonnet-4-5 (via Anthropic SDK) or gpt-4o-mini (via OpenAI SDK)
- The system prompt lives in backend/prompts/card_prompt.txt
- Output must be strict JSON matching the TechCard schema
- If no image in RSS feed, use a gradient placeholder based on tags

## Dev Commands
# Backend
cd backend && uv run uvicorn main:app --reload --port 8000

# Frontend  
cd frontend && pnpm dev

## Environment Variables
# backend/.env
ANTHROPIC_API_KEY=sk-...
# or
OPENAI_API_KEY=sk-...

DATABASE_URL=sqlite:///./techflow.db
CORS_ORIGINS=http://localhost:5173

## Code Style
- Python: follow PEP8, use async/await throughout FastAPI
- React: functional components only, no class components
- All AI calls must be wrapped in try/except with graceful fallback
- No hardcoded API keys anywhere

## What to build (in order)
1. Backend models + DB setup (models.py, db.py)
2. RSS ingestion (rss.py)  
3. AI card generator (ai.py) with prompt in prompts/card_prompt.txt
4. FastAPI routes (main.py)
5. React CardStack + SwipeCard with Framer Motion
6. API client + wiring
7. Saved articles drawer
8. docker-compose.yml for local dev
```

---

## Le prompt système IA (à mettre dans `backend/prompts/card_prompt.txt`)

Dites également à Claude Code de créer ce fichier :
```
You are a technical content curator for senior engineers and researchers.
Your job is to transform a raw article into a concise "TechCard" for a swipe interface.

RULES:
- Title: max 8 words, action-oriented, no clickbait
- key_points: exactly 3 items, each max 15 words, start with a verb
- difficulty: 1 (anyone can read), 2 (requires domain knowledge), 3 (specialist only)
- tags: 2 to 4 lowercase keywords
- summary: one sentence, max 20 words

RESPOND ONLY WITH VALID JSON. No markdown, no explanation, no backticks.

Schema:
{
  "title": "string",
  "key_points": ["string", "string", "string"],
  "difficulty": 1 | 2 | 3,
  "tags": ["string"],
  "summary": "string"
}
```

---

## Commande de lancement finale pour Claude Code

Une fois le `CLAUDE.md` en place, lancez simplement :
```
Read CLAUDE.md and build the full TechFlow project. 
Start with the backend (models → rss → ai → routes), 
then the frontend (CardStack → SwipeCard → API wiring).
Create all files. Do not ask for confirmation between steps.
