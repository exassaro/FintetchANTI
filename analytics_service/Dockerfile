# ── Analytics Service ───────────────────────────────────────
# Central nervous system: dashboard metrics, forecasting
# (Prophet/ARIMA), human review engine, and KPI aggregation.
# ────────────────────────────────────────────────────────────
FROM python:3.10-slim

WORKDIR /app

# System dependencies for prophet, psycopg2, and C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc g++ libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies (separate layer for caching)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

EXPOSE 8003

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8003/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
