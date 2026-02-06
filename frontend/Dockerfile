FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Ensure public/ exists
RUN mkdir -p public

# Build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Run
ENV NODE_ENV=production
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
