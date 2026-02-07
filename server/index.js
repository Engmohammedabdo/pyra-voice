require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { handleConnection } = require('./websocket/handler');
const { createSimliSession } = require('./simli/client');

const app = express();
const server = http.createServer(app);

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ 
  origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map(s => s.trim()),
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pyra-voice-server', timestamp: new Date().toISOString() });
});

// Simli session token endpoint
app.post('/api/simli/session', async (req, res) => {
  try {
    const session = await createSimliSession();
    res.json(session);
  } catch (err) {
    console.error('[Simli] Session creation failed:', err.message);
    res.status(500).json({ error: 'Failed to create Simli session' });
  }
});

// WebSocket server (noServer for manual upgrade handling behind reverse proxy)
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade (compatible with reverse proxies like Nginx/Coolify)
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws, req) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(`[WS] New connection from ${clientIp}`);
  handleConnection(ws);
});

// Track active connections for logging
setInterval(() => {
  console.log(`[Server] Active WebSocket connections: ${wss.clients.size}`);
}, 60000);

const PORT = process.env.BACKEND_PORT || 3001;
server.listen(PORT, () => {
  console.log(`[Server] Pyra Voice server running on port ${PORT}`);
  console.log(`[Server] Health: http://localhost:${PORT}/health`);
  console.log(`[Server] WebSocket: ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  wss.clients.forEach(client => client.close());
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received, shutting down...');
  wss.clients.forEach(client => client.close());
  server.close(() => process.exit(0));
});
