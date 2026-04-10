/**
 * algorithms/dijkstra.js
 *
 * Dijkstra's Algorithm using a Min-Heap Priority Queue.
 *
 * Time Complexity: O((V + E) log V)
 * Space Complexity: O(V + E)
 *
 * Only traverses non-blocked edges, so it automatically
 * avoids roads closed due to disaster.
 */

// ─── Min-Heap Priority Queue ───────────────────────────────────────────────────
// Each element is { node, priority } where priority = cumulative distance.
// We use a binary min-heap so extraction of the minimum is O(log n).
class MinHeap {
    constructor() {
        this.heap = [];
    }

    // Insert a new element and bubble up to maintain heap property
    insert(node, priority) {
        this.heap.push({ node, priority });
        this._bubbleUp(this.heap.length - 1);
    }

    // Remove and return the element with the smallest priority
    extractMin() {
        if (this.isEmpty()) return null;
        const min = this.heap[0];
        const last = this.heap.pop();
        if (!this.isEmpty()) {
            this.heap[0] = last;
            this._sinkDown(0);
        }
        return min;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    // Move element at index i up while it is smaller than its parent
    _bubbleUp(i) {
        while (i > 0) {
            const parent = Math.floor((i - 1) / 2);
            if (this.heap[parent].priority <= this.heap[i].priority) break;
            [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
            i = parent;
        }
    }

    // Move element at index i down while it is larger than its smallest child
    _sinkDown(i) {
        const n = this.heap.length;
        while (true) {
            let smallest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;

            if (left < n && this.heap[left].priority < this.heap[smallest].priority)
                smallest = left;
            if (right < n && this.heap[right].priority < this.heap[smallest].priority)
                smallest = right;

            if (smallest === i) break;
            [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
            i = smallest;
        }
    }
}

// ─── Dijkstra Algorithm ────────────────────────────────────────────────────────
/**
 * Finds the shortest weighted path between source and target.
 *
 * @param {Map<string, Array<{neighbor: string, weight: number}>>} adjacencyList
 *   - Adjacency list of the graph (only non-blocked edges included)
 * @param {string} source  - Starting node ID
 * @param {string} target  - Destination node ID
 * @returns {{ path: string[], distance: number } | null}
 *   - Returns the path array and total distance, or null if unreachable
 */
function dijkstra(adjacencyList, source, target) {
    // dist[node] = shortest known distance from source to node
    const dist = new Map();
    // prev[node] = the node we came from on the shortest path
    const prev = new Map();

    // Initialize all distances to Infinity
    for (const node of adjacencyList.keys()) {
        dist.set(node, Infinity);
        prev.set(node, null);
    }
    dist.set(source, 0);

    // Priority queue starts with source at distance 0
    const pq = new MinHeap();
    pq.insert(source, 0);

    while (!pq.isEmpty()) {
        const { node: current, priority: currentDist } = pq.extractMin();

        // We reached the target — reconstruct and return the path
        if (current === target) {
            return reconstructPath(prev, source, target, dist.get(target));
        }

        // Skip if we already found a better path to this node
        if (currentDist > dist.get(current)) continue;

        // Relax each neighbor's distance
        const neighbors = adjacencyList.get(current) || [];
        for (const { neighbor, weight } of neighbors) {
            const newDist = currentDist + weight;
            if (newDist < dist.get(neighbor)) {
                dist.set(neighbor, newDist);
                prev.set(neighbor, current);
                pq.insert(neighbor, newDist);
            }
        }
    }

    // Target is unreachable from source
    return null;
}

// ─── Path Reconstruction Helper ────────────────────────────────────────────────
/**
 * Traces back through the `prev` map to build the path array.
 */
function reconstructPath(prev, source, target, totalDistance) {
    const path = [];
    let current = target;

    while (current !== null) {
        path.unshift(current);
        current = prev.get(current);
    }

    // Sanity check: path must start at source
    if (path[0] !== source) return null;

    return { path, distance: totalDistance };
}

module.exports = { dijkstra };
