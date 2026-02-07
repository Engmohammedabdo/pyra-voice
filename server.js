/**
 * Combined server: Next.js frontend + WebSocket proxy on same port.
 * Uses health check polling instead of a fixed timeout to wait for backend.
 */
const http = require('http');
const httpProxy = require('http-proxy');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const FRONTEND_DIR = __dirname;
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '3001');
const PORT = parseInt(process.env.PORT || process.env.FRONTEND_PORT || '3000');

// Start backend
console.log('[Combined] Starting backend...');
require('./server/index.js');

function waitForBackend(port, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://localhost:${port}/health`, (res) => {
        if (res.statusCode === 200) {
          console.log(`[Combined] Backend ready after ${attempts} attempt(s)`);
          resolve();
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.setTimeout(1000, retry);
    };
    const retry = () => {
      if (attempts >= maxAttempts) {
        reject(new Error(`Backend not ready after ${maxAttempts} attempts`));
      } else {
        setTimeout(check, 500);
      }
    };
    check();
  });
}

(async () => {
  try {
    await waitForBackend(BACKEND_PORT);

    console.log('[Combined] Starting frontend...');
    const app = next({ dev, dir: FRONTEND_DIR });
    const handle = app.getRequestHandler();
    await app.prepare();

    const proxy = httpProxy.createProxyServer({
      target: `http://localhost:${BACKEND_PORT}`,
      ws: true,
      changeOrigin: true,
    });

    proxy.on('error', (err, req, res) => {
      console.error('[Proxy] Error:', err.message);
      if (res && typeof res.writeHead === 'function') {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend unavailable' }));
      }
    });

    const server = http.createServer((req, res) => {
      const url = req.url;
      if (url.startsWith('/api/') || url === '/health') {
        proxy.web(req, res);
        return;
      }
      handle(req, res);
    });

    server.on('upgrade', (req, socket, head) => {
      if (req.url === '/ws') {
        proxy.ws(req, socket, head);
      } else {
        socket.destroy();
      }
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[Combined] Ready on port ${PORT}`);
      console.log(`[Combined] Frontend: http://localhost:${PORT}`);
      console.log(`[Combined] WebSocket: ws://localhost:${PORT}/ws`);
    });
  } catch (err) {
    console.error('[Combined] Failed to start:', err.message);
    process.exit(1);
  }
})();
