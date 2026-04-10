/**
 * routes/graph.js
 *
 * Express router that maps all /api/graph/* endpoints to controller functions.
 */

const express = require('express');
const router = express.Router();

const {
    getGraph,
    addNode,
    addEdge,
    blockEdge,
    findRoute,
    multiSourceRescue,
    seedData,
    clearGraph,
} = require('../controllers/graphController');

// ── Graph data ──────────────────────────────────────────────────────────────
router.get('/', getGraph);             // GET  /api/graph
router.post('/node', addNode);         // POST /api/graph/node
router.post('/edge', addEdge);         // POST /api/graph/edge
router.patch('/edge/block', blockEdge); // PATCH /api/graph/edge/block

// ── Algorithm routes ────────────────────────────────────────────────────────
router.post('/route', findRoute);           // POST /api/graph/route
router.post('/multisource', multiSourceRescue); // POST /api/graph/multisource

// ── Utility ─────────────────────────────────────────────────────────────────
router.post('/seed', seedData);        // POST /api/graph/seed
router.delete('/clear', clearGraph);   // DELETE /api/graph/clear

module.exports = router;
