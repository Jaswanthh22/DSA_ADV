/**
 * algorithms/graphUtils.js
 *
 * Utility functions for building the adjacency list representation
 * of the city graph from raw MongoDB documents.
 *
 * We use a Map<nodeId, [{neighbor, weight}]> structure.
 * Blocked edges are filtered out here so algorithms receive
 * a clean, traversable graph.
 */

/**
 * Builds an adjacency list from arrays of node and edge documents.
 *
 * The graph is treated as UNDIRECTED — each edge (A→B) also creates
 * an implicit reverse entry (B→A) to allow two-way road travel.
 *
 * Blocked edges are completely excluded from the list.
 *
 * @param {Array<{id: string}>} nodes - Array of node documents
 * @param {Array<{from: string, to: string, weight: number, blocked: boolean}>} edges
 * @returns {Map<string, Array<{neighbor: string, weight: number}>>}
 */
function buildAdjacencyList(nodes, edges) {
    // Initialize every node with an empty neighbor list
    const adjacencyList = new Map();
    for (const node of nodes) {
        adjacencyList.set(node.id, []);
    }

    // Add each non-blocked edge in both directions (undirected graph)
    for (const edge of edges) {
        if (edge.blocked) continue; // Skip disaster-blocked roads

        // Ensure both endpoint nodes exist in the list
        if (!adjacencyList.has(edge.from)) adjacencyList.set(edge.from, []);
        if (!adjacencyList.has(edge.to)) adjacencyList.set(edge.to, []);

        // A → B
        adjacencyList.get(edge.from).push({
            neighbor: edge.to,
            weight: edge.weight,
        });

        // B → A (undirected)
        adjacencyList.get(edge.to).push({
            neighbor: edge.from,
            weight: edge.weight,
        });
    }

    return adjacencyList;
}

/**
 * Builds an adjacency list that INCLUDES blocked edges.
 * Used for visualization — the frontend needs to know all edges
 * (blocked ones are drawn in red).
 *
 * @param {Array} nodes
 * @param {Array} edges
 * @returns {Map}
 */
function buildFullAdjacencyList(nodes, edges) {
    const adjacencyList = new Map();
    for (const node of nodes) {
        adjacencyList.set(node.id, []);
    }

    for (const edge of edges) {
        if (!adjacencyList.has(edge.from)) adjacencyList.set(edge.from, []);
        if (!adjacencyList.has(edge.to)) adjacencyList.set(edge.to, []);

        adjacencyList.get(edge.from).push({
            neighbor: edge.to,
            weight: edge.weight,
            blocked: edge.blocked,
        });
        adjacencyList.get(edge.to).push({
            neighbor: edge.from,
            weight: edge.weight,
            blocked: edge.blocked,
        });
    }

    return adjacencyList;
}

module.exports = { buildAdjacencyList, buildFullAdjacencyList };
