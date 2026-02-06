#!/bin/sh

# Start backend on port 3001 (internal)
cd /app/server && node src/index.js &

# Wait for backend to be ready
sleep 2

# Start frontend on port 3000 (public)
cd /app/frontend && npm start
