FROM node:22-alpine

WORKDIR /app

# Install backend dependencies
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --production

# Install frontend dependencies
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm ci

# Copy backend source
COPY server/ ./server/

# Copy frontend source
COPY frontend/ ./frontend/
RUN mkdir -p frontend/public

# Build frontend
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd frontend && npm run build

# Copy voice prompt
COPY server/pyra-voice-prompt.md ./server/pyra-voice-prompt.md

# Start script
COPY start.sh ./start.sh
RUN chmod +x start.sh

EXPOSE 3000

CMD ["./start.sh"]
