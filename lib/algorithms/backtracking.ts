import { AlgorithmEvent, AlgorithmResult, Matrix, SolveOptions } from './types'

export const BACKTRACKING_PSEUDOCODE = [
  'procedure TSP_BranchAndBound(path, current_cost):',
  '  if path.length == n then',
  '    total_cost = current_cost + dist[u][start]',
  '    if total_cost < best_cost then best_cost = total_cost; best_path = path + [start]',
  '    return',
  '  for each v not in path do',
  '    lb = compute_2min_lower_bound(path + [v])',
  '    if lb >= best_cost then',
  '      prune(v) // 2-min lower bound >= incumbent best',
  '    else',
  '      path.push(v); TSP_BranchAndBound(path, current_cost + dist[u][v]); path.pop()'
]

export interface TwoMinBoundBreakdown {
  lb: number
  currentCost: number
  minStart: number
  minTip: number
  unvisitedSum: number
  remainingEstimate: number
  unvisitedCount: number
}

/**
 * Computes an admissible Two-Minimum-Edges Lower Bound for a given partial path.
 *
 * Mathematical derivation:
 * In any valid Hamiltonian tour, every vertex has degree exactly 2.
 * For a partial path P = [v_0, v_1, ..., v_k] with start = v_0, tip = v_k:
 * 1. Fixed edges: (v_0, v_1), ..., (v_{k-1}, v_k). Total cost = currentCost.
 * 2. Intermediate path vertices (v_1, ..., v_{k-1}) have both incident edges fixed (degree 2 satisfied).
 * 3. Start vertex v_0 has 1 fixed edge (v_0, v_1). Its second edge must return from an unvisited vertex in U.
 *    Minimum contribution = min_{u in U} D[v_0][u].
 * 4. Tip vertex v_k has 1 fixed edge (v_{k-1}, v_k). Its second edge must enter an unvisited vertex in U.
 *    Minimum contribution = min_{w in U} D[v_k][w].
 * 5. Each unvisited vertex u in U has 0 fixed edges. Its two incident edges in the tour must connect to
 *    either another unvisited vertex or to the endpoints {v_0, v_k}.
 *    Minimum contribution = c_1(u) + c_2(u), where c_1, c_2 are the two smallest edge weights from u to (U \ {u}) U {v_0, v_k}.
 *
 * Summing endpoint and unvisited contributions gives 2 * (cost of remaining edges in any completing tour).
 * Therefore:
 *   LB(P) = currentCost + ceil(1/2 * (min_start + min_tip + sum_{u in U} (c_1(u) + c_2(u))))
 *
 * Special cases:
 * - Full tour (|P| == n): LB = currentCost + D[v_{n-1}][v_0] (exact cost).
 * - Root node (|P| == 1): No fixed edges. Every vertex needs 2 incident edges:
 *   LB = ceil(1/2 * sum_{v in V} (c_1(v) + c_2(v)))
 */
export function computeTwoMinLowerBound(path: number[], matrix: Matrix, n: number): number {
  const len = path.length
  if (len === 0) return 0
  const start = path[0]
  const tip = path[len - 1]

  // Calculate current partial path cost
  let currentCost = 0
  for (let i = 0; i < len - 1; i++) {
    currentCost += matrix[path[i]][path[i + 1]]
  }

  // Case 1: Complete tour formed (all vertices in path)
  if (len === n) {
    return currentCost + matrix[tip][start]
  }

  // Identify unvisited vertices
  const inPath = new Set<number>(path)
  const unvisited: number[] = []
  for (let i = 0; i < n; i++) {
    if (!inPath.has(i)) {
      unvisited.push(i)
    }
  }

  // Case 2: Root node (only start vertex, no edges fixed yet)
  if (len === 1) {
    let sum = 0
    for (let i = 0; i < n; i++) {
      let min1 = Infinity
      let min2 = Infinity
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const d = matrix[i][j]
        if (d < min1) {
          min2 = min1
          min1 = d
        } else if (d < min2) {
          min2 = d
        }
      }
      sum += min1 + min2
    }
    return Math.ceil(sum / 2)
  }

  // Case 3: Partial path (1 < len < n)
  // Endpoint 1: Start vertex v_0 needs 1 edge to unvisited
  let minStart = Infinity
  for (const u of unvisited) {
    const d = matrix[start][u]
    if (d < minStart) {
      minStart = d
    }
  }

  // Endpoint 2: Tip vertex v_k needs 1 edge to unvisited
  let minTip = Infinity
  for (const u of unvisited) {
    const d = matrix[tip][u]
    if (d < minTip) {
      minTip = d
    }
  }

  // Unvisited vertices: each needs 2 edges among legal neighbors (other unvisited + start + tip)
  let unvisitedSum = 0
  for (const u of unvisited) {
    let min1 = Infinity
    let min2 = Infinity

    // Legal connections: other unvisited vertices
    for (const v of unvisited) {
      if (u === v) continue
      const d = matrix[u][v]
      if (d < min1) {
        min2 = min1
        min1 = d
      } else if (d < min2) {
        min2 = d
      }
    }

    // Legal connections: start endpoint
    const dStart = matrix[u][start]
    if (dStart < min1) {
      min2 = min1
      min1 = dStart
    } else if (dStart < min2) {
      min2 = dStart
    }

    // Legal connections: tip endpoint
    const dTip = matrix[u][tip]
    if (dTip < min1) {
      min2 = min1
      min1 = dTip
    } else if (dTip < min2) {
      min2 = dTip
    }

    if (min1 === Infinity) min1 = 0
    if (min2 === Infinity) min2 = min1

    unvisitedSum += min1 + min2
  }

  if (minStart === Infinity) minStart = 0
  if (minTip === Infinity) minTip = 0

  const remainingSum = minStart + minTip + unvisitedSum
  const remainingCeil = Math.ceil(remainingSum / 2)

  return currentCost + remainingCeil
}

