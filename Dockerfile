FROM node:22-alpine

WORKDIR /app

# Install backend dependencies
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --production

# Install frontend dependencies
COPY frontend/package.json frontend/package-lock.json* ./frontend/
RUN cd frontend && npm ci

# Copy all source
COPY server/ ./server/
COPY frontend/ ./frontend/
RUN mkdir -p frontend/public

# Build frontend
ENV NEXT_TELEMETRY_DISABLED=1
RUN cd frontend && npm run build

# Install root deps (http-proxy for WS proxying)
COPY package.json ./
RUN npm install --production

# Copy combined server + voice prompt
COPY server.js ./
COPY server/pyra-voice-prompt.md ./server/pyra-voice-prompt.md

EXPOSE 3000

CMD ["node", "server.js"]
