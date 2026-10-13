export type AlgorithmName = 'backtracking' | 'lcbb' | 'held-karp'

export type EventType =
  | 'START'
  | 'NODE_GENERATED'
  | 'NODE_EXPANDING'
  | 'EDGE_SELECTED'
  | 'EDGE_REJECTED'
  | 'BOUND_COMPUTED'
  | 'NODE_PRUNED'
  | 'BEST_SOLUTION_FOUND'
  | 'DP_CELL_COMPUTED'
  | 'TRACEBACK_STEP'
  | 'BACKTRACK'
  | 'QUEUE_UPDATED'
  | 'FINISHED'

export type Matrix = number[][]

export interface LCBBTreeNode {
  id: number
  parentId: number | null
  city: number
  path: number[]
  bound: number
  depth: number
  status: 'active' | 'expanded' | 'pruned' | 'solution'
  reducedMatrix?: Matrix
  rowReductions?: number[]
  colReductions?: number[]
  reductionSum?: number
  pruneReason?: string
}

export interface HeapItem {
  id: number
  city: number
  path: number[]
  bound: number
  depth: number
}

export interface DPCandidate {
  from: number
  cost: number
  isMin: boolean
}

export interface DPCellInfo {
  mask: number
  maskBinary: string
  subsetCities: number[]
  end: number
  cost: number
  from?: number
  candidates?: DPCandidate[]
}

export interface AlgorithmEvent {
  type: EventType
  message: string
  path?: number[]
  current?: number
  cost?: number
  bound?: number
  explored?: number
  pruned?: number
  generated?: number
  pseudocodeLine?: number
  // Backtracking specific
  stack?: Array<{ city: number; depth: number; cost: number }>
  // LCBB specific
  nodeId?: number
  treeNode?: LCBBTreeNode
  queue?: HeapItem[]
  matrixSnapshot?: Matrix
  rowReductions?: number[]
  colReductions?: number[]
  reductionSum?: number
  // Held-Karp specific
  cell?: DPCellInfo
  dpTableSnapshot?: Record<string, number>
  // Playback snapshot fields
  bestCostSoFar?: number
  bestRouteSoFar?: number[]
  visibleNodes?: LCBBTreeNode[]
  visibleDPStates?: DPCellInfo[]
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
  dpStates: number
  duration: number
  rootBound?: number
  rootRowReduction?: number
  rootColReduction?: number
  allNodes?: LCBBTreeNode[] // Complete tree nodes for LCBB inspector
  timedOut?: boolean
  cancelled?: boolean
  statusMessage?: string
}

