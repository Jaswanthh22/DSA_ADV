/**
 * controllers/graphController.js
 *
 * Business logic for all graph-related API endpoints.
 * Handles DB queries, adjacency list construction, and algorithm dispatch.
 */

const NodeModel = require('../models/Node');
const EdgeModel = require('../models/Edge');
const { buildAdjacencyList } = require('../algorithms/graphUtils');
const { dijkstra } = require('../algorithms/dijkstra');
const { bfs } = require('../algorithms/bfs');

// Sample data for seeding
const sampleData = require('../data/sampleData.json');

// ─── In-memory fallback store (used when MongoDB is unavailable) ──────────────
let memNodes = [];
let memEdges = [];
let useMemory = false; // set to true if MongoDB is down

// Helper: detect if we are in memory mode
function isMemMode() {
    const mongoose = require('mongoose');
    return mongoose.connection.readyState !== 1;
}

// ─── GET /api/graph ────────────────────────────────────────────────────────────
// Returns all nodes and edges for the frontend to render.
async function getGraph(req, res) {
    try {
        if (isMemMode()) {
            return res.json({ nodes: memNodes, edges: memEdges });
        }
        const nodes = await NodeModel.find({});
        const edges = await EdgeModel.find({});
        res.json({ nodes, edges });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch graph', detail: err.message });
    }
}

// ─── POST /api/graph/node ──────────────────────────────────────────────────────
// Adds a new location node.
async function addNode(req, res) {
    try {
        const { id, name, x, y, type } = req.body;
        if (!id || !name || x === undefined || y === undefined) {
            return res.status(400).json({ error: 'id, name, x, y are required' });
        }

        if (isMemMode()) {
            if (memNodes.find((n) => n.id === id)) {
                return res.status(409).json({ error: 'Node ID already exists' });
            }
            const newNode = { id, name, x, y, type: type || 'area' };
            memNodes.push(newNode);
            return res.status(201).json(newNode);
        }

        const node = new NodeModel({ id, name, x, y, type: type || 'area' });
        await node.save();
        res.status(201).json(node);
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'Node ID already exists' });
        res.status(500).json({ error: 'Failed to add node', detail: err.message });
    }
}

// ─── POST /api/graph/edge ──────────────────────────────────────────────────────
// Adds a new road (edge) between two nodes.
async function addEdge(req, res) {
    try {
        const { from, to, weight } = req.body;
        if (!from || !to || weight === undefined) {
            return res.status(400).json({ error: 'from, to, weight are required' });
        }

        if (isMemMode()) {
            const exists = memEdges.find((e) => e.from === from && e.to === to);
            if (exists) return res.status(409).json({ error: 'Edge already exists' });
            const newEdge = { from, to, weight: Number(weight), blocked: false };
            memEdges.push(newEdge);
            return res.status(201).json(newEdge);
        }

        const edge = new EdgeModel({ from, to, weight: Number(weight), blocked: false });
        await edge.save();
        res.status(201).json(edge);
    } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'Edge already exists' });
        res.status(500).json({ error: 'Failed to add edge', detail: err.message });
    }
}

