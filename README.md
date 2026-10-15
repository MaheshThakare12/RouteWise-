# RouteWise — Smart Tour Route Optimizer (Backtracking TSP)

[![Next.js](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Academic Curriculum:** TY IT — Design and Analysis of Algorithms (DAA)  
> **Course Outcomes:** CO4 (Depth-First Backtracking & Bounding Strategy), CO6 (Complexity Theory & NP-Hardness)  
> **Target Problem:** Exact Solutions to the Travelling Salesperson Problem (TSP) on Complete Symmetric Graphs  
> **Repository:** [https://github.com/MaheshThakare12/RouteWise-](https://github.com/MaheshThakare12/RouteWise-)

---

## 1. Project Overview

**RouteWise** is an interactive, browser-based Travelling Salesperson Problem (TSP) educational laboratory and algorithm debugger. It enables students and faculty to observe, understand, and verify the **Backtracking (Depth-First Search with Incumbent Pruning)** algorithm with step-by-step deterministic playback.

The application has been modularized into **five distinct pages** with persistent navigation and zero page-reload state loss:
1. **Overview (`/`)**: Project introduction, high-level route map preview, pastel metrics, and navigation hub.
2. **Backtracking Visualizer (`/visualizer`)**: Roomy 2-column workspace featuring an interactive SVG state-space search tree, live LIFO call stack ($O(n)$ space), bounding inequality inspector ($currentCost + edgeWeight \ge bestCost$), and collapsible pseudocode/decision log.
3. **Distance Matrix (`/matrix`)**: Dedicated configuration workspace with 4–12 vertex slider and numeric input, starting vertex dropdown, and full-width symmetric matrix editor with instant $d(u,v) = d(v,u)$ mirroring.
4. **Results & Analysis (`/results`)**: Comprehensive tour report with Hamiltonian cycle verification, optimality status (proven vs. timed-out), step-by-step leg breakdown table, and $O((n-1)!)$ vs $O(n)$ complexity breakdown.
5. **Viva & Tests (`/viva`)**: 5 faculty oral exam questions with detailed answers, NP-completeness proof via Hamiltonian Cycle reduction, canonical 4-city textbook benchmark test, and a 200-test automated verification harness.

---

## 2. Key Features

- **Vertex Count (4 to 12) & Starting Vertex Selection:**
  - Synchronized slider and numeric input for selecting 4 to 12 vertices.
  - Starting vertex dropdown displaying permanent numbering and city names (`V1 — Shaniwar Wada`, `V3 — Dagdusheth Ganpati`, etc.).
  - The solver begins and closes the tour at the selected starting vertex, dynamically recalculating costs.
- **Interactive SVG Route Map:**
  - Real-time network mapping with permanent vertex numbers (1 to $n$), prominent blue `START` vertex badge, visited order badges, active DFS traversal path (amber), and rejected branches (dashed red).
- **Interactive State-Space Search Tree:**
  - SVG tree centered on the active DFS node.
  - Color-coded branch states: Active DFS Branch (blue), Best Complete Tour (green), Pruned Subtree (dashed red), Backtracked (gray).
  - Click any node to project its partial route onto the map.
- **Live LIFO Call Stack Inspector:**
  - Displays top-to-bottom active recursion frames with depth, current city, cumulative cost, and unvisited candidate sets.
  - Demonstrates linear $O(n)$ auxiliary stack space.
- **Collapsible Pseudocode & Decision Log:**
  - Side-by-side or tabbed view with active line highlighting synchronized with playback steps.
  - Clickable decision log allowing instant jumps to any past search decision.
- **Full-Width Symmetric Distance Matrix:**
  - Automatic symmetric mirroring ($d(u, v) = d(v, u)$) and disabled diagonal zeros.
  - Warning alert before resizing when unsaved manual edits exist.
  - 1-click actions: **Randomize Matrix**, **Reset Pune Landmarks**, **4-City Textbook Benchmark**.
- **Automated Verification Test Suite:**
  - **4-City Textbook Benchmark:** Known optimum cost = 80 ($A \to B \to D \to C \to A$).
  - **200 Seeded Randomized Tests:** Automatically verified against Brute Force ground truth with 100% agreement.

---

## 3. Algorithm Complexity & Course Outcomes

| Algorithm | Course Outcome | Strategy | Worst-Case Time | Auxiliary Space | Pruning Guarantee |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Depth-First Backtracking** | **CO4** | Depth-First Permutation Search | $O((n - 1)!)$ | $O(n)$ (Stack + Visited) | Prunes whenever $currentCost + edgeWeight \ge bestCost$ |
| **Brute Force Verifier** | — | Exhaustive Permutation | $O((n - 1)!)$ | $O(n)$ | Independent ground truth for $n \le 9$ |

### Why TSP is NP-Hard (CO6)
The decision version of TSP (*"Does there exist a tour of length $\le k$?"*) is NP-complete via polynomial-time reduction from the Hamiltonian Cycle problem. Given an unweighted graph $G = (V, E)$, assign edge weight 1 to $e \in E$ and weight 2 (or $\infty$) to non-edges. A TSP tour of cost $|V|$ exists if and only if $G$ contains a Hamiltonian cycle. Because solving the TSP optimization problem immediately solves the decision problem, TSP optimization is NP-hard.

---

## 4. Five-Page Application Structure

```
smart-tour-route-optimizer/
├── app/
│   ├── layout.tsx         # Root layout with TspProvider & persistent AppHeader
│   ├── page.tsx           # Page 1: Overview (/)
│   ├── visualizer/
│   │   └── page.tsx       # Page 2: Backtracking Visualizer (/visualizer)
│   ├── matrix/
│   │   └── page.tsx       # Page 3: Distance Matrix Editor (/matrix)
│   ├── results/
│   │   └── page.tsx       # Page 4: Results & Analysis (/results)
│   └── viva/
│       └── page.tsx       # Page 5: Viva Preparation & Test Suite (/viva)
├── components/
│   ├── app-header.tsx     # Persistent brand header & horizontal navbar
│   ├── problem-configuration.tsx # Synchronized vertex count & start vertex selection
│   ├── route-map.tsx      # SVG network graph with permanent numbers & start badge
│   ├── backtracking-inspector.tsx # Search tree, call stack, pseudocode & log
│   ├── matrix-panel.tsx   # Full-width symmetric matrix table
│   ├── playback-controller.tsx # Step, play, pause, reset, speed controls
│   └── test-suite-tab.tsx # Automated 4-city textbook & 200 random test runner
├── context/
│   └── tsp-context.tsx    # Centralized React Context preserving state across all pages
└── lib/algorithms/
    ├── backtracking.ts    # Deterministic DFS Backtracking with branch pruning
    ├── brute-force.ts     # Brute-force solver for correctness verification
    ├── matrix-utils.ts    # Matrix helpers, Pune landmarks data, route validation
    ├── test-suite.ts      # Automated test runners
    └── types.ts           # TypeScript type definitions
```

---

## 5. Local Setup & Running

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm** (included with Node.js)

### Installation
```bash
# Clone the repository
git clone https://github.com/MaheshThakare12/RouteWise-.git
cd RouteWise-

# Install dependencies
npm install

# Start the local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build & Test
```bash
# Type check TypeScript
npx tsc --noEmit

# Compile production bundle
npm run build

# Start production server
npm start
```

---

## 6. How to Deploy Live on Vercel (1-Minute Guide)

This Next.js application has zero database or external API dependencies and is pre-configured for 1-click deployment on Vercel:

1. Go to [https://vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **"Add New..."** $\to$ **"Project"**.
3. Under **Import Git Repository**, find **`MaheshThakare12/RouteWise-`** and click **Import**.
4. Keep the default build settings:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `next build`
   - **Output Directory:** `.next`
5. Click **Deploy**.
6. Within 60 seconds, your project will be live with an active `https://routewise-...vercel.app` URL!

---

## 7. Faculty Viva Core Questions & Quick Answers

1. **How does Backtracking solve TSP?**  
   Backtracking explores the state-space tree of permutations via Depth-First Search (DFS). It builds a partial tour path, adds candidate unvisited vertices, and backtracks upon reaching leaves or when branch pruning conditions are satisfied.

2. **What is the bounding condition used for pruning?**  
   If $\text{currentCost} + \text{edgeWeight} \ge \text{bestCost}$, the candidate branch is pruned immediately. Because edge weights are non-negative, any extension of this partial path cannot yield a tour cheaper than $\text{bestCost}$.

3. **What are the time and space complexities?**  
   - Worst-case time: $O((n-1)!)$ (equivalent to exhaustive search when no pruning occurs).
   - Space complexity: $O(n)$ auxiliary stack space (linear recursion depth and visited array).

4. **How does vertex ordering and start city discovery affect performance?**  
   Finding a high-quality incumbent early lowers the pruning threshold, allowing the bounding condition to prune large subtrees near the top of the search space.

5. **Why is TSP NP-hard?**  
   The decision problem (*"Is there a tour of cost $\le k$?"*) is NP-complete by reduction from Hamiltonian Cycle. Since the optimization problem is at least as hard as the decision version, TSP optimization is NP-hard.

---

## 8. License

This project is open-source under the [MIT License](LICENSE).
