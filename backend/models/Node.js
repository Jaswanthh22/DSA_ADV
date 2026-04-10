/**
 * models/Node.js - Mongoose schema for a location node in the city graph.
 * Represents hospitals, rescue centers, or affected areas on the map.
 */

const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema({
    // Unique identifier (string, e.g. "0", "1", ...) for algorithm lookups
    id: {
        type: String,
        required: true,
        unique: true,
    },

    // Human-readable name shown on the map
    name: {
        type: String,
        required: true,
    },

    // Canvas pixel coordinates for visualization
    x: { type: Number, required: true },
    y: { type: Number, required: true },

    // Node type affects visual styling:
    // 'hospital'  → blue   (main rescue resource)
    // 'rescue'    → orange (rescue center / fire station)
    // 'area'      → gray   (affected civilian area)
    type: {
        type: String,
        enum: ['hospital', 'rescue', 'area'],
        default: 'area',
    },
});

module.exports = mongoose.model('Node', NodeSchema);
