/**
 * Combined server: Next.js frontend + WebSocket proxy on same port
 * This solves the WebSocket upgrade issue that Next.js rewrites can't handle
 */
const http = require('http');
const httpProxy = require('http-proxy');
const next = require('next');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const FRONTEND_DIR = __dirname;
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '3001');
const PORT = parseInt(process.env.FRONTEND_PORT || '3000');

// Start backend
console.log('[Combined] Starting backend...');
require('./server/index.js');

// Wait for backend to be ready, then start frontend
setTimeout(async () => {
  console.log('[Combined] Starting frontend...');
  
  const app = next({ dev, dir: FRONTEND_DIR });
  const handle = app.getRequestHandler();
  
  await app.prepare();
  
  // Create proxy for API requests
  const proxy = httpProxy.createProxyServer({
    target: `http://localhost:${BACKEND_PORT}`,
    ws: true,
    changeOrigin: true,
  });
  
  proxy.on('error', (err, req, res) => {
    console.error('[Proxy] Error:', err.message);
    if (res && res.writeHead) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Backend unavailable' }));
    }
  });
  
  const server = http.createServer((req, res) => {
    const url = req.url;
    
    // Proxy API and health requests to backend
    if (url.startsWith('/api/') || url === '/health') {
      proxy.web(req, res);
      return;
    }
    
    // Everything else goes to Next.js
    handle(req, res);
  });
  
  // Handle WebSocket upgrade on /ws path
  server.on('upgrade', (req, socket, head) => {
    if (req.url === '/ws') {
      console.log('[Combined] WebSocket upgrade → backend');
      proxy.ws(req, socket, head);
    } else {
      socket.destroy();
    }
  });
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Combined] Ready on port ${PORT}`);
    console.log(`[Combined] Frontend: http://localhost:${PORT}`);
    console.log(`[Combined] WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`[Combined] Backend: http://localhost:${BACKEND_PORT}`);
  });
}, 2000);
