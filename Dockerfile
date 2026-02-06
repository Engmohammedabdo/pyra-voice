FROM node:22-alpine
WORKDIR /app

# Install all dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy everything
COPY . .

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "server.js"]
