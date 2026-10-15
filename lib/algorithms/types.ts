export type AlgorithmName = 'backtracking'

export type EventType =
  | 'START'
  | 'NODE_GENERATED'
  | 'NODE_EXPANDING'
  | 'EDGE_SELECTED'
  | 'EDGE_REJECTED'
  | 'BOUND_COMPUTED'
  | 'NODE_PRUNED'
  | 'BEST_SOLUTION_FOUND'
  | 'BACKTRACK'
  | 'FINISHED'

export type Matrix = number[][]

export interface StackFrame {
  city: number
  depth: number
  cost: number
}

export interface AlgorithmEvent {
  type: EventType
  message: string
  path?: number[]
  current?: number
  cost?: number
  lowerBound?: number
  explored?: number
  pruned?: number
  generated?: number
  pseudocodeLine?: number
  stack?: StackFrame[]
  bestCostSoFar?: number
  bestRouteSoFar?: number[]
}

export interface SolveOptions {
  animated?: boolean
  timeoutMs?: number
  signal?: AbortSignal
}

export interface AlgorithmResult {
  algorithm: AlgorithmName
  route: number[]
  cost: number
  events: AlgorithmEvent[]
  generated: number
  explored: number
  pruned: number
  duration: number
  timedOut?: boolean
  cancelled?: boolean
  statusMessage?: string
}
