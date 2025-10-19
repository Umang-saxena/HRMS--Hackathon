# Use a lightweight Python base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Prevent Python from writing pyc files and enable output flushing
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies
RUN apt-get update && apt-get install -y build-essential

# Copy dependency list and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire backend code
COPY . .

# Copy your full environment file into the container
COPY .env /app/.env

# Set environment variable to tell python-dotenv where to look
ENV DOTENV_PATH=/app/.env

# Expose FastAPI port
EXPOSE 8000

# Environment variable for Upstash Redis
# ENV REDIS_URL=""

# Default command (overridden in docker-compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
