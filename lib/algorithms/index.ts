export * from './types'
export * from './matrix-utils'
export * from './backtracking'
export * from './lcbb'
export * from './held-karp'
export * from './brute-force'
export * from './test-suite'
export * from './benchmark'

import { Matrix, AlgorithmResult, SolveOptions } from './types'
import { solveBacktracking } from './backtracking'
import { solveLCBB } from './lcbb'
import { solveHeldKarp } from './held-karp'

export function runAll(matrix: Matrix, start = 0, options?: SolveOptions): AlgorithmResult[] {
  return [
    solveBacktracking(matrix, start, options),
    solveLCBB(matrix, start, options),
    solveHeldKarp(matrix, start, options)
  ]
}

