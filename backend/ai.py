"""
Card generation without any AI/LLM.
Produces TechCards from RSS article data using text heuristics only.
"""
import re

# ── Keyword taxonomy per topic ────────────────────────────────────────────────
_TOPIC_TAGS: dict[str, list[str]] = {
    "llm": [
        "llm", "transformer", "gpt", "bert", "fine-tuning", "inference", "embedding",
        "rag", "agent", "prompt", "tokenizer", "diffusion", "multimodal", "instruct",
        "reasoning", "benchmark", "hallucination", "alignment", "rlhf",
    ],
    "bioinformatics": [
        "genome", "rna", "dna", "protein", "sequencing", "crispr", "variant",
        "alignment", "phylogenetic", "metagenomics", "proteomics", "cell",
        "mutation", "cancer", "drug", "clinical", "biomarker",
    ],
    "cybersecurity": [
        "vulnerability", "exploit", "malware", "ransomware", "phishing", "cve",
        "patch", "zero-day", "breach", "authentication", "encryption", "botnet",
        "backdoor", "privilege", "injection", "firewall", "threat",
    ],
    "devops": [
        "kubernetes", "docker", "ci/cd", "terraform", "helm", "observability",
        "deployment", "pipeline", "container", "microservice", "monitoring", "gitops",
        "ansible", "prometheus", "grafana", "artifact", "cluster",
    ],
}

# Vocabulary that signals high difficulty (score +1 each)
_ADVANCED_TERMS = {
    "stochastic", "gradient", "backpropagation", "eigenvalue", "entropy",
    "probabilistic", "asymptotic", "adversarial", "autoregressive", "contrastive",
    "quantization", "distillation", "regularization", "normalization", "variational",
    "bayesian", "heuristic", "parallelism", "concurrency", "polymorphism",
    "diffusion", "latent", "encoder", "decoder", "attention", "transformer",
}

# Vocabulary that signals intermediate difficulty (score +0.5 each)
_INTERMEDIATE_TERMS = {
    "api", "framework", "microservice", "container", "pipeline", "inference",
    "deployment", "benchmark", "architecture", "optimization", "integration",
    "dataset", "training", "evaluation", "orchestration", "configuration",
    "tokenization", "embedding", "model", "cluster", "replica",
}


# ── Text helpers ──────────────────────────────────────────────────────────────

def _clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text)          # strip HTML tags
    text = re.sub(r"&[a-zA-Z#0-9]+;", " ", text)  # HTML entities
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [p.strip() for p in parts if len(p.strip()) > 25]


# ── Card field generators ─────────────────────────────────────────────────────

def _make_title(original: str) -> str:
    """Trim to ≤8 words, remove trailing ' | Source' or ' - Source'."""
    title = re.sub(r"\s*[\|—–\-]\s*\S.{2,}$", "", original).strip()
    words = title.split()
    return " ".join(words[:8]) if len(words) > 8 else title


def _make_key_points(summary: str, source: str) -> list[str]:
    """Extract 3 informative sentences, trimmed to ≤15 words each."""
    sents = _sentences(summary)
    points: list[str] = []

    for s in sents[:8]:
        words = s.split()
        if len(words) < 5:
            continue
        snippet = " ".join(words[:15]) + ("..." if len(words) > 15 else "")
        points.append(snippet)
        if len(points) == 3:
            break

    fallbacks = [
        f"Source: {source} — click 'Read article' for the full text",
        "Save this card to revisit it later from your reading list",
        "Swipe right to keep, left to skip",
    ]
    while len(points) < 3:
        points.append(fallbacks[len(points)])

    return points[:3]


def _make_summary(summary: str, original_title: str) -> str:
    """First clean sentence of ≤20 words, or fallback to title."""
    for s in _sentences(summary):
        words = s.split()
        if 6 <= len(words) <= 30:
            return " ".join(words[:20]) + ("..." if len(words) > 20 else "")
    words = original_title.split()
    return " ".join(words[:20])


def _make_tags(text: str, topic: str) -> list[str]:
    """Return [topic] + up to 3 matched keywords from the taxonomy."""
    lower = text.lower()
    hits: list[str] = []
    for kw in _TOPIC_TAGS.get(topic, []):
        if kw in lower:
            hits.append(kw)
        if len(hits) == 3:
            break
    return ([topic] + hits)[:4]


def _make_difficulty(text: str) -> int:
    """
    Score text vocabulary:
      advanced term  → +1.0
      intermediate   → +0.5
      avg word len > 6.5 → +1.5  (technical prose)
    Score ≥ 4 → 3 (specialist), ≥ 2 → 2 (intermediate), else → 1
    """
    words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
    if not words:
        return 2

    avg_len = sum(len(w) for w in words) / len(words)
    score = 0.0
    if avg_len > 6.5:
        score += 1.5
    elif avg_len > 5.5:
        score += 0.5

    for w in words:
        if w in _ADVANCED_TERMS:
            score += 1.0
        elif w in _INTERMEDIATE_TERMS:
            score += 0.5
        if score >= 6:   # cap early for performance
            break

    if score >= 4:
        return 3
    if score >= 2:
        return 2
    return 1


def _reading_time(text: str) -> int:
    """Estimate minutes to read at 200 wpm."""
    return max(1, round(len(text.split()) / 200))


# ── Public API (same signature as the old AI version) ────────────────────────

async def generate_card(article: dict) -> dict:
    """Build a TechCard dict from RSS article data — no LLM, no network call."""
    raw = _clean(article.get("summary_raw", ""))
    title = article.get("original_title", "Untitled")
    source = article.get("source", "")
    topic = article.get("topic", "llm")
    combined = f"{title} {raw}"

    return {
        "title": _make_title(title),
        "key_points": _make_key_points(raw, source),
        "difficulty": _make_difficulty(combined),
        "tags": _make_tags(combined, topic),
        "summary": _make_summary(raw, title),
        "reading_time": _reading_time(raw),
    }