/**
 * Returns the detailed mathematical breakdown of the Two-Minimum-Edges Lower Bound
 * for diagnostic visualization and educational inspection.
 */
export function computeTwoMinLowerBoundBreakdown(
  path: number[],
  matrix: Matrix,
  n: number
): TwoMinBoundBreakdown {
  const len = path.length
  if (len === 0) {
    return {
      lb: 0,
      currentCost: 0,
      minStart: 0,
      minTip: 0,
      unvisitedSum: 0,
      remainingEstimate: 0,
      unvisitedCount: 0
    }
  }
  const start = path[0]
  const tip = path[len - 1]

  let currentCost = 0
  for (let i = 0; i < len - 1; i++) {
    currentCost += matrix[path[i]][path[i + 1]]
  }

  if (len === n) {
    const returnCost = matrix[tip][start]
    return {
      lb: currentCost + returnCost,
      currentCost,
      minStart: returnCost,
      minTip: returnCost,
      unvisitedSum: 0,
      remainingEstimate: returnCost,
      unvisitedCount: 0
    }
  }

  const inPath = new Set<number>(path)
  const unvisited: number[] = []
  for (let i = 0; i < n; i++) {
    if (!inPath.has(i)) unvisited.push(i)
  }

  if (len === 1) {
    let sum = 0
    for (let i = 0; i < n; i++) {
      let min1 = Infinity, min2 = Infinity
      for (let j = 0; j < n; j++) {
        if (i === j) continue
        const d = matrix[i][j]
        if (d < min1) { min2 = min1; min1 = d; }
        else if (d < min2) { min2 = d; }
      }
      sum += min1 + min2
    }
    const rem = Math.ceil(sum / 2)
    return {
      lb: rem,
      currentCost: 0,
      minStart: 0,
      minTip: 0,
      unvisitedSum: sum,
      remainingEstimate: rem,
      unvisitedCount: unvisited.length
    }
  }

  let minStart = Infinity
  for (const u of unvisited) {
    if (matrix[start][u] < minStart) minStart = matrix[start][u]
  }

  let minTip = Infinity
  for (const u of unvisited) {
    if (matrix[tip][u] < minTip) minTip = matrix[tip][u]
  }

  let unvisitedSum = 0
  for (const u of unvisited) {
    let min1 = Infinity, min2 = Infinity
    for (const v of unvisited) {
      if (u === v) continue
      const d = matrix[u][v]
      if (d < min1) { min2 = min1; min1 = d; }
      else if (d < min2) { min2 = d; }
    }
    const dStart = matrix[u][start]
    if (dStart < min1) { min2 = min1; min1 = dStart; }
    else if (dStart < min2) { min2 = dStart; }

    const dTip = matrix[u][tip]
    if (dTip < min1) { min2 = min1; min1 = dTip; }
    else if (dTip < min2) { min2 = dTip; }

    if (min1 === Infinity) min1 = 0
    if (min2 === Infinity) min2 = min1
    unvisitedSum += min1 + min2
  }

  if (minStart === Infinity) minStart = 0
  if (minTip === Infinity) minTip = 0

  const remainingSum = minStart + minTip + unvisitedSum
  const remainingEstimate = Math.ceil(remainingSum / 2)

  return {
    lb: currentCost + remainingEstimate,
    currentCost,
    minStart,
    minTip,
    unvisitedSum,
    remainingEstimate,
    unvisitedCount: unvisited.length
  }
}

