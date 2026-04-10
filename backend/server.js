/**
 * server.js - Express entry point for Disaster Rescue Route Planner
 * Connects to MongoDB, mounts API routes, and serves the frontend.
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const graphRoutes = require('./routes/graph');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve static frontend files from /frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/graph', graphRoutes);

// ─── Catch-all: serve index.html for any non-API route ────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ─── MongoDB Connection ────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/rescue_db';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected to rescue_db');
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.log('⚠️  Starting server without MongoDB (in-memory mode)...');
    // Start anyway so frontend is still served
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT} (no DB)`);
    });
  });

module.exports = app;
