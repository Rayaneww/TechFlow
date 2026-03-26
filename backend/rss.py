import re
import asyncio
import feedparser
import httpx
from typing import Optional

TOPICS: dict[str, list[str]] = {
    "llm": [
        "https://huggingface.co/blog/feed.xml",
        "https://export.arxiv.org/rss/cs.LG",
        "https://www.anthropic.com/blog/rss",
    ],
    "bioinformatics": [
        "https://www.nature.com/nbt.rss",
        "https://journals.plos.org/ploscompbiol/feed/atom",
        "https://export.arxiv.org/rss/q-bio",
    ],
    "cybersecurity": [
        "https://krebsonsecurity.com/feed/",
        "https://www.schneier.com/feed/atom/",
        "https://feeds.feedburner.com/TheHackersNews",
    ],
    "devops": [
        "https://kubernetes.io/feed.xml",
        "https://www.hashicorp.com/blog/feed.xml",
    ],
}

_OG_IMAGE_RE = re.compile(
    r'<meta[^>]+(?:'
    r'property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']'
    r'|content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']'
    r')',
    re.IGNORECASE,
)

_MIN_IMAGE_DIM = 80


def _img_from_html(html: str) -> Optional[str]:
    """Extract first plausible image URL from HTML markup."""
    if not html:
        return None
    # og/twitter meta tags sometimes embedded in feed content
    m = _OG_IMAGE_RE.search(html)
    if m:
        url = (m.group(1) or m.group(2) or "").strip()
        if url.startswith("http"):
            return url
    # <img src="...">
    for m in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.IGNORECASE):
        url = m.group(1).strip()
        if not url.startswith("http"):
            continue
        lower = url.lower()
        if any(s in lower for s in ["pixel", "tracker", "beacon", "icon", "logo", "avatar", "1x1", "spacer"]):
            continue
        img_tag = m.group(0)
        w = re.search(r'width=["\']?(\d+)', img_tag, re.IGNORECASE)
        h = re.search(r'height=["\']?(\d+)', img_tag, re.IGNORECASE)
        if w and int(w.group(1)) < _MIN_IMAGE_DIM:
            continue
        if h and int(h.group(1)) < _MIN_IMAGE_DIM:
            continue
        return url
    return None


def _extract_image_from_entry(entry: dict) -> Optional[str]:
    """Extract image from RSS entry metadata (no HTTP requests)."""
    for m in entry.get("media_content", []):
        url = m.get("url", "")
        if url and url.startswith("http"):
            return url
    for t in entry.get("media_thumbnail", []):
        url = t.get("url", "")
        if url and url.startswith("http"):
            return url
    for enc in entry.get("enclosures", []):
        if "image" in enc.get("type", ""):
            href = enc.get("href", "")
            if href:
                return href
    for content in entry.get("content", []):
        url = _img_from_html(content.get("value", ""))
        if url:
            return url
    url = _img_from_html(entry.get("summary", ""))
    if url:
        return url
    return None


async def _fetch_og_image(client: httpx.AsyncClient, url: str) -> Optional[str]:
    """Fetch the article page and extract og:image from <head>."""
    try:
        resp = await client.get(
            url,
            timeout=8.0,
            headers={"User-Agent": "Mozilla/5.0 (compatible; TechFlow/1.0)"},
        )
        # Only parse the first 10 KB — enough to cover <head>
        snippet = resp.text[:10_000]
        m = _OG_IMAGE_RE.search(snippet)
        if m:
            img_url = (m.group(1) or m.group(2) or "").strip()
            if img_url.startswith("http"):
                return img_url
    except Exception as e:
        print(f"[rss] og:image fetch failed for {url}: {e}")
    return None


def _extract_source_name(feed_url: str) -> str:
    mapping = {
        "huggingface.co": "HuggingFace Blog",
        "arxiv.org/rss/cs.LG": "Arxiv cs.LG",
        "arxiv.org/rss/q-bio": "Arxiv q-bio",
        "anthropic.com": "Anthropic Blog",
        "nature.com": "Nature Biotechnology",
        "plos.org": "PLoS Comp Bio",
        "krebsonsecurity.com": "Krebs on Security",
        "schneier.com": "Schneier on Security",
        "TheHackersNews": "The Hacker News",
        "kubernetes.io": "Kubernetes Blog",
        "hashicorp.com": "HashiCorp Blog",
    }
    for key, name in mapping.items():
        if key in feed_url:
            return name
    return feed_url.split("/")[2].replace("www.", "").replace("feeds.", "")


async def fetch_articles(topic: str, limit: int = 20) -> list[dict]:
    feed_urls = TOPICS.get(topic, TOPICS["llm"])
    articles = []

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        # ── Step 1: parse all RSS feeds ──────────────────────────
        for feed_url in feed_urls:
            try:
                resp = await client.get(feed_url, headers={"User-Agent": "TechFlow/1.0"})
                feed = feedparser.parse(resp.text)
                source = _extract_source_name(feed_url)

                for entry in feed.entries[: limit // len(feed_urls) + 2]:
                    pub_date = ""
                    if hasattr(entry, "published"):
                        pub_date = entry.published
                    elif hasattr(entry, "updated"):
                        pub_date = entry.updated

                    raw_html = ""
                    for content in entry.get("content", []):
                        raw_html = content.get("value", "")
                        if raw_html:
                            break
                    if not raw_html:
                        raw_html = entry.get("summary", "") or entry.get("description", "")

                    summary = re.sub(r"<[^>]+>", " ", raw_html).strip()
                    summary = re.sub(r"\s+", " ", summary)[:1200]

                    articles.append({
                        "original_title": entry.get("title", "Untitled")[:300],
                        "url": entry.get("link", ""),
                        "summary_raw": summary,
                        "source": source,
                        "published_date": pub_date[:100] if pub_date else "",
                        "image_url": _extract_image_from_entry(entry),
                        "topic": topic,
                    })
            except Exception as e:
                print(f"[rss] Failed to fetch {feed_url}: {e}")
                continue

        # ── Step 2: fetch og:image for articles without one ──────
        sem = asyncio.Semaphore(4)

        async def _enrich_image(article: dict) -> None:
            if article["image_url"] or not article["url"]:
                return
            async with sem:
                article["image_url"] = await _fetch_og_image(client, article["url"])

        await asyncio.gather(*[_enrich_image(a) for a in articles])

    # Deduplicate by URL
    seen: set[str] = set()
    unique = []
    for a in articles:
        if a["url"] and a["url"] not in seen:
            seen.add(a["url"])
            unique.append(a)

    return unique[:limit]
