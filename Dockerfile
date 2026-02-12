# Multi-stage build for Next.js frontend and Python backend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

# Install Node.js for running Next.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend
COPY backend/ ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy built frontend
COPY --from=frontend-builder /app/frontend/.next ./frontend/.next
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/package*.json ./frontend/
COPY --from=frontend-builder /app/frontend/node_modules ./frontend/node_modules
COPY frontend/next.config.ts ./frontend/
COPY frontend/.env.local ./frontend/

# Create startup script with ping
RUN echo '#!/bin/bash\n\
cd /app/backend && uvicorn api:app --host 0.0.0.0 --port 8000 &\n\
cd /app/frontend && npm start &\n\
while true; do\n\
  curl -s https://example.com > /dev/null\n\
  sleep 30\n\
done' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 3000 8000

CMD ["/app/start.sh"]
