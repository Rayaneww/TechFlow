FROM python:3.11-slim

WORKDIR /app

# Install uv
RUN pip install uv --no-cache-dir

# Copy dependency files first (layer cache)
COPY pyproject.toml .
RUN uv sync --no-dev

# Copy application code
COPY . .

# Persist SQLite outside the container layer
VOLUME ["/app/data"]

ENV DATABASE_URL=sqlite:////app/data/techflow.db

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
