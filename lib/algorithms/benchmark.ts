import { Matrix } from './types'
import { seededMatrix } from './matrix-utils'
import { solveBacktracking } from './backtracking'
import { solveLCBB } from './lcbb'
import { solveHeldKarp } from './held-karp'

export interface BenchmarkDataPoint {
  n: number
  algorithm: string
  timeMs: number
  explored: number
  cost: number
  timedOut: boolean
}

export interface BenchmarkRunResult {
  n: number
  data: {
    backtracking: { timeMs: number; explored: number; cost: number; timedOut: boolean }
    lcbb: { timeMs: number; explored: number; cost: number; timedOut: boolean }
    heldKarp: { timeMs: number; explored: number; cost: number; timedOut: boolean }
  }
}

export function runBenchmarkForN(n: number, seed = 500 + n * 31): BenchmarkRunResult {
  const matrix = seededMatrix(n, seed)

  // 1. Held-Karp (predictable O(n^2 2^n))
  const hkStart = performance.now()
  const hkRes = solveHeldKarp(matrix, 0, { animated: false })
  const hkTime = performance.now() - hkStart

  // 2. LCBB
  let lcbbTime = 0
  let lcbbExplored = 0
  let lcbbCost = 0
  let lcbbTimedOut = false

  try {
    const start = performance.now()
    const res = solveLCBB(matrix, 0, { animated: false })
    lcbbTime = performance.now() - start
    lcbbExplored = res.explored
    lcbbCost = res.cost
    lcbbTimedOut = Boolean(res.timedOut || res.cancelled)
  } catch {
    lcbbTimedOut = true
  }

  // 3. Backtracking
  let btTime = 0
  let btExplored = 0
  let btCost = 0
  let btTimedOut = false

  try {
    const start = performance.now()
    const res = solveBacktracking(matrix, 0, { animated: false })
    btTime = performance.now() - start
    btExplored = res.explored
    btCost = res.cost
    btTimedOut = Boolean(res.timedOut || res.cancelled)
  } catch {
    btTimedOut = true
  }

  return {
    n,
    data: {
      backtracking: {
        timeMs: btTime,
        explored: btExplored,
        cost: btCost,
        timedOut: btTimedOut
      },
      lcbb: {
        timeMs: lcbbTime,
        explored: lcbbExplored,
        cost: lcbbCost,
        timedOut: lcbbTimedOut
      },
      heldKarp: {
        timeMs: hkTime,
        explored: hkRes.explored,
        cost: hkRes.cost,
        timedOut: Boolean(hkRes.timedOut || hkRes.cancelled)
      }
    }
  }
}

export function exportBenchmarkCSV(results: BenchmarkRunResult[]): string {
  const headers = [
    'CityCount_n',
    'Backtracking_Time_ms',
    'Backtracking_Explored',
    'LCBB_Time_ms',
    'LCBB_Explored',
    'HeldKarp_Time_ms',
    'HeldKarp_DPStates',
    'Optimal_Cost'
  ]

  const rows = results.map(r => [
    r.n,
    r.data.backtracking.timedOut ? 'TIMEOUT' : r.data.backtracking.timeMs.toFixed(3),
    r.data.backtracking.explored,
    r.data.lcbb.timedOut ? 'TIMEOUT' : r.data.lcbb.timeMs.toFixed(3),
    r.data.lcbb.explored,
    r.data.heldKarp.timeMs.toFixed(3),
    r.data.heldKarp.explored,
    r.data.heldKarp.cost
  ])

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}
