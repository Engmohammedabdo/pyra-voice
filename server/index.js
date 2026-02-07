require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { handleConnection } = require('./websocket/handler');
const { createSimliSession } = require('./simli/client');
const { saveLead } = require('./memory/supabase');

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

// Config check (non-sensitive) - helps diagnose deployment issues
app.get('/health/config', (req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  res.json({
    google_api_key: apiKey ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)` : 'NOT SET',
    simli_api_key: process.env.SIMLI_API_KEY ? 'SET' : 'NOT SET',
    simli_face_id: process.env.SIMLI_FACE_ID ? 'SET' : 'NOT SET',
    supabase_url: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
    node_env: process.env.NODE_ENV || 'not set',
    n8n_webhook: process.env.N8N_WEBHOOK_URL ? 'SET' : 'NOT SET',
    backend_port: process.env.BACKEND_PORT || '3001 (default)',
  });
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

// Lead capture endpoint
app.post('/api/leads', async (req, res) => {
  try {
    const { sessionId, name, email, phone, businessType, interest } = req.body;

    if (!name && !email && !phone) {
      return res.status(400).json({ error: 'At least one contact field required' });
    }

    await saveLead({ sessionId, name, email, phone, businessType, interest });
    res.json({ success: true });
  } catch (err) {
    console.error('[Leads] Save failed:', err.message);
    res.status(500).json({ error: 'Failed to save lead' });
  }
});

// Simli config for frontend
app.get('/api/simli/config', (req, res) => {
  const apiKey = process.env.SIMLI_API_KEY;
  const faceId = process.env.SIMLI_FACE_ID;

  if (!apiKey || !faceId) {
    return res.status(404).json({ configured: false });
  }

  res.json({ configured: true, apiKey, faceId });
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
