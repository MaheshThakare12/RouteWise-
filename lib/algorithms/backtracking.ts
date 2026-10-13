import { AlgorithmEvent, AlgorithmResult, Matrix, SolveOptions } from './types'

export const BACKTRACKING_PSEUDOCODE = [
  'procedure TSP_Backtrack(u, current_cost):',
  '  if path.length == n then',
  '    total_cost = current_cost + dist[u][start]',
  '    if total_cost < best_cost then best_cost = total_cost; best_path = path + [start]',
  '    return',
  '  for each v not in path do',
  '    if current_cost + dist[u][v] >= best_cost then',
  '      prune(v) // bound exceeds incumbent',
  '    else',
  '      path.push(v); TSP_Backtrack(v, current_cost + dist[u][v]); path.pop()'
]

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

  events.push({
    type: 'START',
    message: `Depth-First Backtracking initialized from start city ${start + 1}.`,
    path: [start],
    current: start,
    cost: 0,
    pseudocodeLine: 0,
    stack: isAnimated ? [...stack] : [],
    explored: 0,
    pruned: 0,
    generated: 0,
    bestCostSoFar: Infinity,
    bestRouteSoFar: []
  })

  const MAX_EXPLORED = isAnimated ? (n >= 10 ? 15000 : 500000) : (n >= 10 ? 2000000 : 500000)

  // For large n (10-12), seed with nearest-neighbor tour to prune aggressively
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

    if (isAnimated) {
      events.push({
        type: 'NODE_EXPANDING',
        message: `Expanding city C${u + 1} at depth ${path.length - 1} (path cost: ${currentCost}).`,
        path: [...path],
        current: u,
        cost: currentCost,
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
          message: `Complete tour reached: ${completeTour.map(c => `C${c + 1}`).join(' → ')} with cost ${totalCost}.`,
          path: completeTour,
          current: start,
          cost: totalCost,
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

        if (isAnimated) {
          events.push({
            type: 'NODE_GENERATED',
            message: `Considering branch C${u + 1} → C${v + 1} (edge weight = ${edgeWeight}, partial cost = ${nextCost}).`,
            path: [...path, v],
            current: v,
            cost: nextCost,
            explored,
            pruned,
            generated,
            pseudocodeLine: 5,
            stack: [...stack],
            bestCostSoFar: bestCost,
            bestRouteSoFar: [...bestRoute]
          })
        }

        if (nextCost >= bestCost) {
          pruned++
          if (isAnimated) {
            events.push({
              type: 'NODE_PRUNED',
              message: `Pruning branch C${u + 1} → C${v + 1}: partial cost ${nextCost} ≥ incumbent best ${bestCost}.`,
              path: [...path, v],
              current: v,
              cost: nextCost,
              explored,
              pruned,
              generated,
              pseudocodeLine: 6,
              stack: [...stack],
              bestCostSoFar: bestCost,
              bestRouteSoFar: [...bestRoute]
            })
            events.push({
              type: 'EDGE_REJECTED',
              message: `Edge C${u + 1} → C${v + 1} rejected due to bounding condition.`,
              path: [...path],
              current: u,
              cost: currentCost,
              explored,
              pruned,
              generated,
              pseudocodeLine: 7,
              stack: [...stack],
              bestCostSoFar: bestCost,
              bestRouteSoFar: [...bestRoute]
            })
          }
        } else {
          if (isAnimated) {
            events.push({
              type: 'EDGE_SELECTED',
              message: `Advancing along edge C${u + 1} → C${v + 1}.`,
              path: [...path, v],
              current: v,
              cost: nextCost,
              explored,
              pruned,
              generated,
              pseudocodeLine: 9,
              stack: [...stack, { city: v, depth: path.length, cost: nextCost }],
              bestCostSoFar: bestCost,
              bestRouteSoFar: [...bestRoute]
            })
          }

          stack.push({ city: v, depth: path.length, cost: nextCost })
          dfs([...path, v], nextCost)
          stack.pop()

          if (isAnimated) {
            events.push({
              type: 'BACKTRACK',
              message: `Backtracking from C${v + 1} to C${u + 1}.`,
              path: [...path],
              current: u,
              cost: currentCost,
              explored,
              pruned,
              generated,
              pseudocodeLine: 9,
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
      message: `Backtracking terminated early (${reasonText}). Optimality not proven.`,
      path: [start],
      current: start,
      cost: Infinity,
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
      message: `Backtracking cancelled before completion. Optimality not proven.`,
      path: [start],
      current: start,
      cost: Infinity,
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
      message: `Backtracking complete. Optimal tour cost: ${bestCost}. Explored: ${explored}, Pruned: ${pruned}.`,
      path: bestRoute,
      current: start,
      cost: bestCost,
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
    dpStates: 0,
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
