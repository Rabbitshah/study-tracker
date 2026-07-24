require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes     = require('./routes/auth.routes');
const subjectRoutes  = require('./routes/subjects.routes');
const logRoutes      = require('./routes/logs.routes');
const backlogRoutes  = require('./routes/backlog.routes');
const progressRoutes = require('./routes/progress.routes');
const courseRoutes   = require('./routes/courses.routes');
const authMiddleware = require('./middleware/auth.middleware');
const errorHandler   = require('./middleware/errorHandler');

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isLocal = process.env.NODE_ENV === 'development' && 
      (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'));
    if (isLocal || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));

// ─── Body Parser ──────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Rate Limiting (auth routes only) ────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later', status: 429 },
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Public Routes ────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);

// ─── Protected Routes (all require JWT) ──────────────────────────────────────
app.use('/api/subjects',  authMiddleware, subjectRoutes);
app.use('/api/logs',      authMiddleware, logRoutes);
app.use('/api/backlog',   authMiddleware, backlogRoutes);
app.use('/api/progress',  authMiddleware, progressRoutes);
app.use('/api/courses',   authMiddleware, courseRoutes);

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found`, status: 404 });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
