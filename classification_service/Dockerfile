# ── Classification Service ──────────────────────────────────
# Lightweight FastAPI image for GST transaction classification.
# Uses sklearn + mlflow for model inference.
# ────────────────────────────────────────────────────────────
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies required by psycopg2 and scikit-learn
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

EXPOSE 8001

# Health check against the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
