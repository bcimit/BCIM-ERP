/**
 * frontend/server.js
 * Production static file server for the React build.
 * - Serves built files from ./build on port 3000
 * - Proxies /api/*, /uploads/*, /socket.io/* to backend on port 5000
 */
const express  = require('express');
const path     = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app     = express();
const PORT    = process.env.FRONTEND_PORT || 3000;
const BACKEND = process.env.BACKEND_URL   || 'http://localhost:5000';

// ── Proxy API, uploads, socket.io to backend ─────────────────────────────────
// NOTE: When mounted with app.use('/api', ...), Express strips the '/api'
// prefix before passing to the proxy. pathRewrite adds it back so the
// backend receives /api/v1/... instead of /v1/...
const proxyOpts = {
  target: BACKEND,
  changeOrigin: true,
  logLevel: 'silent',
};

app.use('/api',
  createProxyMiddleware({ ...proxyOpts, pathRewrite: { '^': '/api' } })
);
app.use('/uploads',
  createProxyMiddleware({ ...proxyOpts, pathRewrite: { '^': '/uploads' } })
);
app.use('/socket.io',
  createProxyMiddleware({ ...proxyOpts, ws: true, pathRewrite: { '^': '/socket.io' } })
);

// ── Serve React production build ──────────────────────────────────────────────
const BUILD = path.join(__dirname, 'build');
app.use(express.static(BUILD, {
  maxAge: '7d',          // cache static assets for 7 days
  etag:   true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store');
    }
  },
}));

// SPA fallback — all non-asset routes return index.html
app.get('/{*path}', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(BUILD, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BCIM Frontend  →  http://0.0.0.0:${PORT}`);
  console.log(`API proxy      →  ${BACKEND}`);
});
