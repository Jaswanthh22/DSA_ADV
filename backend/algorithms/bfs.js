/**
 * algorithms/bfs.js
 *
 * Breadth-First Search (BFS) for unweighted shortest path.
 *
 * Useful when all roads are considered equal (no distance weights)
 * or for quick connectivity checks.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 *
 * Like Dijkstra, this also skips blocked edges.
 */

/**
 * Finds the shortest unweighted path between source and target using BFS.
 *
 * @param {Map<string, Array<{neighbor: string, weight: number}>>} adjacencyList
 * @param {string} source  - Starting node ID
 * @param {string} target  - Destination node ID
 * @returns {{ path: string[], hops: number } | null}
 */
function bfs(adjacencyList, source, target) {
    // Handle edge case: source equals target
    if (source === target) {
        return { path: [source], hops: 0 };
    }

    // visited set prevents revisiting nodes (avoids infinite loops in cyclic graphs)
    const visited = new Set();

    // Queue holds [currentNode, pathSoFar] pairs
    // Using an array-based queue (shift is O(n) but fine for typical city graphs)
    const queue = [[source, [source]]];
    visited.add(source);

    while (queue.length > 0) {
        const [current, path] = queue.shift();

        // Explore all unblocked neighbors of the current node
        const neighbors = adjacencyList.get(current) || [];
        for (const { neighbor } of neighbors) {
            if (visited.has(neighbor)) continue;

            const newPath = [...path, neighbor];

            // Found the target — return immediately (BFS guarantees fewest hops)
            if (neighbor === target) {
                return { path: newPath, hops: newPath.length - 1 };
            }

            visited.add(neighbor);
            queue.push([neighbor, newPath]);
        }
    }

    // Target is unreachable
    return null;
}

module.exports = { bfs };
