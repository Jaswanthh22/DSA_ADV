/**
 * js/app.js
 *
 * Main UI controller for Disaster Rescue Route Planner.
 *
 * Wires together:
 *  - HTML form events → API calls (api.js)
 *  - API responses → Canvas updates (map.js)
 *  - Path results → Result panel rendering
 *  - Toast notification system
 */

/* ═════════════════════════════════════════════════════════
   STATE
   ═════════════════════════════════════════════════════════ */
const AppState = {
    pendingNodePos: null,  // {x, y} from canvas click for next node add
    selectedEdge: null,  // {from, to} from canvas edge click
    lastClickedNodeId: null, // track sequential node selection for route fill
};

/* ═════════════════════════════════════════════════════════
   INIT
   ═════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the canvas renderer with interaction callbacks
    MapRenderer.init(
        onNodeClicked,   // Called when user clicks a node on canvas
        onEdgeClicked,   // Called when user clicks an edge on canvas
        onCanvasClicked  // Called when user clicks empty canvas space
    );

    bindButtons();
    checkServerStatus();

    // Auto-load graph if data already exists
    loadGraph();
});

/* ═════════════════════════════════════════════════════════
   SERVER STATUS CHECK
   ═════════════════════════════════════════════════════════ */
async function checkServerStatus() {
    const dot = document.getElementById('db-status-dot');
    const label = document.getElementById('db-status-label');
    try {
        await API.fetchGraph();
        dot.classList.remove('offline');
        dot.classList.add('online');
        label.textContent = 'Server Online';
    } catch (e) {
        dot.classList.add('offline');
        label.textContent = 'Server Offline';
    }
}

/* ═════════════════════════════════════════════════════════
   GRAPH LOADING
   ═════════════════════════════════════════════════════════ */
async function loadGraph() {
    try {
        const data = await API.fetchGraph();
        MapRenderer.setGraph(data.nodes, data.edges);
        updateHint(
            data.nodes.length > 0
                ? `Graph loaded: ${data.nodes.length} locations, ${data.edges.length} roads`
                : 'Graph is empty — click "Load Sample City" to begin'
        );
    } catch (err) {
        updateHint('Could not load graph. Is the server running?');
    }
}

/* ═════════════════════════════════════════════════════════
   BUTTON BINDINGS
   ═════════════════════════════════════════════════════════ */
function bindButtons() {
    // ── Quick Actions ──
    document.getElementById('btn-seed').addEventListener('click', handleSeed);
    document.getElementById('btn-clear').addEventListener('click', handleClear);

    // ── Add Node Form ──
    document.getElementById('form-add-node').addEventListener('submit', handleAddNode);

    // ── Add Edge Form ──
    document.getElementById('form-add-edge').addEventListener('submit', handleAddEdge);

    // ── Block / Unblock ──
    document.getElementById('btn-block').addEventListener('click', () => handleBlockToggle(true));
    document.getElementById('btn-unblock').addEventListener('click', () => handleBlockToggle(false));

    // ── Route Finding ──
    document.getElementById('btn-find-route').addEventListener('click', handleFindRoute);
    document.getElementById('btn-multisource').addEventListener('click', handleMultiSource);
    document.getElementById('btn-clear-path').addEventListener('click', handleClearPath);

    // ── Result Panel Close ──
    document.getElementById('result-close').addEventListener('click', handleClearPath);
}

/* ═════════════════════════════════════════════════════════
   CANVAS INTERACTION CALLBACKS
   ═════════════════════════════════════════════════════════ */
function onNodeClicked(nodeId, nodeObj) {
    // Auto-fill route source → target sequentially
    const sourceInput = document.getElementById('route-source');
    const targetInput = document.getElementById('route-target');

    if (!sourceInput.value || (sourceInput.value && targetInput.value)) {
        // Start a new pair: fill source
        sourceInput.value = nodeId;
        targetInput.value = '';
    } else {
        // Source already filled: fill target
        targetInput.value = nodeId;
    }

    // Also fill block fields for convenience
    const blockFrom = document.getElementById('block-from');
    const blockTo = document.getElementById('block-to');
    if (!blockFrom.value) {
        blockFrom.value = nodeId;
    } else if (!blockTo.value) {
        blockTo.value = nodeId;
    }

    updateHint(`Node selected: [${nodeId}] ${nodeObj.name}`);
}

