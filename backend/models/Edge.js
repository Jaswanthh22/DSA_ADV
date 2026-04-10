/**
 * models/Edge.js - Mongoose schema for a road (edge) between two locations.
 * Supports weighted distances and a blocked flag for disaster scenarios.
 */

const mongoose = require('mongoose');

const EdgeSchema = new mongoose.Schema({
    // Source node ID
    from: {
        type: String,
        required: true,
    },

    // Destination node ID
    to: {
        type: String,
        required: true,
    },

    // Edge weight: represents travel time (minutes) or distance (km)
    // Used by Dijkstra for shortest path calculation
    weight: {
        type: Number,
        required: true,
        min: 1,
    },

    // Blocked roads are skipped by both Dijkstra and BFS algorithms.
    // Toggle this to simulate real-time disaster conditions.
    blocked: {
        type: Boolean,
        default: false,
    },
});

// Compound index to prevent duplicate edges
EdgeSchema.index({ from: 1, to: 1 }, { unique: true });

module.exports = mongoose.model('Edge', EdgeSchema);