export function solveBacktracking(matrix: Matrix, start = 0, options?: SolveOptions): AlgorithmResult {
  const started = performance.now()
  const n = matrix.length
  const timeoutMs = options?.timeoutMs ?? 5000
  const isAnimated = options?.animated ?? (n <= 8)
  let timedOut = false
  let limitReason: 'timeout' | 'node_budget' | null = null
  let cancelled = false
  let bestCost = Infinity
  let bestRoute: number[] = []
  let explored = 0
  let generated = 0
  let pruned = 0

  const events: AlgorithmEvent[] = []
  const stack: Array<{ city: number; depth: number; cost: number }> = [
    { city: start, depth: 0, cost: 0 }
  ]

  const MAX_EXPLORED = isAnimated ? (n >= 10 ? 15000 : 500000) : (n >= 10 ? 2000000 : 500000)

  // For large n (10-12), seed with valid nearest-neighbor tour to prune aggressively
  if (n >= 10) {
    const visited = new Set<number>([start])
    const greedyTour = [start]
    let curr = start
    let greedyCost = 0
    while (greedyTour.length < n) {
      let nearest = -1
      let minD = Infinity
      for (let next = 0; next < n; next++) {
        if (!visited.has(next) && matrix[curr][next] < minD) {
          minD = matrix[curr][next]
          nearest = next
        }
      }
      if (nearest === -1) break
      visited.add(nearest)
      greedyTour.push(nearest)
      greedyCost += minD
      curr = nearest
    }
    greedyTour.push(start)
    greedyCost += matrix[curr][start]
    bestCost = greedyCost
    bestRoute = greedyTour
  }

  const rootLb = computeTwoMinLowerBound([start], matrix, n)

  events.push({
    type: 'START',
    message: `Depth-First Branch & Bound initialized from start vertex V${start + 1} (Root 2-Min Lower Bound = ${rootLb}).`,
    path: [start],
    current: start,
    cost: 0,
    lowerBound: rootLb,
    pseudocodeLine: 0,
    stack: isAnimated ? [...stack] : [],
    explored: 0,
    pruned: 0,
    generated: 0,
    bestCostSoFar: bestCost,
    bestRouteSoFar: [...bestRoute]
  })

  function dfs(path: number[], currentCost: number) {
    if (options?.signal?.aborted) {
      cancelled = true
      return
    }
    if (performance.now() - started > timeoutMs) {
      timedOut = true
      limitReason = 'timeout'
      return
    }
    if (explored >= MAX_EXPLORED) {
      timedOut = true
      limitReason = 'node_budget'
      return
    }
    const u = path[path.length - 1]
    explored++
    const currentLb = computeTwoMinLowerBound(path, matrix, n)

    if (isAnimated) {
      events.push({
        type: 'NODE_EXPANDING',
        message: `Expanding vertex V${u + 1} at depth ${path.length - 1} (path cost: ${currentCost}, 2-min LB = ${currentLb}).`,
        path: [...path],
        current: u,
        cost: currentCost,
        lowerBound: currentLb,
        explored,
        pruned,
        generated,
        pseudocodeLine: 1,
        stack: [...stack],
        bestCostSoFar: bestCost,
        bestRouteSoFar: [...bestRoute]
      })
    }

    if (path.length === n) {
      // Completed permutation; return to start
      const returnCost = matrix[u][start]
      const totalCost = currentCost + returnCost
      const completeTour = [...path, start]

      if (isAnimated) {
        events.push({
          type: 'BOUND_COMPUTED',
          message: `Complete tour reached: ${completeTour.map(c => `V${c + 1}`).join(' → ')} with cost ${totalCost}.`,
          path: completeTour,
          current: start,
          cost: totalCost,
          lowerBound: totalCost,
          pseudocodeLine: 2,
          stack: [...stack],
          explored,
          pruned,
          generated,
          bestCostSoFar: bestCost,
          bestRouteSoFar: [...bestRoute]
        })
      }

      if (totalCost < bestCost) {
        bestCost = totalCost
        bestRoute = completeTour
        events.push({
          type: 'BEST_SOLUTION_FOUND',
          message: `New incumbent optimal tour found: cost = ${bestCost}.`,
          path: [...bestRoute],
          current: start,
          cost: bestCost,
          lowerBound: bestCost,
          pseudocodeLine: 3,
          stack: isAnimated ? [...stack] : [],
          explored,
          pruned,
          generated,
          bestCostSoFar: bestCost,
          bestRouteSoFar: [...bestRoute]
        })
      }
      return
    }

    // Try all unvisited neighbors
    for (let v = 0; v < n; v++) {
      if (!path.includes(v)) {
        generated++
        const edgeWeight = matrix[u][v]
        const nextCost = currentCost + edgeWeight
        const nextPath = [...path, v]
        const lb = computeTwoMinLowerBound(nextPath, matrix, n)

        if (isAnimated) {
          events.push({
            type: 'NODE_GENERATED',
            message: `Branch V${u + 1} → V${v + 1} (edge = ${edgeWeight}, path cost = ${nextCost}, 2-min LB = ${lb}, best = ${bestCost < Infinity ? bestCost : '∞'}).`,
            path: nextPath,
            current: v,
            cost: nextCost,
            lowerBound: lb,
            explored,
            pruned,
            generated,
            pseudocodeLine: 6,
            stack: [...stack],
            bestCostSoFar: bestCost,
            bestRouteSoFar: [...bestRoute]
          })
        }

        if (lb >= bestCost) {
          pruned++
          if (isAnimated) {
            events.push({
              type: 'NODE_PRUNED',
              message: `Pruning branch V${u + 1} → V${v + 1}: 2-min lower bound ${lb} ≥ incumbent best ${bestCost}.`,
              path: nextPath,
              current: v,
              cost: nextCost,
              lowerBound: lb,
              explored,
              pruned,
              generated,
              pseudocodeLine: 8,
              stack: [...stack],
              bestCostSoFar: bestCost,
              bestRouteSoFar: [...bestRoute]
            })
            events.push({
              type: 'EDGE_REJECTED',
              message: `Edge V${u + 1} → V${v + 1} rejected: LB (${lb}) ≥ best tour (${bestCost}).`,
              path: [...path],
              current: u,
              cost: currentCost,
              lowerBound: lb,
              explored,
              pruned,
              generated,
              pseudocodeLine: 8,
              stack: [...stack],
              bestCostSoFar: bestCost,
              bestRouteSoFar: [...bestRoute]
            })
          }
        } else {
          if (isAnimated) {
            events.push({
              type: 'EDGE_SELECTED',
              message: `Advancing to V${v + 1}: lower bound ${lb} < incumbent ${bestCost < Infinity ? bestCost : '∞'}.`,
              path: nextPath,
              current: v,
              cost: nextCost,
              lowerBound: lb,
              explored,
              pruned,
              generated,
              pseudocodeLine: 10,
              stack: [...stack, { city: v, depth: path.length, cost: nextCost }],
              bestCostSoFar: bestCost,
              bestRouteSoFar: [...bestRoute]
            })
          }

          stack.push({ city: v, depth: path.length, cost: nextCost })
          dfs(nextPath, nextCost)
          stack.pop()

          if (isAnimated) {
            events.push({
              type: 'BACKTRACK',
              message: `Backtracking from V${v + 1} to V${u + 1}.`,
              path: [...path],
              current: u,
              cost: currentCost,
              lowerBound: computeTwoMinLowerBound(path, matrix, n),
              explored,
              pruned,
              generated,
              pseudocodeLine: 10,
              stack: [...stack],
              bestCostSoFar: bestCost,
              bestRouteSoFar: [...bestRoute]
            })
          }
        }
      }
    }
  }

  dfs([start], 0)

  const duration = performance.now() - started

  if (timedOut) {
    const reasonText =
      limitReason === 'node_budget'
        ? `search node budget (${MAX_EXPLORED.toLocaleString()} explored states) reached`
        : `${timeoutMs}ms time limit reached`
    events.push({
      type: 'FINISHED',
      message: `Branch & Bound terminated early (${reasonText}). Optimality not proven.`,
      path: [start],
      current: start,
      cost: Infinity,
      lowerBound: Infinity,
      explored,
      pruned,
      generated,
      pseudocodeLine: 4,
      stack: [],
      bestCostSoFar: Infinity,
      bestRouteSoFar: []
    })
  } else if (cancelled) {
    events.push({
      type: 'FINISHED',
      message: `Branch & Bound cancelled before completion. Optimality not proven.`,
      path: [start],
      current: start,
      cost: Infinity,
      lowerBound: Infinity,
      explored,
      pruned,
      generated,
      pseudocodeLine: 4,
      stack: [],
      bestCostSoFar: Infinity,
      bestRouteSoFar: []
    })
  } else {
    events.push({
      type: 'FINISHED',
      message: `Branch & Bound complete. Optimal tour cost: ${bestCost}. Explored: ${explored}, Pruned: ${pruned}.`,
      path: bestRoute,
      current: start,
      cost: bestCost,
      lowerBound: bestCost,
      explored,
      pruned,
      generated,
      pseudocodeLine: 4,
      stack: [],
      bestCostSoFar: bestCost,
      bestRouteSoFar: [...bestRoute]
    })
  }

  return {
    algorithm: 'backtracking',
    route: timedOut || cancelled ? [] : bestRoute,
    cost: timedOut || cancelled ? Infinity : bestCost,
    events,
    generated,
    explored,
    pruned,
    duration,
    timedOut,
    cancelled,
    statusMessage: timedOut
      ? limitReason === 'node_budget'
        ? `Timed out (node limit ${MAX_EXPLORED.toLocaleString()} reached)`
        : `Timed out (>${timeoutMs}ms)`
      : cancelled
      ? 'Cancelled'
      : undefined
  }
}
