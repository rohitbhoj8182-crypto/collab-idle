require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { connectDB } = require('./utils/db');
const { setupWebSocketServer } = require('./handlers/wsHandler');
const { sessionRouter } = require('./handlers/sessionHandler');
const { roomRouter } = require('./handlers/roomHandler');
const authRouter = require('./routes/auth');
const runRouter = require('./routes/run');
const fileRouter = require('./routes/files');

const app = express();
const server = http.createServer(app);

// ── Connect to MongoDB ─────────────────────────────────────────────────────────
connectDB();

// ── Security middleware ────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── CORS ───────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Allow no-origin requests (curl, Postman) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ──────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

const runLimiter = rateLimit({
  windowMs: 60000,
  max: 20,
  message: { error: 'Too many code execution requests. Please wait.' },
});

// ── REST Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/run', runLimiter, runRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/rooms', roomRouter);
app.use('/api/files', fileRouter);

app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ── WebSocket server ───────────────────────────────────────────────────────────
const wss = new WebSocket.Server({ server, path: '/ws' });
setupWebSocketServer(wss);

// ── Start ──────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 3001;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
  console.log(`\n🚀 CollabIDE Server running at http://${HOST}:${PORT}`);
  console.log(`🔌 WebSocket endpoint: ws://${HOST}:${PORT}/ws`);
  console.log(`🔑 Auth: http://${HOST}:${PORT}/api/auth`);
  console.log(`▶️  Run: http://${HOST}:${PORT}/api/run`);
  console.log(`📊 Health: http://${HOST}:${PORT}/api/health\n`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });
