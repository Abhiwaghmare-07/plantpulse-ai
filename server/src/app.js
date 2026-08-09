const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

// Route imports
const machineRoutes  = require('./routes/machineRoutes');
const readingRoutes  = require('./routes/readingRoutes');
const alertRoutes    = require('./routes/alertRoutes');
const predictRoutes  = require('./routes/predictRoutes');

const app = express();

// Middleware
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })
);

app.use(express.json());
app.use(morgan('dev'));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    status: 'ok',
    server: 'running',
    mongodb: isDbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/machines', machineRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/alerts',   alertRoutes);
app.use('/api/predict',  predictRoutes);

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'PlantPulse AI Backend API',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health:   'GET  /api/health',
      machines: 'GET  /api/machines',
      readings: 'POST /api/readings',
      alerts:   'GET  /api/alerts',
      predict:  'POST /api/predict/manual',
    },
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500,
    },
  });
});

module.exports = app;
