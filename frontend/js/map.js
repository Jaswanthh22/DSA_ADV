/**
 * js/map.js
 *
 * Canvas-based graph visualization engine.
 *
 * Responsibilities:
 *  - Draw nodes (circles) with type-based colors
 *  - Draw edges (lines) with weight labels
 *  - Highlight blocked roads (red), active path (green glow), alt path (yellow)
 *  - Handle mouse events for node/edge selection and new node placement
 *  - Animate path drawing with a marching-dot effect
 */

const MapRenderer = (() => {
    const CANVAS_ID = 'graph-canvas';

    /* ── Colors ─────────────────────────────────────────────────────────── */
    const COLOR = {
        node: {
            hospital: '#29b6f6', // blue
            rescue: '#ff6b35', // orange
            area: '#90a4ae', // gray
        },
        nodeStroke: {
            hospital: '#4fc3f7',
            rescue: '#ff8f65',
            area: '#b0bec5',
        },
        nodeSelected: '#ffd740',
        nodePath: '#00e676',

        edge: 'rgba(255,255,255,0.15)',
        edgeBlocked: '#ff1744',
        edgePath: '#00e676',
        edgeAlt: '#ffd740',

        label: '#e8f0fe',
        weight: 'rgba(255,255,255,0.5)',
        bg: '#070d1a',
    };

    const NODE_RADIUS = 20;
    const FONT_LABEL = '11px Inter, sans-serif';
    const FONT_WEIGHT = '10px JetBrains Mono, monospace';

    /* ── State ───────────────────────────────────────────────────────────── */
    let canvas, ctx;
    let nodes = [];     // Array of node objects from the backend
    let edges = [];     // Array of edge objects from the backend
    let activePath = null;       // Array of node IDs for primary path
    let altPath = null;       // Array of node IDs for alternative path
    let selectedNodeId = null;   // Node clicked by user
    let selectedEdge = null;   // Edge {from, to} clicked by user
    let pendingNodePos = null;   // {x, y} where user last clicked for new node
    let onNodeClick = null;      // External callback: (nodeId) => void
    let onEdgeClick = null;      // External callback: ({from, to}) => void
    let onCanvasClick = null;    // External callback: ({x, y}) => void
    let animFrame = null;      // requestAnimationFrame handle
    let pathProgress = 0;        // Animation progress [0,1]
    let animating = false;

    /* ── Initialization ──────────────────────────────────────────────────── */
    function init(onNodeCb, onEdgeCb, onCanvasCb) {
        canvas = document.getElementById(CANVAS_ID);
        ctx = canvas.getContext('2d');
        onNodeClick = onNodeCb;
        onEdgeClick = onEdgeCb;
        onCanvasClick = onCanvasCb;

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('mousemove', handleMouseMove);
        render();
    }

    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        render();
    }

    /* ── Data Update ─────────────────────────────────────────────────────── */
    function setGraph(newNodes, newEdges) {
        nodes = newNodes || [];
        edges = newEdges || [];
        activePath = null;
        altPath = null;
        render();
    }

    function setPath(primary, alternate) {
        activePath = primary || null;
        altPath = alternate || null;
        pathProgress = 0;
        if (primary) {
            animating = true;
            animatePath();
        } else {
            render();
        }
    }

    function clearPath() {
        activePath = null;
        altPath = null;
        animating = false;
        selectedNodeId = null;
        selectedEdge = null;
        render();
    }

    /* ── Path Animation ──────────────────────────────────────────────────── */
    function animatePath() {
        if (!animating) return;
        pathProgress = Math.min(pathProgress + 0.04, 1);
        render();
        if (pathProgress < 1) {
            animFrame = requestAnimationFrame(animatePath);
        } else {
            animating = false;
        }
    }

    /* ── Main Render Function ────────────────────────────────────────────── */
    function render() {
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Build lookup sets for path membership
        const primarySet = buildEdgeSet(activePath);
        const altSet = buildEdgeSet(altPath);
        const pathNodeSet = new Set(activePath || []);
        const altNodeSet = new Set(altPath || []);

        // Draw edges first (below nodes)
        for (const edge of edges) {
            drawEdge(edge, primarySet, altSet);
        }

        // Draw active path edges with glow (on top of all edges)
        if (activePath && activePath.length > 1) {
            drawPathEdges(activePath, COLOR.edgePath, 4, pathProgress);
        }
        if (altPath && altPath.length > 1) {
            drawPathEdges(altPath, COLOR.edgeAlt, 3, 1);
        }

        // Draw nodes
        for (const node of nodes) {
            const onPrimary = pathNodeSet.has(node.id);
            const onAlt = altNodeSet.has(node.id);
            drawNode(node, onPrimary, onAlt);
        }

        // Draw pending position indicator
        if (pendingNodePos) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(pendingNodePos.x, pendingNodePos.y, 8, 0, Math.PI * 2);
            ctx.strokeStyle = COLOR.nodeSelected;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.restore();
        }
    }

    /* ── Draw Helpers ────────────────────────────────────────────────────── */

    /**
     * Draw a single node circle with label, selection ring, and glow effects.
     */
    function drawNode(node, onPrimary, onAlt) {
        const { x, y, id, name, type } = node;
        const isSelected = id === selectedNodeId;
        const color = COLOR.node[type] || COLOR.node.area;
        const strokeColor = COLOR.nodeStroke[type] || '#b0bec5';

        ctx.save();

        // Outer glow for path / selected nodes
        if (onPrimary || isSelected) {
            const glowColor = isSelected ? COLOR.nodeSelected : COLOR.nodePath;
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = 20;
        } else if (onAlt) {
            ctx.shadowColor = COLOR.edgeAlt;
            ctx.shadowBlur = 14;
        }

        // Selection ring
        if (isSelected) {
            ctx.beginPath();
            ctx.arc(x, y, NODE_RADIUS + 6, 0, Math.PI * 2);
            ctx.strokeStyle = COLOR.nodeSelected;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Node fill
        ctx.beginPath();
        ctx.arc(x, y, NODE_RADIUS, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, NODE_RADIUS);
        gradient.addColorStop(0, lightenColor(color, 40));
        gradient.addColorStop(1, color);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Node border
        ctx.strokeStyle = onPrimary ? COLOR.nodePath : strokeColor;
        ctx.lineWidth = onPrimary ? 2.5 : 1.5;
        ctx.stroke();

        ctx.shadowBlur = 0;

        // Node type icon
        drawNodeIcon(x, y, type);

        // Node label below
        ctx.font = FONT_LABEL;
        ctx.fillStyle = COLOR.label;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Small badge with node name
        const labelY = y + NODE_RADIUS + 5;
        const maxWidth = 90;
        const displayName = name.length > 14 ? name.slice(0, 12) + '…' : name;
        ctx.fillText(`[${id}] ${displayName}`, x, labelY, maxWidth);

        ctx.restore();
    }

    /** Draw a small icon inside the node to indicate its type */
    function drawNodeIcon(x, y, type) {
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const icons = { hospital: '🏥', rescue: '🚒', area: '⚠️' };
        ctx.font = '13px sans-serif';
        ctx.fillText(icons[type] || '📍', x, y);
        ctx.restore();
    }

    /**
     * Draw a road (edge) between two nodes.
     * Color depends on blocked status and whether it is part of a path.
     */
    function drawEdge(edge, primarySet, altSet) {
        const from = getNodeById(edge.from);
        const to = getNodeById(edge.to);
        if (!from || !to) return;

        // Determine color
        let color = COLOR.edge;
        let width = 1.5;
        let dashed = false;

        if (edge.blocked) {
            color = COLOR.edgeBlocked;
            width = 2;
            dashed = true;
        } else if (isInEdgeSet(primarySet, edge.from, edge.to)) {
            return; // Will be drawn separately with glow
        } else if (isInEdgeSet(altSet, edge.from, edge.to)) {
            return; // Will be drawn separately
        }

        // Determine if this edge is selected
        if (
            selectedEdge &&
            ((selectedEdge.from === edge.from && selectedEdge.to === edge.to) ||
                (selectedEdge.from === edge.to && selectedEdge.to === edge.from))
        ) {
            color = COLOR.nodeSelected;
            width = 2;
        }

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        if (dashed) ctx.setLineDash([6, 4]);
        if (edge.blocked) {
            ctx.shadowColor = COLOR.edgeBlocked;
            ctx.shadowBlur = 6;
        }
        ctx.stroke();
        ctx.restore();

        // Draw weight label at midpoint
        const mx = (from.x + to.x) / 2;
        const my = (from.y + to.y) / 2;
        drawWeightLabel(mx, my, edge.weight, edge.blocked);
    }

    /** Draw the animated active/alt path edges with a glow effect */
    function drawPathEdges(path, color, lineWidth, progress) {
        const totalSegments = path.length - 1;
        const drawn = Math.floor(progress * totalSegments * 10) / 10;

        for (let i = 0; i < totalSegments; i++) {
            const from = getNodeById(path[i]);
            const to = getNodeById(path[i + 1]);
            if (!from || !to) continue;

            // How far along this particular segment to draw
            const segProgress = Math.min(Math.max(drawn - i, 0), 1);
            if (segProgress <= 0) continue;

            const ex = from.x + (to.x - from.x) * segProgress;
            const ey = from.y + (to.y - from.y) * segProgress;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(ex, ey);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
        }
    }

    /** Render edge weight label with background pill */
    function drawWeightLabel(x, y, weight, blocked) {
        ctx.save();
        const text = String(weight);
        ctx.font = FONT_WEIGHT;
        const tw = ctx.measureText(text).width;
        const pad = 4;

        ctx.fillStyle = blocked ? 'rgba(183,28,28,0.7)' : 'rgba(7,13,26,0.75)';
        ctx.beginPath();
        ctx.roundRect(x - tw / 2 - pad, y - 8, tw + pad * 2, 16, 4);
        ctx.fill();

        ctx.fillStyle = blocked ? '#ff8a80' : COLOR.weight;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    /* ── Mouse Interaction ───────────────────────────────────────────────── */
    function handleClick(e) {
        const { x, y } = getCanvasPos(e);

        // Check nodes first
        const clickedNode = getNodeAtPos(x, y);
        if (clickedNode) {
            selectedNodeId = selectedNodeId === clickedNode.id ? null : clickedNode.id;
            selectedEdge = null;
            render();
            if (onNodeClick) onNodeClick(clickedNode.id, clickedNode);
            return;
        }

        // Check edges
        const clickedEdge = getEdgeAtPos(x, y);
        if (clickedEdge) {
            selectedEdge = { from: clickedEdge.from, to: clickedEdge.to };
            selectedNodeId = null;
            render();
            if (onEdgeClick) onEdgeClick(selectedEdge);
            return;
        }

        // Empty space — record as pending node position
        pendingNodePos = { x: Math.round(x), y: Math.round(y) };
        selectedNodeId = null;
        selectedEdge = null;
        render();
        if (onCanvasClick) onCanvasClick({ x: pendingNodePos.x, y: pendingNodePos.y });
    }

    function handleMouseMove(e) {
        const { x, y } = getCanvasPos(e);
        const hoverNode = getNodeAtPos(x, y);
        const hoverEdge = hoverNode ? null : getEdgeAtPos(x, y);
        canvas.style.cursor = (hoverNode || hoverEdge) ? 'pointer' : 'crosshair';
    }

    /* ── Utility Helpers ─────────────────────────────────────────────────── */
    function getCanvasPos(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function getNodeById(id) {
        return nodes.find((n) => n.id === id) || null;
    }

    function getNodeAtPos(x, y) {
        return nodes.find((n) => Math.hypot(n.x - x, n.y - y) <= NODE_RADIUS + 4) || null;
    }

    /** Hit-test an edge using point-to-segment distance */
    function getEdgeAtPos(x, y) {
        const HIT_DIST = 8;
        for (const edge of edges) {
            const from = getNodeById(edge.from);
            const to = getNodeById(edge.to);
            if (!from || !to) continue;
            if (pointToSegDist(x, y, from.x, from.y, to.x, to.y) < HIT_DIST) {
                return edge;
            }
        }
        return null;
    }

    function pointToSegDist(px, py, ax, ay, bx, by) {
        const dx = bx - ax, dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - ax, py - ay);
        let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    }

    function buildEdgeSet(path) {
        if (!path || path.length < 2) return new Set();
        const set = new Set();
        for (let i = 0; i < path.length - 1; i++) {
            set.add(`${path[i]}-${path[i + 1]}`);
            set.add(`${path[i + 1]}-${path[i]}`);
        }
        return set;
    }

    function isInEdgeSet(set, from, to) {
        return set.has(`${from}-${to}`) || set.has(`${to}-${from}`);
    }

    function lightenColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + amount);
        const g = Math.min(255, ((num >> 8) & 0xff) + amount);
        const b = Math.min(255, (num & 0xff) + amount);
        return `rgb(${r},${g},${b})`;
    }

    function getPendingPos() { return pendingNodePos; }
    function clearPendingPos() { pendingNodePos = null; render(); }
    function getSelectedEdge() { return selectedEdge; }
    function clearSelection() { selectedNodeId = null; selectedEdge = null; render(); }

    return {
        init,
        setGraph,
        setPath,
        clearPath,
        getPendingPos,
        clearPendingPos,
        getSelectedEdge,
        clearSelection,
    };
})();

window.MapRenderer = MapRenderer;
