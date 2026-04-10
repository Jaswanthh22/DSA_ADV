# 🚨 Disaster Rescue Route Planner

A full-stack web application for emergency teams to plan the safest and shortest rescue routes during disasters, powered by **Dijkstra** and **BFS** graph algorithms.

---

## 🗂️ Project Structure

```
DSA_ADV/
├── backend/
│   ├── algorithms/
│   │   ├── dijkstra.js       # Min-Heap Dijkstra
│   │   ├── bfs.js            # Breadth-First Search
│   │   └── graphUtils.js     # Adjacency list builder
│   ├── controllers/
│   │   └── graphController.js
│   ├── models/
│   │   ├── Node.js           # MongoDB schema: locations
│   │   └── Edge.js           # MongoDB schema: roads
│   ├── routes/
│   │   └── graph.js          # REST API routes
│   ├── data/
│   │   └── sampleData.json   # Sample city (10 nodes, 15 edges)
│   └── server.js             # Express entry point
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── api.js            # HTTP client
│       ├── map.js            # Canvas graph renderer
│       └── app.js            # UI controller
├── package.json
└── README.md
```

---

## 🚀 How to Run

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) (optional — app works in memory mode without it)

### Steps

```bash
# 1. Navigate to the project directory
cd DSA_ADV

# 2. Install dependencies
npm install

# 3. (Optional) Start MongoDB
mongod --dbpath /data/db

# 4. Start the server
npm start

# 5. Open in browser
open http://localhost:3000
```

> **No MongoDB?** No problem. The app automatically falls back to an in-memory store.

---

## 🎮 How to Use

| Action | Steps |
|--------|-------|
| **Load city** | Click **"Load Sample City"** in the sidebar |
| **Find route** | Click two nodes on the map → click **"Find Route"** |
| **Block a road** | Click an edge on the map → click **"🚧 Block"** |
| **Nearest rescue** | Enter a target zone → click **"🏥 Nearest Rescue"** |
| **Add location** | Fill the form, click canvas to set position → **"Add Location"** |
| **Add road** | Enter From/To IDs and weight → **"Add Road"** |

---

## 🗺️ REST API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/graph` | Fetch all nodes + edges |
| `POST` | `/api/graph/node` | Add a location |
| `POST` | `/api/graph/edge` | Add a road |
| `PATCH` | `/api/graph/edge/block` | Block/unblock a road |
| `POST` | `/api/graph/route` | Find shortest path |
| `POST` | `/api/graph/multisource` | Nearest hospital/rescue center |
| `POST` | `/api/graph/seed` | Load sample data |
| `DELETE` | `/api/graph/clear` | Clear graph |

---

## 🧠 Data Structures & Algorithms

### Graph Representation
- **Adjacency List** using JavaScript `Map<nodeId, [{neighbor, weight}]>`
- **Undirected weighted graph** — each road is traversable in both directions
- Blocked edges are excluded from the adjacency list before running algorithms

### Dijkstra's Algorithm (Weighted Shortest Path)
```
Time:  O((V + E) log V)
Space: O(V + E)
```
Uses a **Min-Heap Priority Queue** (custom binary heap) to always process the node with the smallest known distance. Stops as soon as the target is dequeued — perfect for weighted road networks with varying travel times.

### BFS (Unweighted Shortest Path)
```
Time:  O(V + E)
Space: O(V)
```
Explores the graph level by level, guaranteeing the minimum number of road segments (hops) between two nodes. Ideal for quick connectivity checks or when all roads are equal.

### Multi-Source Rescue
Runs Dijkstra from **every** hospital and rescue center simultaneously, then picks the source with the minimum distance to the target. An efficient way to dispatch the closest unit.

---

## 🗃️ Sample Data Overview

Pre-loaded city with **10 locations** and **15 roads**:

| ID | Location | Type |
|----|----------|------|
| 0 | City Hospital | 🏥 Hospital |
| 1 | St. Mary Hospital | 🏥 Hospital |
| 2 | Fire Station Alpha | 🚒 Rescue |
| 3 | Fire Station Beta | 🚒 Rescue |
| 4 | Rescue HQ | 🚒 Rescue |
| 5–9 | Zone A–E | ⚠️ Affected Areas |

Two roads are **pre-blocked** to demonstrate disaster rerouting.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Frontend | Vanilla HTML/CSS/JS |
| Visualization | HTML5 Canvas |
| Algorithms | Custom Dijkstra + BFS |
# DSA_ADV
