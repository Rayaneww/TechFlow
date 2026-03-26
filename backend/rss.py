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


def _extract_image(entry: dict) -> Optional[str]:
    # Try media:content
    media = entry.get("media_content", [])
    if media and isinstance(media, list):
        for m in media:
            url = m.get("url", "")
            if url:
                return url

    # Try media:thumbnail
    thumbnail = entry.get("media_thumbnail", [])
    if thumbnail and isinstance(thumbnail, list):
        url = thumbnail[0].get("url", "")
        if url:
            return url

    # Try enclosures
    enclosures = entry.get("enclosures", [])
    for enc in enclosures:
        if "image" in enc.get("type", ""):
            return enc.get("href", "")

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

                    summary = entry.get("summary", "") or entry.get("description", "")
                    # Strip HTML tags simply
                    import re
                    summary = re.sub(r"<[^>]+>", " ", summary).strip()[:1000]

                    articles.append(
                        {
                            "original_title": entry.get("title", "Untitled")[:300],
                            "url": entry.get("link", ""),
                            "summary_raw": summary,
                            "source": source,
                            "published_date": pub_date[:100] if pub_date else "",
                            "image_url": _extract_image(entry),
                            "topic": topic,
                        }
                    )
            except Exception as e:
                print(f"[rss] Failed to fetch {feed_url}: {e}")
                continue

    # Deduplicate by URL
    seen = set()
    unique = []
    for a in articles:
        if a["url"] and a["url"] not in seen:
            seen.add(a["url"])
            unique.append(a)

    return unique[:limit]
