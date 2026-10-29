# Production Dockerfile for UK Power Trading Backend
# Pinned to Python 3.12-slim as requested
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# Install curl for docker healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code, data snapshots, and test suite
COPY app/ ./app/
COPY data/ ./data/
COPY tests/ ./tests/

# Expose the API port
EXPOSE 8000

# Docker healthcheck on /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start uvicorn with shell parameter expansion to support dynamic PORT on Heroku/Render
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

