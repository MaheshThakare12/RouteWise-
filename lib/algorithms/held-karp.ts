import { AlgorithmEvent, AlgorithmResult, DPCandidate, DPCellInfo, Matrix, SolveOptions } from './types'

export function solveHeldKarp(matrix: Matrix, start = 0, options?: SolveOptions): AlgorithmResult {
  const started = performance.now()
  const n = matrix.length
  const timeoutMs = options?.timeoutMs ?? 5000
  const isAnimated = options?.animated ?? (n <= 8)
  let timedOut = false
  let cancelled = false
  const fullMask = (1 << n) - 1
  const events: AlgorithmEvent[] = []

  // dp[mask][j] -> minimum cost to visit set of cities represented by bitmask 'mask'
  // starting at 'start' and ending at 'j'.
  // Standard space complexity: O(n * 2^n) table entries for costs and parent pointers.
  const numStates = 1 << n
  const dp: number[][] = Array.from({ length: numStates }, () => new Array(n).fill(Infinity))
  const parent: number[][] = Array.from({ length: numStates }, () => new Array(n).fill(-1))

  // Base state: mask with only 'start' city set
  const startMask = 1 << start
  dp[startMask][start] = 0

  const baseCell: DPCellInfo = {
    mask: startMask,
    maskBinary: startMask.toString(2).padStart(n, '0'),
    subsetCities: [start],
    end: start,
    cost: 0
  }
  let dpStatesComputed = 1

  events.push({
    type: 'START',
    message: `Held-Karp Dynamic Programming initialized with base state dp[{C${start + 1}}][C${start + 1}] = 0.`,
    path: [start],
    current: start,
    cost: 0,
    cell: baseCell,
    explored: 1,
    pruned: 0,
    generated: 1,
    bestCostSoFar: Infinity,
    bestRouteSoFar: []
  })

  // Helper to extract cities present in a bitmask
  const getCitiesInMask = (m: number): number[] => {
    const list: number[] = []
    for (let c = 0; c < n; c++) {
      if ((m & (1 << c)) !== 0) list.push(c)
    }
    return list
  }

  // Iterate by subset size: 2 to n
  for (let size = 2; size <= n; size++) {
    if (options?.signal?.aborted) {
      cancelled = true
      break
    }
    if (performance.now() - started > timeoutMs) {
      timedOut = true
      break
    }
    for (let mask = 0; mask < numStates; mask++) {
      // Must contain start city
      if ((mask & startMask) === 0) continue

      // Count set bits
      let bits = 0
      for (let c = 0; c < n; c++) {
        if ((mask & (1 << c)) !== 0) bits++
      }
      if (bits !== size) continue

      const cities = getCitiesInMask(mask)

      // Try every possible ending city j in this mask (j != start)
      for (const j of cities) {
        if (j === start) continue

        const prevMask = mask ^ (1 << j)
        let minCost = Infinity
        let bestPredecessor = -1
        const candidates: DPCandidate[] = []

        // Predecessor i must be in prevMask
        for (const i of cities) {
          if (i === j) continue
          const prevCost = dp[prevMask][i]
          if (prevCost < Infinity) {
            const cost = prevCost + matrix[i][j]
            candidates.push({ from: i, cost, isMin: false })
            if (cost < minCost) {
              minCost = cost
              bestPredecessor = i
            }
          }
        }

        if (minCost < Infinity) {
          dp[mask][j] = minCost
          parent[mask][j] = bestPredecessor
          dpStatesComputed++

          // Mark candidate with minimum
          for (const cand of candidates) {
            if (cand.from === bestPredecessor) cand.isMin = true
          }

          const cellInfo: DPCellInfo = {
            mask,
            maskBinary: mask.toString(2).padStart(n, '0'),
            subsetCities: cities,
            end: j,
            cost: minCost,
            from: bestPredecessor,
            candidates
          }

          if (isAnimated) {
            // Build partial path up to j for visualization
            const partialPath: number[] = []
            let currMask = mask
            let currCity = j
            while (currCity >= 0 && currMask > 0) {
              partialPath.push(currCity)
              if (currCity === start) break
              const p = parent[currMask][currCity]
              currMask ^= 1 << currCity
              currCity = p
            }
            partialPath.reverse()

            events.push({
              type: 'DP_CELL_COMPUTED',
              message: `Computed dp[S={${cities.map(c => `C${c + 1}`).join(',')}}][C${j + 1}] = ${minCost} (from C${bestPredecessor + 1}).`,
              cell: cellInfo,
              path: partialPath,
              current: j,
              cost: minCost,
              explored: dpStatesComputed,
              pruned: 0,
              generated: dpStatesComputed,
              bestCostSoFar: Infinity,
              bestRouteSoFar: []
            })
          }
        }
      }
    }
  }

  // Final step: Close tour from full subset to start city (only if DP completed without timeout/cancellation)
  let optimalCost = Infinity
  let optimalEndCity = -1
  const finalCandidates: DPCandidate[] = []
  const optimalRoute: number[] = []

  if (!timedOut && !cancelled) {
    for (let j = 0; j < n; j++) {
      if (j === start) continue
      const costToJ = dp[fullMask][j]
      if (costToJ < Infinity) {
        const returnEdge = matrix[j][start]
        const totalCost = costToJ + returnEdge
        finalCandidates.push({ from: j, cost: totalCost, isMin: false })
        if (totalCost < optimalCost) {
          optimalCost = totalCost
          optimalEndCity = j
        }
      }
    }

    for (const cand of finalCandidates) {
      if (cand.from === optimalEndCity) cand.isMin = true
    }

    const allCitiesList = getCitiesInMask(fullMask)

    events.push({
      type: 'BOUND_COMPUTED',
      message: `Evaluated complete tours closing at C${start + 1}. Minimum from C${optimalEndCity + 1} with cost ${optimalCost}.`,
      path: [optimalEndCity, start],
      current: start,
      cost: optimalCost,
      cell: {
        mask: fullMask,
        maskBinary: fullMask.toString(2).padStart(n, '0'),
        subsetCities: allCitiesList,
        end: start,
        cost: optimalCost,
        from: optimalEndCity,
        candidates: finalCandidates
      },
      explored: dpStatesComputed,
      pruned: 0,
      generated: dpStatesComputed,
      bestCostSoFar: optimalCost,
      bestRouteSoFar: []
    })

    // Traceback to reconstruct the optimal route
    let currMask = fullMask
    let currCity = optimalEndCity
    const reversedPath: number[] = [start]

    events.push({
      type: 'TRACEBACK_STEP',
      message: `Traceback started: return edge from C${optimalEndCity + 1} to start C${start + 1}.`,
      path: [optimalEndCity, start],
      current: optimalEndCity,
      cost: optimalCost,
      cell: {
        mask: fullMask,
        maskBinary: fullMask.toString(2).padStart(n, '0'),
        subsetCities: allCitiesList,
        end: optimalEndCity,
        cost: dp[fullMask][optimalEndCity],
        from: parent[fullMask][optimalEndCity]
      },
      explored: dpStatesComputed,
      pruned: 0,
      generated: dpStatesComputed,
      bestCostSoFar: optimalCost,
      bestRouteSoFar: []
    })

    while (currCity !== start && currCity >= 0) {
      reversedPath.push(currCity)
      const pred = parent[currMask][currCity]
      events.push({
        type: 'TRACEBACK_STEP',
        message: `Traceback step: optimal predecessor of C${currCity + 1} is C${pred + 1}.`,
        path: [...reversedPath].reverse(),
        current: pred,
        cost: dp[currMask][currCity],
        cell: {
          mask: currMask,
          maskBinary: currMask.toString(2).padStart(n, '0'),
          subsetCities: getCitiesInMask(currMask),
          end: currCity,
          cost: dp[currMask][currCity],
          from: pred
        },
        explored: dpStatesComputed,
        pruned: 0,
        generated: dpStatesComputed,
        bestCostSoFar: optimalCost,
        bestRouteSoFar: []
      })
      currMask ^= 1 << currCity
      currCity = pred
    }
    reversedPath.push(start)
    optimalRoute.push(...reversedPath.reverse())
  }

  const duration = performance.now() - started

  if (timedOut) {
    events.push({
      type: 'FINISHED',
      message: `Held-Karp DP timed out after ${timeoutMs}ms limit. Optimality not proven.`,
      path: [start],
      current: start,
      cost: Infinity,
      explored: dpStatesComputed,
      pruned: 0,
      generated: dpStatesComputed,
      bestCostSoFar: Infinity,
      bestRouteSoFar: []
    })
  } else if (cancelled) {
    events.push({
      type: 'FINISHED',
      message: `Held-Karp DP cancelled before completion. Optimality not proven.`,
      path: [start],
      current: start,
      cost: Infinity,
      explored: dpStatesComputed,
      pruned: 0,
      generated: dpStatesComputed,
      bestCostSoFar: Infinity,
      bestRouteSoFar: []
    })
  } else {
    events.push({
      type: 'FINISHED',
      message: `Held-Karp complete. Optimal tour cost: ${optimalCost}. Total DP states: ${dpStatesComputed}.`,
      path: optimalRoute,
      current: start,
      cost: optimalCost,
      explored: dpStatesComputed,
      pruned: 0,
      generated: dpStatesComputed,
      bestCostSoFar: optimalCost,
      bestRouteSoFar: optimalRoute
    })
  }

  return {
    algorithm: 'held-karp',
    route: timedOut || cancelled ? [] : optimalRoute,
    cost: timedOut || cancelled ? Infinity : optimalCost,
    events,
    generated: dpStatesComputed,
    explored: dpStatesComputed,
    pruned: 0,
    dpStates: dpStatesComputed,
    duration,
    timedOut,
    cancelled,
    statusMessage: timedOut ? `Timed out (>${timeoutMs}ms)` : cancelled ? 'Cancelled' : undefined
  }
}
