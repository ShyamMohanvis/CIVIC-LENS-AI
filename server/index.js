require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const http = require('http');
const { Server } = require('socket.io');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const server = http.createServer(app);

// ─── Hardened CORS — allowlist-based (VULN-032) ───────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow server-to-server calls (no origin) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']
  }
});

// ─── Core Middleware ──────────────────────────────────────────────────────
// Security headers — OWASP Top 10 / VULN-032
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
      connectSrc: ["'self'", ...allowedOrigins]
    }
  }
}));

app.use(cors(corsOptions));

// Express 5 strict-routing fix for global OPTIONS preflight
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return cors(corsOptions)(req, res, () => {
        res.sendStatus(204); // Terminate preflight request successfully
    });
  }
  next();
});

// Prevent MongoDB operator injection ($ and . in keys) — OWASP
// Custom wrapper because express-mongo-sanitize breaks Express 5 req.query getters
const sanitize = require('express-mongo-sanitize').sanitize;
app.use((req, res, next) => {
  if (req.body) req.body = sanitize(req.body, { replaceWith: '_' });
  if (req.params) req.params = sanitize(req.params, { replaceWith: '_' });
  // Joi handles query param validation aggressively, so we skip rewriting req.query
  next();
});

app.use(express.json({ limit: '10mb' })); // Limit payload size

// General rate limiter on all API routes — 100/min/user
app.use('/api/', generalLimiter);

// Database Connection with improved error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/civic-lens')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    console.error('💥 Cannot start server without database. Exiting...');
    process.exit(1);  // Exit if database connection fails
  });

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB runtime error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected. Connection lost.');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

// Make io available globally for controllers
global.io = io;

// Routes
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const voiceRoutes = require('./routes/voiceRoutes');
const eventsRoutes = require('./routes/eventsRoutes');
const upvoteRoutes = require('./routes/upvoteRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const moderationRoutes = require('./routes/moderationRoutes');
const webhookRoutes = require('./routes/webhookRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/complaints/voice', voiceRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/upvotes', upvoteRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/webhooks', webhookRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: 'Gen-6.0',
    security: 'Hardened (Phase B)',
    features: [
      'Trust Scoring', 'Risk Assessment', 'SLA Management',
      'Duplicate Detection', 'Emergency System', 'Analytics & Heatmaps',
      'Voice-to-Complaint', 'Real-time SOS Alerts',
      'Helmet HTTP Security Headers', 'Hardened CORS Allowlist',
      'MongoDB Injection Sanitizer', 'Rate Limiting',
      'DTO Validation (Joi)', 'Idempotency Key Dedup',
      // Phase B additions:
      'Resolution Evidence Verification (GPS + Timestamp + AI)',
      '14-Day Dispute Window',
      'Bot Upvote Anomaly Detection',
      'MFA Mandatory for Authority Roles',
      'Webhook System (HMAC-SHA256 + Replay Protection)',
      'FCM Push + SMS Notifications',
      'My-Penalties Endpoint',
      'Dual-Admin Permanent Ban Approval',
      'Appeal Routing to Different Admin'
    ]
  });
});

// Root Route (Welcome Message)
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to CIVI Lens API',
    version: 'Gen-5',
    endpoints: {
      health: '/health',
      docs: '/api-docs (coming soon)'
    }
  });
});

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Subscribe to general complaints updates
  socket.on('subscribe_complaints', () => {
    socket.join('complaints');
    console.log('📡 Subscribed to complaints updates');
  });

  // Subscribe to emergency alerts (Admin only)
  socket.on('subscribe_emergency_alerts', () => {
    socket.join('emergency_alerts');
    console.log('🚨 Admin subscribed to emergency alerts');
  });

  // Handle admin acknowledgment and broadcast to all users
  socket.on('EMERGENCY_ACKNOWLEDGED', (data) => {
    console.log('\n========================================');
    console.log('✅ ADMIN ACKNOWLEDGED EMERGENCY');
    console.log('Data received:', JSON.stringify(data, null, 2));
    console.log('Broadcasting to ALL connected clients...');
    console.log('Total connected clients:', io.engine.clientsCount);
    console.log('========================================\n');

    // Broadcast to ALL connected clients (not just emergency_alerts room)
    io.emit('EMERGENCY_ACKNOWLEDGED', data);

    console.log('✅ Broadcast complete!');
  });

  // Legacy acknowledge emergency handler
  socket.on('acknowledge_emergency', (emergencyId) => {
    console.log(`✅ Emergency acknowledged: ${emergencyId}`);
    io.to('emergency_alerts').emit('emergency_acknowledged', { emergencyId });
  });

  // Broadcast timer start event
  socket.on('START_SOS_TIMER', (data) => {
    console.log('⏳ Starting SOS timer:', data);
    io.emit('START_SOS_TIMER', data);
  });

  // Handle escalation
  socket.on('ESCALATE_EMERGENCY', (data) => {
    console.log('🔥 EMERGENCY ESCALATED TO OPERATOR:', data);
    io.emit('EMERGENCY_ESCALATED', data);
  });

  socket.on('disconnect', () => {
    console.log('👋 User disconnected:', socket.id);
  });
});

// Emergency namespace for dedicated SOS channel
const emergencyNamespace = io.of('/emergency');
emergencyNamespace.on('connection', (socket) => {
  console.log('🚨 Emergency channel connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('🚨 Emergency channel disconnected:', socket.id);
  });
});

// Make emergency namespace available globally
global.emergencyNamespace = emergencyNamespace;

// Global Error Handler (Improved)
app.use((err, req, res, next) => {
  const fs = require('fs');
  fs.writeFileSync('crash.log', err.stack);
  console.error('❌ Unhandled Error:', err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: process.env.NODE_ENV === 'development' ? err.message : 'Invalid input data'
    });
  }

  // Mongoose cast error (invalid ID)
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      error: 'Resource not found'
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed'
    });
  }

  // Default server error
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    stack: err.stack,
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Gen-5 Features: Trust Scoring, Risk Assessment, SLA Management, Analytics, Voice, Real-time SOS`);
  console.log(`🔗 API: http://localhost:${PORT}/api`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`🚨 Emergency WebSocket: Ready`);
});

module.exports = { app, server, io, emergencyNamespace };
