# ── Anomaly Detection Service ───────────────────────────────
# FastAPI service for detecting price/quantity anomalies.
# Uses scikit-learn (Isolation Forest) + sentence-transformers.
# NOTE: torch + transformers make this the heaviest image.
# ────────────────────────────────────────────────────────────
FROM python:3.10-slim

WORKDIR /app

# System dependencies for psycopg2 and C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies (separate layer for caching)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8002/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