function onEdgeClicked(edge) {
    // Pre-fill block fields with selected edge
    document.getElementById('block-from').value = edge.from;
    document.getElementById('block-to').value = edge.to;
    updateHint(`Edge selected: [${edge.from}] ↔ [${edge.to}]`);
    AppState.selectedEdge = edge;
}

function onCanvasClicked(pos) {
    // Store click position for next node add
    AppState.pendingNodePos = pos;
    updateHint(`Canvas clicked at (${pos.x}, ${pos.y}) — fill details and click "Add Location"`);
}

/* ═════════════════════════════════════════════════════════
   HANDLERS
   ═════════════════════════════════════════════════════════ */

/** Seed sample city data */
async function handleSeed() {
    try {
        showToast('Loading sample city…', 'info');
        const result = await API.seedGraph();
        await loadGraph();
        showToast(`✅ ${result.message} (${result.nodes} nodes, ${result.edges} edges)`, 'success');
    } catch (err) {
        showToast(`❌ Seed failed: ${err.message}`, 'error');
    }
}

/** Clear all graph data */
async function handleClear() {
    if (!confirm('Clear all graph data? This cannot be undone.')) return;
    try {
        await API.clearGraph();
        MapRenderer.setGraph([], []);
        hideResultPanel();
        updateHint('Graph cleared');
        showToast('Graph cleared', 'info');
    } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
    }
}

/** Add a new node (location) */
async function handleAddNode(e) {
    e.preventDefault();
    const id = document.getElementById('node-id').value.trim();
    const name = document.getElementById('node-name').value.trim();
    const type = document.getElementById('node-type').value;

    // Use pending canvas click position or default to center
    const pos = AppState.pendingNodePos || {
        x: Math.floor(Math.random() * 600 + 100),
        y: Math.floor(Math.random() * 400 + 80),
    };

    try {
        await API.addNode(id, name, pos.x, pos.y, type);
        MapRenderer.clearPendingPos();
        AppState.pendingNodePos = null;
        e.target.reset();
        await loadGraph();
        showToast(`✅ Added location: ${name}`, 'success');
    } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
    }
}

/** Add a new edge (road) */
async function handleAddEdge(e) {
    e.preventDefault();
    const from = document.getElementById('edge-from').value.trim();
    const to = document.getElementById('edge-to').value.trim();
    const weight = document.getElementById('edge-weight').value;

    if (!from || !to || !weight) {
        showToast('All fields required', 'error');
        return;
    }

    try {
        await API.addEdge(from, to, weight);
        e.target.reset();
        await loadGraph();
        showToast(`✅ Road added: [${from}] ↔ [${to}] (weight: ${weight})`, 'success');
    } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
    }
}

/** Block or unblock a road */
async function handleBlockToggle(block) {
    const from = document.getElementById('block-from').value.trim();
    const to = document.getElementById('block-to').value.trim();

    if (!from || !to) {
        showToast('Enter From and To node IDs (or click an edge on the map)', 'error');
        return;
    }

    try {
        await API.blockEdge(from, to, block);
        await loadGraph();
        MapRenderer.clearPath();
        hideResultPanel();
        showToast(
            block ? `🚧 Road [${from}]↔[${to}] BLOCKED` : `✅ Road [${from}]↔[${to}] UNBLOCKED`,
            block ? 'error' : 'success'
        );
    } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
    }
}

