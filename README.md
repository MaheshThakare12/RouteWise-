# RouteWise — Smart Tour Route Optimizer

> **Academic Project:** TY IT — Design and Analysis of Algorithms (DAA)  
> **Course Outcomes:** CO3 (Held-Karp DP), CO4 (Backtracking), CO5 (Branch & Bound LCBB), CO6 (NP-Hardness & Complexity Analysis)  
> **Target Problem:** Exact Solutions to the Travelling Salesperson Problem (TSP) on Complete Symmetric Graphs

---

## 1. Project Overview

**RouteWise** is an interactive, browser-based Travelling Salesperson Problem (TSP) algorithm visualizer and educational laboratory. It enables students and faculty to observe, compare, and verify three classic exact TSP algorithms on identical distance matrices with step-by-step deterministic playback:

1. **Backtracking (Depth-First Search with Incumbent Pruning)** — CO4
2. **Least Cost Branch & Bound (Matrix Reduction with Min-Heap)** — CO5
3. **Held-Karp Dynamic Programming (Bitmask Subset Formulation)** — CO3

The application features a clean white theme, interactive SVG route mapping, a deterministic playback engine, live state-space search trees, recursion stack inspection, DP recurrence breakdowns, automated correctness testing against brute force, and an interactive empirical benchmark suite.

---

## 2. Key Features

- **Interactive SVG Route Map:** Real-time visual network mapping with active path highlights, optimal tour overlays, and city landmark markers.
- **Genuine Matrix-Reduction LCBB Solver:** Implements full row and column reductions, dynamic lower bound calculation, and a min-heap priority queue with stable tie-breaking.
- **Live State-Space Tree Inspector:** Clickable search nodes showing parent IDs, prefix paths, lower bounds, reduced cost matrices, and pruning reasons.
- **Bitmask Subset DP Inspector:** Complete Held-Karp recurrence breakdown showing predecessor candidate evaluations, bitmasks in binary, and step-by-step traceback reconstruction.
- **Backtracking Stack & Pseudocode Inspector:** Real-time call stack frames and line-by-line pseudocode highlighting synchronized with search execution.
- **Deterministic Playback Engine:** Play, Pause, Next Step, Previous Step, Reset, and Speed multiplier (0.5x, 1x, 2x, 5x) controls tied to immutable algorithm events.
- **Automated Test Suite:**
  - Canonical 4-City Textbook LCBB verification (A-B=10, A-C=15, A-D=20, B-C=35, B-D=25, C-D=30) asserting Row Reduction = 55, Column Reduction = 15, Root Bound = 70, Optimum = 80.
  - 200 reproducible seeded random matrix test cases ($n \in [4, 9]$) compared against an independent brute-force verifier.
- **Empirical Scalability Benchmarks ($n = 5$ to $12$):** Measures real execution time with `performance.now()`, plots SVG runtime charts with Linear/Log scale toggle, and exports data to CSV.
- **Faculty Viva Mode:** Built-in oral exam guide addressing five core viva questions and the NP-completeness proof via Hamiltonian Cycle reduction.

---

## 3. Algorithm Complexity Reference

| Algorithm | Course Outcome | Strategy | Worst-Case Time | Auxiliary Space | Key Optimality Guarantee |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Depth-First Backtracking** | CO4 | Depth-First Permutation Search | $O(n!)$ | $O(n)$ | Prunes when partial cost $\ge$ best incumbent tour |
| **Least Cost Branch & Bound** | CO5 | Best-First Search via Min-Heap | $O(2^n \cdot n^2)$ | $O(2^n \cdot n^2)$ | Dynamic matrix reduction yields admissible lower bound |
| **Held-Karp Dynamic Programming** | CO3 | Bitmask Subset Memoization | $O(n^2 \cdot 2^n)$ | $O(n \cdot 2^n)$ (cost & parent DP tables; event stream recorded separately) | Optimal substructure eliminates redundant subproblems |
| **Brute Force (Verifier)** | — | Exhaustive Permutation | $O((n-1)!)$ | $O(n)$ | Independent ground truth for $n \le 9$ |

---

## 4. Default Demonstration Data & Disclaimer

> [!NOTE]
> **Synthetic Demonstration Data:**  
> All distances and coordinates provided in the application (including the 8 Pune destination landmarks: *Shaniwar Wada, Aga Khan Palace, Dagdusheth Ganpati, Sinhagad Fort, Phoenix Mall Viman Nagar, Okayama Garden, Katraj Snake Park, Khadakwasla Dam*) are synthetic, normalized benchmark values designed for educational visualization. No live map APIs or API keys are required.

---

## 5. Getting Started & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or later (Node v20+ recommended)
- **Package Manager**: npm or pnpm

### Installation
```bash
# Clone or navigate to the project directory
cd smart-tour-route-optimizer

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to interact with RouteWise.

### Production Build
```bash
# Type-check and compile Next.js production bundle
npm run build

# Start production server
npm start
```

---

## 6. Running Correctness Tests

RouteWise includes a browser-accessible test runner under the **Test Results** tab.

To run the verification suite:
1. Open the application and click the **Test Results** tab in the navigation bar.
2. View the canonical 4-City Textbook LCBB test card (asserts row red = 55, col red = 15, root bound = 70, cost = 80).
3. Click **"Run 200 Tests"** to execute all 200 seeded random instances ($n = 4$ through $9$) verified against independent brute force.

---

## 7. Vercel Deployment Instructions

RouteWise is pre-configured for static export and serverless deployment on Vercel:

1. Push the repository to GitHub / GitLab / Bitbucket.
2. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import the RouteWise repository.
4. Keep standard Next.js build presets:
   - **Framework Preset:** Next.js
   - **Build Command:** `next build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`
5. Click **Deploy**. The application has zero external API dependencies or environment variables.

---

## 8. Screenshot Placeholders

- **Overview Dashboard:** `public/placeholder-overview.png` *(Route map, playback bar, distance matrix, and summary cards)*
- **State-Space Tree Inspector:** `public/placeholder-lcbb.png` *(Min-heap priority queue, interactive tree nodes, and matrix reduction table)*
- **Held-Karp DP Table:** `public/placeholder-dp.png` *(Subset bitmask states, predecessor candidates, and traceback)*
- **Automated Test Results:** `public/placeholder-tests.png` *(4-City textbook pass and 200/200 randomized test runner)*
