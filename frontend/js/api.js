/**
 * js/api.js
 *
 * HTTP client wrapper around the backend REST API.
 * All fetch calls go through this module — keeps app.js clean.
 */

const API_BASE = '/api/graph';

/**
 * Generic fetch helper. Returns parsed JSON or throws a descriptive error.
 */
async function apiFetch(path, options = {}) {
    const url = API_BASE + path;
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

// ── Graph CRUD ──────────────────────────────────────────────────────────────

/** Fetch all nodes and edges from the server */
async function fetchGraph() {
    return apiFetch('/', { method: 'GET' });
}

/** Add a new location node */
async function addNode(id, name, x, y, type) {
    return apiFetch('/node', {
        method: 'POST',
        body: JSON.stringify({ id, name, x, y, type }),
    });
}

/** Add a new road (edge) between two nodes */
async function addEdge(from, to, weight) {
    return apiFetch('/edge', {
        method: 'POST',
        body: JSON.stringify({ from, to, weight: Number(weight) }),
    });
}

/** Toggle the blocked status of a road */
async function blockEdge(from, to, blocked) {
    return apiFetch('/edge/block', {
        method: 'PATCH',
        body: JSON.stringify({ from, to, blocked }),
    });
}

// ── Algorithm Routes ────────────────────────────────────────────────────────

/** Find shortest path using Dijkstra or BFS */
async function findRoute(source, target, algorithm = 'dijkstra') {
    return apiFetch('/route', {
        method: 'POST',
        body: JSON.stringify({ source, target, algorithm }),
    });
}

/** Find the nearest hospital / rescue center to a given target */
async function findNearestRescue(target, algorithm = 'dijkstra') {
    return apiFetch('/multisource', {
        method: 'POST',
        body: JSON.stringify({ target, algorithm }),
    });
}

// ── Utilities ───────────────────────────────────────────────────────────────

/** Seed the database with the built-in sample city */
async function seedGraph() {
    return apiFetch('/seed', { method: 'POST' });
}

/** Clear all graph data from the database */
async function clearGraph() {
    return apiFetch('/clear', { method: 'DELETE' });
}

// Export for use in other modules (no bundler — attach to window)
window.API = { fetchGraph, addNode, addEdge, blockEdge, findRoute, findNearestRescue, seedGraph, clearGraph };
