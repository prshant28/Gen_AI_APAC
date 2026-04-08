FROM python:3.11-slim

WORKDIR /workspace

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js for building the frontend
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Build the frontend
RUN npm install
RUN npm run build

ENV PYTHONUNBUFFERED=1

# Cloud Run provides the PORT environment variable.
# main.py will read it and listen on the correct port.
CMD ["python3", "main.py"]
