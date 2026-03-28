# ── Anomaly Detection Service (OPTIMIZED) ───────────────────────────────────
# Target: < 2 GB image
# Key wins:
#   1. python:3.10-slim base (minimal Debian, no Conda/extras)
#   2. CPU-only PyTorch from the official CPU index (saves ~1.5–2 GB vs CUDA)
#   3. --no-cache-dir on every pip call (no wheel cache left in the layer)
#   4. Build tools purged after install (apt clean-up in same RUN layer)
#   5. Models are NOT baked in – mount/download at runtime via env var
#   6. .dockerignore keeps tests, __pycache__, .git, models, etc. out of context
# ────────────────────────────────────────────────────────────────────────────

FROM python:3.10-slim

# ── Metadata ─────────────────────────────────────────────────────────────────
LABEL maintainer="FintechAnti" \
      service="anomaly_service" \
      version="1.0"

# ── Environment tweaks ───────────────────────────────────────────────────────
# Prevents .pyc files; ensures logs are flushed immediately; tells
# sentence-transformers / HuggingFace where to cache downloads at runtime.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/tmp/hf_cache \
    TRANSFORMERS_CACHE=/tmp/hf_cache \
    SENTENCE_TRANSFORMERS_HOME=/tmp/st_cache

WORKDIR /app

# ── System deps (install + clean in one layer) ───────────────────────────────
# libpq-dev  → psycopg2-binary compiles fine without build-essential at runtime
# We purge the apt lists immediately to keep the layer small.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ──────────────────────────────────────────────────────
# STEP 1: Install CPU-only PyTorch FIRST from the dedicated CPU index.
#         This avoids pulling ~1.5 GB of CUDA libraries that the default
#         PyPI wheel bundles.  Must be its own RUN so the index flag applies.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
        torch==2.3.1 \
        --index-url https://download.pytorch.org/whl/cpu

# STEP 2: Install everything else (sentence-transformers will reuse the
#         already-installed CPU torch rather than pulling CUDA flavour).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application source (respects .dockerignore) ──────────────────────────────
COPY app/ ./app/

# ── Runtime ──────────────────────────────────────────────────────────────────
EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8002/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