// ─── PATCH /api/graph/edge/block ──────────────────────────────────────────────
// Toggles the blocked status of a road.
async function blockEdge(req, res) {
    try {
        const { from, to, blocked } = req.body;
        if (!from || !to || blocked === undefined) {
            return res.status(400).json({ error: 'from, to, blocked are required' });
        }

        if (isMemMode()) {
            // Update in both directions (undirected graph)
            let updated = false;
            for (const e of memEdges) {
                if ((e.from === from && e.to === to) || (e.from === to && e.to === from)) {
                    e.blocked = blocked;
                    updated = true;
                }
            }
            if (!updated) return res.status(404).json({ error: 'Edge not found' });
            return res.json({ message: `Road ${blocked ? 'blocked' : 'unblocked'} successfully` });
        }

        // Update both directions (graph stored as directed pairs, treated as undirected)
        const result = await EdgeModel.updateMany(
            { $or: [{ from, to }, { from: to, to: from }] },
            { $set: { blocked } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Edge not found' });
        }

        res.json({ message: `Road ${blocked ? 'blocked' : 'unblocked'} successfully`, updated: result.modifiedCount });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update edge', detail: err.message });
    }
}

// ─── POST /api/graph/route ────────────────────────────────────────────────────
// Finds the shortest path from source to target.
// Uses Dijkstra by default; BFS if algorithm='bfs'.
// Also computes an alternative path if the main path passes through a bottleneck.
async function findRoute(req, res) {
    try {
        const { source, target, algorithm = 'dijkstra' } = req.body;
        if (!source || !target) {
            return res.status(400).json({ error: 'source and target are required' });
        }

        // Fetch graph data
        let nodes, edges;
        if (isMemMode()) {
            nodes = memNodes;
            edges = memEdges;
        } else {
            nodes = await NodeModel.find({});
            edges = await EdgeModel.find({});
        }

        if (nodes.length === 0) {
            return res.status(404).json({ error: 'Graph is empty. Please seed sample data first.' });
        }

        // Build adjacency list (blocked edges excluded)
        const adjacencyList = buildAdjacencyList(nodes, edges);

        // Validate that source and target exist
        if (!adjacencyList.has(source)) {
            return res.status(404).json({ error: `Source node '${source}' not found` });
        }
        if (!adjacencyList.has(target)) {
            return res.status(404).json({ error: `Target node '${target}' not found` });
        }

        // Run the chosen algorithm
        let result;
        if (algorithm === 'bfs') {
            result = bfs(adjacencyList, source, target);
        } else {
            result = dijkstra(adjacencyList, source, target);
        }

        if (!result) {
            return res.json({
                found: false,
                message: 'No path found — all routes are blocked or disconnected.',
            });
        }

        // Try to find an alternative path by temporarily blocking each edge on the main path
        let altResult = null;
        if (result.path.length > 2) {
            for (let i = 0; i < result.path.length - 1; i++) {
                const from = result.path[i];
                const to = result.path[i + 1];

                // Build adjacency list with this segment blocked
                const altEdges = edges.map((e) => {
                    const sameEdge =
                        (e.from === from && e.to === to) || (e.from === to && e.to === from);
                    return sameEdge ? { ...e, blocked: true } : e;
                });

                const altList = buildAdjacencyList(nodes, altEdges);
                const alt =
                    algorithm === 'bfs'
                        ? bfs(altList, source, target)
                        : dijkstra(altList, source, target);

                if (alt && JSON.stringify(alt.path) !== JSON.stringify(result.path)) {
                    altResult = alt;
                    break;
                }
            }
        }

        // Enrich with node names for display
        const nodeMap = {};
        nodes.forEach((n) => (nodeMap[n.id] = n.name));

        const enrichPath = (path) =>
            path.map((id) => ({ id, name: nodeMap[id] || id }));

        res.json({
            found: true,
            algorithm,
            primary: {
                path: enrichPath(result.path),
                distance: result.distance,
                hops: result.hops,
            },
            alternative: altResult
                ? {
                    path: enrichPath(altResult.path),
                    distance: altResult.distance,
                    hops: altResult.hops,
                }
                : null,
        });
    } catch (err) {
        res.status(500).json({ error: 'Route finding failed', detail: err.message });
    }
}

// ─── POST /api/graph/multisource ──────────────────────────────────────────────
// Finds the NEAREST hospital or rescue center to a given target zone.
// Runs Dijkstra from every hospital/rescue node and picks the shortest result.
async function multiSourceRescue(req, res) {
    try {
        const { target, algorithm = 'dijkstra' } = req.body;
        if (!target) {
            return res.status(400).json({ error: 'target is required' });
        }

        let nodes, edges;
        if (isMemMode()) {
            nodes = memNodes;
            edges = memEdges;
        } else {
            nodes = await NodeModel.find({});
            edges = await EdgeModel.find({});
        }

        const adjacencyList = buildAdjacencyList(nodes, edges);

        // Identify all hospitals and rescue centers as potential sources
        const sources = nodes.filter((n) => n.type === 'hospital' || n.type === 'rescue');

        if (sources.length === 0) {
            return res.status(404).json({ error: 'No hospitals or rescue centers found in graph' });
        }

        let bestResult = null;
        let bestSource = null;

        // Run algorithm from each source, keep the shortest overall
        for (const src of sources) {
            const result =
                algorithm === 'bfs'
                    ? bfs(adjacencyList, src.id, target)
                    : dijkstra(adjacencyList, src.id, target);

            if (!result) continue;

            const metric = result.distance ?? result.hops; // distance for Dijkstra, hops for BFS
            const bestMetric = bestResult ? (bestResult.distance ?? bestResult.hops) : Infinity;

            if (metric < bestMetric) {
                bestResult = result;
                bestSource = src;
            }
        }

        if (!bestResult) {
            return res.json({ found: false, message: 'No rescue source can reach the target.' });
        }

        const nodeMap = {};
        nodes.forEach((n) => (nodeMap[n.id] = n.name));
        const enrichPath = (path) => path.map((id) => ({ id, name: nodeMap[id] || id }));

        res.json({
            found: true,
            nearestSource: { id: bestSource.id, name: bestSource.name, type: bestSource.type },
            path: enrichPath(bestResult.path),
            distance: bestResult.distance,
            hops: bestResult.hops,
        });
    } catch (err) {
        res.status(500).json({ error: 'Multi-source rescue failed', detail: err.message });
    }
}

// ─── POST /api/graph/seed ─────────────────────────────────────────────────────
// Clears the DB and loads the sample city dataset.
async function seedData(req, res) {
    try {
        if (isMemMode()) {
            memNodes = sampleData.nodes.map((n) => ({ ...n }));
            memEdges = sampleData.edges.map((e) => ({ ...e }));
            return res.json({ message: 'Sample data loaded into memory', nodes: memNodes.length, edges: memEdges.length });
        }

        await NodeModel.deleteMany({});
        await EdgeModel.deleteMany({});

        await NodeModel.insertMany(sampleData.nodes);
        await EdgeModel.insertMany(sampleData.edges);

        res.json({
            message: 'Sample data seeded successfully',
            nodes: sampleData.nodes.length,
            edges: sampleData.edges.length,
        });
    } catch (err) {
        res.status(500).json({ error: 'Seeding failed', detail: err.message });
    }
}

// ─── DELETE /api/graph/clear ──────────────────────────────────────────────────
// Clears all graph data from the database.
async function clearGraph(req, res) {
    try {
        if (isMemMode()) {
            memNodes = [];
            memEdges = [];
            return res.json({ message: 'In-memory graph cleared' });
        }
        await NodeModel.deleteMany({});
        await EdgeModel.deleteMany({});
        res.json({ message: 'Graph cleared successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear graph', detail: err.message });
    }
}

module.exports = {
    getGraph,
    addNode,
    addEdge,
    blockEdge,
    findRoute,
    multiSourceRescue,
    seedData,
    clearGraph,
};
