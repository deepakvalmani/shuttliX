'use strict';
/**
 * server.js — ShuttliX v2.0
 * Security: helmet, cors whitelist, mongo-sanitize, compression,
 * request IDs, structured logging, rate limits, graceful shutdown.
 */
require('dotenv').config();
require('./config/env'); // Validate env vars first

const express        = require('express');
const http           = require('http');
const cors           = require('cors');
const helmet         = require('helmet');
const compression    = require('compression');
const mongoSanitize  = require('express-mongo-sanitize');
const rateLimit      = require('express-rate-limit');
const { v4: uuid }   = require('uuid');
const logger         = require('./utils/logger');
const connectDB      = require('./config/db');
const redis          = require('./config/redis');
const { initSocket } = require('./config/socket');

const app    = express();
const server = http.createServer(app);

const ALLOWED_ORIGINS = (process.env.CLIENT_URLS || 'http://localhost:5173')
  .split(',').map(s => s.trim());

// ── Security headers ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      imgSrc:     ["'self'", 'data:', 'https://*.cartocdn.com', 'https://unpkg.com'],
      connectSrc: ["'self'", ...ALLOWED_ORIGINS, 'wss:', 'ws:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
}));

app.use(compression({ threshold: 1024 }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(mongoSanitize({ replaceWith: '_' }));

// ── Request ID ────────────────────────────────────────────
app.use((req, res, next) => {
  const id = req.headers['x-request-id'] || uuid();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
});

// ── Structured request logging ────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => logger.http({
    method: req.method, url: req.originalUrl,
    status: res.statusCode, ms: Date.now() - start,
    requestId: req.requestId,
  }));
  next();
});

// ── Rate limits ───────────────────────────────────────────
const limiter = (max, windowMin = 15) => rateLimit({
  windowMs: windowMin * 60 * 1000, max,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many requests — slow down.' },
});
app.use('/api/auth',    limiter(30, 15));  // 30 auth per 15 min
app.use('/api',         limiter(500, 15)); // 500 general per 15 min

// ── Health ────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', version: '2.0.0', ts: new Date().toISOString() })
);

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/admin',   require('./routes/admin'));
app.use('/api/driver',  require('./routes/driver'));
app.use('/api/student', require('./routes/student'));
app.use('/api/public',  require('./routes/public'));
app.use('/api',         require('./routes/combined'));

// ── 404 ───────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Not found' }));

// ── Global error handler ──────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.statusCode || err.status || 500;
  logger.error({ err, requestId: req.requestId });
  res.status(status).json({
    success: false,
    message: status < 500 ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

process.on('unhandledRejection', r => logger.error({ msg: 'Unhandled rejection', r }));
process.on('uncaughtException',  e => { logger.error({ msg: 'Uncaught exception', e }); process.exit(1); });

// ── Boot ──────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
(async () => {
  await connectDB();
  await redis();
  initSocket(server);
  server.listen(PORT, () => logger.info({ msg: 'ShuttliX v2.0 running', port: PORT }));
})();

// ── Graceful shutdown ─────────────────────────────────────
const shutdown = sig => {
  logger.info(`${sig} — shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
