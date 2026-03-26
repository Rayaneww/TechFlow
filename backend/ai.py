import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

PROMPT_PATH = Path(__file__).parent / "prompts" / "card_prompt.txt"
SYSTEM_PROMPT = PROMPT_PATH.read_text().strip()

GROQ_KEY = os.getenv("GROQ_API_KEY", "")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")


def _build_user_message(article: dict) -> str:
    return (
        f"Title: {article['original_title']}\n"
        f"Source: {article['source']}\n"
        f"URL: {article['url']}\n"
        f"Content: {article.get('summary_raw', '')[:800]}"
    )


def _parse_json(text: str) -> dict:
    text = text.strip()
    # Strip markdown fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    return json.loads(text.strip())


def _validate_card(data: dict) -> dict:
    rt = data.get("reading_time")
    return {
        "title": str(data.get("title", "Untitled"))[:120],
        "key_points": [str(p) for p in data.get("key_points", [])[:3]],
        "difficulty": int(data.get("difficulty", 2)),
        "tags": [str(t).lower() for t in data.get("tags", [])[:4]],
        "summary": str(data.get("summary", ""))[:300],
        "reading_time": int(rt) if rt else None,
    }


async def generate_card_groq(article: dict) -> dict:
    from groq import AsyncGroq

    client = AsyncGroq(api_key=GROQ_KEY)
    for attempt in range(3):
        try:
            resp = await client.chat.completions.create(
                model="llama-3.1-8b-instant",
                max_tokens=512,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": _build_user_message(article)},
                ],
            )
            raw = resp.choices[0].message.content
            return _validate_card(_parse_json(raw))
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                await asyncio.sleep(5 * (attempt + 1))
                continue
            raise


async def generate_card_anthropic(article: dict) -> dict:
    import anthropic

    client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_KEY)
    message = await client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _build_user_message(article)}],
    )
    raw = message.content[0].text
    return _validate_card(_parse_json(raw))


async def generate_card_openai(article: dict) -> dict:
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=OPENAI_KEY)
    resp = await client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=512,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_message(article)},
        ],
    )
    raw = resp.choices[0].message.content
    return _validate_card(_parse_json(raw))


async def generate_card_gemini(article: dict) -> dict:
    from google import genai

    client = genai.Client(api_key=GEMINI_KEY)
    prompt = f"{SYSTEM_PROMPT}\n\n{_build_user_message(article)}"
    response = await client.aio.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
    )
    raw = response.text
    return _validate_card(_parse_json(raw))


def _fallback_card(article: dict) -> dict:
    """Create a basic card without AI when both providers fail."""
    title = article["original_title"]
    words = title.split()
    short_title = " ".join(words[:8]) if len(words) > 8 else title

    return {
        "title": short_title,
        "key_points": [
            f"Read the full article from {article['source']}",
            "Click 'Read article' for details",
            "Save to your reading list for later",
        ],
        "difficulty": 2,
        "tags": [article["topic"]],
        "summary": article.get("summary_raw", "")[:120] or "No summary available.",
    }


async def generate_card(article: dict) -> dict:
    try:
        if GROQ_KEY:
            return await generate_card_groq(article)
    except Exception as e:
        print(f"[ai] Groq failed: {e}")

    try:
        if GEMINI_KEY:
            return await generate_card_gemini(article)
    except Exception as e:
        print(f"[ai] Gemini failed: {e}")

    try:
        if ANTHROPIC_KEY:
            return await generate_card_anthropic(article)
    except Exception as e:
        print(f"[ai] Anthropic failed: {e}")

    try:
        if OPENAI_KEY:
            return await generate_card_openai(article)
    except Exception as e:
        print(f"[ai] OpenAI failed: {e}")

    print("[ai] Using fallback card generation")
    return _fallback_card(article)
