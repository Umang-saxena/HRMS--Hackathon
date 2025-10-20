# =======================
# Stage 1: Builder
# =======================
FROM python:3.11-slim AS builder

# Set working directory
WORKDIR /app

# Prevent Python from writing pyc files and enable output flushing
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
 && rm -rf /var/lib/apt/lists/*

# Copy only requirements to leverage Docker cache
COPY requirements.txt .

# Install Python packages in /install
RUN pip install --prefix=/install --no-cache-dir -r requirements.txt

# Copy the backend code
COPY . .

# =======================
# Stage 2: Runtime
# =======================
FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy app code
COPY --from=builder /app /app

# Expose FastAPI port
EXPOSE 8000

# Default command to run FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