/** Find a route between two nodes */
async function handleFindRoute() {
    const source = document.getElementById('route-source').value.trim();
    const target = document.getElementById('route-target').value.trim();
    const algorithm = document.getElementById('route-algorithm').value;

    if (!source || !target) {
        showToast('Enter source and target node IDs (or click nodes on the map)', 'error');
        return;
    }

    try {
        showToast('Computing route…', 'info');
        const result = await API.findRoute(source, target, algorithm);

        if (!result.found) {
            showToast(`⚠️ ${result.message}`, 'error');
            MapRenderer.clearPath();
            return;
        }

        // Extract path arrays of IDs for the canvas renderer
        const primaryIds = result.primary.path.map((p) => p.id);
        const altIds = result.alternative ? result.alternative.path.map((p) => p.id) : null;

        MapRenderer.setPath(primaryIds, altIds);
        showResultPanel(result);
        updateHint(`Route found using ${algorithm.toUpperCase()} — ${primaryIds.length - 1} hops`);
        showToast('✅ Route found!', 'success');
    } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
    }
}

/** Find nearest rescue center / hospital to the target */
async function handleMultiSource() {
    const target = document.getElementById('route-target').value.trim();
    const algorithm = document.getElementById('route-algorithm').value;

    if (!target) {
        showToast('Enter a target node ID first', 'error');
        return;
    }

    try {
        showToast('Finding nearest rescue source…', 'info');
        const result = await API.findNearestRescue(target, algorithm);

        if (!result.found) {
            showToast(`⚠️ ${result.message}`, 'error');
            return;
        }

        const pathIds = result.path.map((p) => p.id);
        MapRenderer.setPath(pathIds, null);
        showMultiSourcePanel(result);
        showToast(`🏥 Nearest: ${result.nearestSource.name}`, 'success');
    } catch (err) {
        showToast(`❌ ${err.message}`, 'error');
    }
}

/** Clear current active path */
function handleClearPath() {
    MapRenderer.clearPath();
    hideResultPanel();
    updateHint('Path cleared');
}

/* ═════════════════════════════════════════════════════════
   RESULT PANEL
   ═════════════════════════════════════════════════════════ */
function showResultPanel(result) {
    const panel = document.getElementById('result-panel');
    panel.style.display = 'block';

    document.getElementById('result-title').textContent = 'Route Found';

    // Primary path
    const primaryNames = result.primary.path.map((p) => p.name).join(' → ');
    document.getElementById('primary-path-text').textContent = primaryNames;
    const meta = result.primary.distance != null
        ? `Distance: ${result.primary.distance} units`
        : `Hops: ${result.primary.hops}`;
    document.getElementById('primary-meta').textContent = meta;

    // Alternative path
    const altBlock = document.getElementById('alt-result');
    if (result.alternative) {
        altBlock.style.display = 'block';
        const altNames = result.alternative.path.map((p) => p.name).join(' → ');
        document.getElementById('alt-path-text').textContent = altNames;
        const altMeta = result.alternative.distance != null
            ? `Distance: ${result.alternative.distance} units`
            : `Hops: ${result.alternative.hops}`;
        document.getElementById('alt-meta').textContent = altMeta;
    } else {
        altBlock.style.display = 'none';
    }
}

function showMultiSourcePanel(result) {
    const panel = document.getElementById('result-panel');
    panel.style.display = 'block';

    document.getElementById('result-title').textContent = '🏥 Nearest Rescue';

    const pathNames = result.path.map((p) => p.name).join(' → ');
    document.getElementById('primary-path-text').textContent = pathNames;
    const metaStr = result.distance != null
        ? `From: ${result.nearestSource.name} | Distance: ${result.distance}`
        : `From: ${result.nearestSource.name} | Hops: ${result.hops}`;
    document.getElementById('primary-meta').textContent = metaStr;
    document.getElementById('alt-result').style.display = 'none';
}

function hideResultPanel() {
    document.getElementById('result-panel').style.display = 'none';
}

/* ═════════════════════════════════════════════════════════
   TOAST NOTIFICATIONS
   ═════════════════════════════════════════════════════════ */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Icon
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);

    // Auto-dismiss after 3.5 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/* ═════════════════════════════════════════════════════════
   TOOLBAR HINT
   ═════════════════════════════════════════════════════════ */
function updateHint(text) {
    document.getElementById('toolbar-hint').textContent = text;
}
