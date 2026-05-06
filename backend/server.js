require('dotenv').config();
const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const connectDB         = require('./config/db');
const { connectRedis }  = require('./config/redis');
const { initSocket }    = require('./config/socket');

// ── Routes ────────────────────────────────────────────────
const authRoutes    = require('./routes/auth');
const adminRoutes   = require('./routes/admin');
const {
  studentRouter,
  driverRouter,
  publicRouter,
  chatRouter,
  shuttleRouter,
  routeListRouter,
  checkinRouter,
} = require('./routes/combined');

// ── App ───────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// Required for Render and all reverse-proxy deployments
app.set('trust proxy', 1);

// ── Connect databases ─────────────────────────────────────
connectDB();
connectRedis();

// ── Security middleware ───────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Rate limiters ─────────────────────────────────────────
const makeLimit = (windowMs, max, message) =>
  rateLimit({ windowMs, max, message: { success: false, message }, standardHeaders: true, legacyHeaders: false });

app.use('/api',                   makeLimit(15 * 60 * 1000, 300, 'Too many requests'));
app.use('/api/auth/login',        makeLimit(15 * 60 * 1000, 10,  'Too many login attempts'));
app.use('/api/auth/send-otp',     makeLimit(60 * 60 * 1000, 5,   'Too many OTP requests'));
app.use('/api/auth/forgot-password', makeLimit(60 * 60 * 1000, 5, 'Too many reset requests'));

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/student',  studentRouter);
app.use('/api/driver',   driverRouter);
app.use('/api/public',   publicRouter);
app.use('/api/chat',     chatRouter);
app.use('/api/shuttles', shuttleRouter);
app.use('/api/routes',   routeListRouter);
app.use('/api/checkin',  checkinRouter);

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ShutliX API v2 running',
    env: process.env.NODE_ENV,
    time: new Date().toISOString(),
  });
});

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
);

// ── Global error handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌', err.message);
  if (err.name === 'ValidationError') {
    const msg = Object.values(err.errors).map(e => e.message).join(', ');
    return res.status(400).json({ success: false, message: msg });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} already exists` });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── WebSocket ─────────────────────────────────────────────
initSocket(server);

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚌 ShutliX v2 running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📡 WebSocket ready`);
  console.log(`🔗 Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = { app, server };
