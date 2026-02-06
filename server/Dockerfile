FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --production

COPY . .

# Copy voice prompt into the container
COPY pyra-voice-prompt.md ./pyra-voice-prompt.md

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "src/index.js"]
