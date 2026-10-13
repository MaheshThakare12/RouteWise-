import { AlgorithmEvent, AlgorithmResult, HeapItem, LCBBTreeNode, Matrix, SolveOptions } from './types'
import { cloneMatrix, routeCost } from './matrix-utils'

const INF = 1e9

export interface ReductionResult {
  matrix: Matrix
  rowReductions: number[]
  colReductions: number[]
  rowSum: number
  colSum: number
  totalReduction: number
}

export function reduceMatrix(input: Matrix): ReductionResult {
  const n = input.length
  const matrix = cloneMatrix(input)
  const rowReductions = new Array(n).fill(0)
  const colReductions = new Array(n).fill(0)
  let rowSum = 0
  let colSum = 0

  // 1. Row reduction
  for (let i = 0; i < n; i++) {
    let minVal = INF
    for (let j = 0; j < n; j++) {
      if (matrix[i][j] < minVal) {
        minVal = matrix[i][j]
      }
    }
    if (minVal > 0 && minVal < INF) {
      rowReductions[i] = minVal
      rowSum += minVal
      for (let j = 0; j < n; j++) {
        if (matrix[i][j] < INF) {
          matrix[i][j] -= minVal
        }
      }
    }
  }

  // 2. Column reduction
  for (let j = 0; j < n; j++) {
    let minVal = INF
    for (let i = 0; i < n; i++) {
      if (matrix[i][j] < minVal) {
        minVal = matrix[i][j]
      }
    }
    if (minVal > 0 && minVal < INF) {
      colReductions[j] = minVal
      colSum += minVal
      for (let i = 0; i < n; i++) {
        if (matrix[i][j] < INF) {
          matrix[i][j] -= minVal
        }
      }
    }
  }

  return {
    matrix,
    rowReductions,
    colReductions,
    rowSum,
    colSum,
    totalReduction: rowSum + colSum
  }
}

// Binary Min-Heap with stable tie-breaking:
// 1. Lower bound (ascending)
// 2. Depth (descending - prefer deeper search nodes)
// 3. ID (ascending - FIFO deterministic tie-break)
class MinHeap {
  private data: HeapItem[] = []

  size(): number {
    return this.data.length
  }

  getItems(): HeapItem[] {
    return this.data.map(item => ({ ...item }))
  }

  push(item: HeapItem) {
    this.data.push({ ...item })
    this.bubbleUp(this.data.length - 1)
  }

  pop(): HeapItem | undefined {
    if (this.data.length === 0) return undefined
    const top = this.data[0]
    const bottom = this.data.pop()!
    if (this.data.length > 0) {
      this.data[0] = bottom
      this.bubbleDown(0)
    }
    return top
  }

  private compare(a: HeapItem, b: HeapItem): number {
    if (Math.abs(a.bound - b.bound) > 1e-6) {
      return a.bound - b.bound
    }
    if (a.depth !== b.depth) {
      return b.depth - a.depth // Deeper first
    }
    return a.id - b.id
  }

  private bubbleUp(index: number) {
    let curr = index
    while (curr > 0) {
      const parent = Math.floor((curr - 1) / 2)
      if (this.compare(this.data[curr], this.data[parent]) < 0) {
        const temp = this.data[curr]
        this.data[curr] = this.data[parent]
        this.data[parent] = temp
        curr = parent
      } else {
        break
      }
    }
  }

  private bubbleDown(index: number) {
    let curr = index
    const len = this.data.length
    while (true) {
      let smallest = curr
      const left = 2 * curr + 1
      const right = 2 * curr + 2

      if (left < len && this.compare(this.data[left], this.data[smallest]) < 0) {
        smallest = left
      }
      if (right < len && this.compare(this.data[right], this.data[smallest]) < 0) {
        smallest = right
      }

      if (smallest !== curr) {
        const temp = this.data[curr]
        this.data[curr] = this.data[smallest]
        this.data[smallest] = temp
        curr = smallest
      } else {
        break
      }
    }
  }
}

export function solveLCBB(originalMatrix: Matrix, start = 0, options?: SolveOptions): AlgorithmResult {
  const started = performance.now()
  const n = originalMatrix.length
  const timeoutMs = options?.timeoutMs ?? 5000
  const isAnimated = options?.animated ?? (n <= 8)
  let timedOut = false
  let cancelled = false
  const events: AlgorithmEvent[] = []
  const allNodes: LCBBTreeNode[] = []
  const nodeMap = new Map<number, LCBBTreeNode>()

  const snapshotNodes = (): LCBBTreeNode[] => allNodes.map(node => ({ ...node }))

  let nextId = 1
  let explored = 0
  let generated = 0
  let pruned = 0
  let bestCost = Infinity
  let bestRoute: number[] = []

  // 1. Prepare initial matrix: set diagonal to infinity
  const rootInput = cloneMatrix(originalMatrix)
  for (let i = 0; i < n; i++) {
    rootInput[i][i] = INF
  }

  // 2. Root reduction
  const rootReduction = reduceMatrix(rootInput)
  const rootBound = rootReduction.totalReduction

  const rootNode: LCBBTreeNode = {
    id: nextId++,
    parentId: null,
    city: start,
    path: [start],
    bound: rootBound,
    depth: 0,
    status: 'active',
    reducedMatrix: rootReduction.matrix,
    rowReductions: rootReduction.rowReductions,
    colReductions: rootReduction.colReductions,
    reductionSum: rootReduction.totalReduction
  }

  allNodes.push(rootNode)
  nodeMap.set(rootNode.id, rootNode)
  generated++

  const heap = new MinHeap()
  heap.push({
    id: rootNode.id,
    city: start,
    path: [start],
    bound: rootBound,
    depth: 0
  })

  events.push({
    type: 'START',
    message: `LCBB started. Root lower bound computed: ${rootBound} (row reductions: ${rootReduction.rowSum}, col reductions: ${rootReduction.colSum}).`,
    path: [start],
    current: start,
    bound: rootBound,
    cost: 0,
    nodeId: rootNode.id,
    treeNode: { ...rootNode },
    matrixSnapshot: rootReduction.matrix,
    rowReductions: rootReduction.rowReductions,
    colReductions: rootReduction.colReductions,
    reductionSum: rootReduction.totalReduction,
    queue: heap.getItems(),
    explored: 0,
    pruned: 0,
    generated: 1,
    bestCostSoFar: Infinity,
    bestRouteSoFar: []
  })

  const MAX_LCBB_GENERATED = isAnimated ? (n >= 10 ? 3000 : 50000) : (n >= 10 ? 35000 : 50000)
  let limitReason: 'timeout' | 'node_budget' | null = null

  while (heap.size() > 0) {
    if (options?.signal?.aborted) {
      cancelled = true
      break
    }
    if (performance.now() - started > timeoutMs) {
      timedOut = true
      limitReason = 'timeout'
      break
    }
    if (generated >= MAX_LCBB_GENERATED) {
      timedOut = true
      limitReason = 'node_budget'
      break
    }
    const currentItem = heap.pop()!
    const currentNode = nodeMap.get(currentItem.id)!

    // Bounding check on extraction
    if (currentNode.bound >= bestCost) {
      currentNode.status = 'pruned'
      currentNode.pruneReason = `Lower bound ${currentNode.bound} ≥ incumbent optimal ${bestCost}`
      pruned++
      if (isAnimated) {
        events.push({
          type: 'NODE_PRUNED',
          message: `Pruned Node #${currentNode.id} (prefix: ${currentNode.path.map(c => `C${c + 1}`).join('→')}): bound ${currentNode.bound} ≥ best ${bestCost}.`,
          path: currentNode.path,
          current: currentNode.city,
          bound: currentNode.bound,
          nodeId: currentNode.id,
          treeNode: { ...currentNode },
          queue: heap.getItems(),
          explored,
          pruned,
          generated,
          bestCostSoFar: bestCost,
          bestRouteSoFar: [...bestRoute]
        })
      } else {
        nodeMap.delete(currentItem.id)
      }
      continue
    }

    // Node is popped from queue, now actively expanding
    currentNode.status = 'expanded'
    explored++

    if (isAnimated) {
      events.push({
        type: 'NODE_EXPANDING',
        message: `Expanding Node #${currentNode.id} (city C${currentNode.city + 1}, path length ${currentNode.path.length}, bound ${currentNode.bound}).`,
        path: currentNode.path,
        current: currentNode.city,
        bound: currentNode.bound,
        cost: routeCost(currentNode.path, originalMatrix),
        nodeId: currentNode.id,
        treeNode: { ...currentNode },
        matrixSnapshot: currentNode.reducedMatrix,
        queue: heap.getItems(),
        explored,
        pruned,
        generated,
        bestCostSoFar: bestCost,
        bestRouteSoFar: [...bestRoute]
      })
    }

    // If path length is n, we visited all cities. Now close tour back to start.
    if (currentNode.path.length === n) {
      const completeTour = [...currentNode.path, start]
      const actualCost = routeCost(completeTour, originalMatrix)

      currentNode.status = 'solution'
      if (isAnimated) {
        events.push({
          type: 'BOUND_COMPUTED',
          message: `Complete tour formed at Node #${currentNode.id}: ${completeTour.map(c => `C${c + 1}`).join(' → ')} with actual cost ${actualCost}.`,
          path: completeTour,
          current: start,
          cost: actualCost,
          bound: currentNode.bound,
          nodeId: currentNode.id,
          treeNode: { ...currentNode },
          queue: heap.getItems(),
          explored,
          pruned,
          generated,
          bestCostSoFar: bestCost,
          bestRouteSoFar: [...bestRoute]
        })
      }

      if (actualCost < bestCost) {
        bestCost = actualCost
        bestRoute = completeTour
        events.push({
          type: 'BEST_SOLUTION_FOUND',
          message: `New best solution discovered: cost = ${bestCost} (${bestRoute.map(c => `C${c + 1}`).join(' → ')}).`,
          path: bestRoute,
          current: start,
          cost: bestCost,
          bound: currentNode.bound,
          nodeId: currentNode.id,
          treeNode: isAnimated ? { ...currentNode } : undefined,
          queue: isAnimated ? heap.getItems() : [],
          explored,
          pruned,
          generated,
          bestCostSoFar: bestCost,
          bestRouteSoFar: [...bestRoute],
          visibleNodes: isAnimated ? snapshotNodes() : undefined
        })
      }
      if (!isAnimated) {
        nodeMap.delete(currentItem.id)
      }
      continue
    }

    // Branch to all unvisited cities
    const u = currentNode.city
    const parentMatrix = currentNode.reducedMatrix!

    for (let v = 0; v < n; v++) {
      if (!currentNode.path.includes(v)) {
        generated++
        const edgeReducedCost = parentMatrix[u][v]

        // Create child matrix
        const childMatrix = cloneMatrix(parentMatrix)

        // Set row u to infinity
        for (let col = 0; col < n; col++) {
          childMatrix[u][col] = INF
        }

        // Set col v to infinity
        for (let row = 0; row < n; row++) {
          childMatrix[row][v] = INF
        }

        // Prevent premature cycle back to start
        if (currentNode.path.length + 1 < n) {
          childMatrix[v][start] = INF
        }

        // Reduce the child matrix
        const reduction = reduceMatrix(childMatrix)
        const childBound = currentNode.bound + (edgeReducedCost < INF ? edgeReducedCost : 0) + reduction.totalReduction

        const childNode: LCBBTreeNode = {
          id: nextId++,
          parentId: currentNode.id,
          city: v,
          path: [...currentNode.path, v],
          bound: childBound,
          depth: currentNode.depth + 1,
          status: 'active',
          reducedMatrix: reduction.matrix,
          rowReductions: reduction.rowReductions,
          colReductions: reduction.colReductions,
          reductionSum: reduction.totalReduction
        }

        if (isAnimated) {
          allNodes.push(childNode)
        }
        nodeMap.set(childNode.id, childNode)

        if (isAnimated) {
          events.push({
            type: 'NODE_GENERATED',
            message: `Generated child Node #${childNode.id} (transition C${u + 1} → C${v + 1}): reduced edge = ${edgeReducedCost}, penalty = ${reduction.totalReduction}, child bound = ${childBound}.`,
            path: childNode.path,
            current: v,
            bound: childBound,
            nodeId: childNode.id,
            treeNode: { ...childNode },
            matrixSnapshot: reduction.matrix,
            rowReductions: reduction.rowReductions,
            colReductions: reduction.colReductions,
            reductionSum: reduction.totalReduction,
            queue: heap.getItems(),
            explored,
            pruned,
            generated,
            bestCostSoFar: bestCost,
            bestRouteSoFar: [...bestRoute]
          })
        }

        if (childBound >= bestCost) {
          childNode.status = 'pruned'
          childNode.pruneReason = `Bound ${childBound} ≥ incumbent best ${bestCost}`
          pruned++
          if (isAnimated) {
            events.push({
              type: 'NODE_PRUNED',
              message: `Pruning child Node #${childNode.id}: bound ${childBound} ≥ incumbent ${bestCost}. Not enqueued.`,
              path: childNode.path,
              current: v,
              bound: childBound,
              nodeId: childNode.id,
              treeNode: { ...childNode },
              queue: heap.getItems(),
              explored,
              pruned,
              generated,
              bestCostSoFar: bestCost,
              bestRouteSoFar: [...bestRoute]
            })
          } else {
            nodeMap.delete(childNode.id)
          }
        } else {
          heap.push({
            id: childNode.id,
            city: v,
            path: childNode.path,
            bound: childBound,
            depth: childNode.depth
          })

          if (isAnimated) {
            events.push({
              type: 'QUEUE_UPDATED',
              message: `Enqueued Node #${childNode.id} into min-heap with lower bound ${childBound}.`,
              path: childNode.path,
              current: v,
              bound: childBound,
              nodeId: childNode.id,
              treeNode: { ...childNode },
              queue: heap.getItems(),
              explored,
              pruned,
              generated,
              bestCostSoFar: bestCost,
              bestRouteSoFar: [...bestRoute]
            })
          }
        }
      }
    }

    if (!isAnimated) {
      nodeMap.delete(currentItem.id)
    }
  }

  const duration = performance.now() - started

  if (timedOut) {
    const reasonText =
      limitReason === 'node_budget'
        ? `search node budget (${MAX_LCBB_GENERATED.toLocaleString()} generated nodes) reached`
        : `${timeoutMs}ms time limit reached`
    events.push({
      type: 'FINISHED',
      message: `LCBB terminated early (${reasonText}). Optimality not proven.`,
      path: [start],
      current: start,
      cost: Infinity,
      bound: Infinity,
      queue: [],
      explored,
      pruned,
      generated,
      bestCostSoFar: Infinity,
      bestRouteSoFar: []
    })
  } else if (cancelled) {
    events.push({
      type: 'FINISHED',
      message: `LCBB cancelled before completion. Optimality not proven.`,
      path: [start],
      current: start,
      cost: Infinity,
      bound: Infinity,
      queue: [],
      explored,
      pruned,
      generated,
      bestCostSoFar: Infinity,
      bestRouteSoFar: []
    })
  } else {
    events.push({
      type: 'FINISHED',
      message: `LCBB execution complete. Optimal cost: ${bestCost}. Generated: ${generated}, Explored: ${explored}, Pruned: ${pruned}.`,
      path: bestRoute,
      current: start,
      cost: bestCost,
      bound: bestCost,
      queue: [],
      explored,
      pruned,
      generated,
      bestCostSoFar: bestCost,
      bestRouteSoFar: [...bestRoute]
    })
  }

  return {
    algorithm: 'lcbb',
    route: timedOut || cancelled ? [] : bestRoute,
    cost: timedOut || cancelled ? Infinity : bestCost,
    events,
    generated,
    explored,
    pruned,
    dpStates: 0,
    duration,
    rootBound,
    rootRowReduction: rootReduction.rowSum,
    rootColReduction: rootReduction.colSum,
    allNodes,
    timedOut,
    cancelled,
    statusMessage: timedOut
      ? limitReason === 'node_budget'
        ? `Timed out (node limit ${MAX_LCBB_GENERATED.toLocaleString()} reached)`
        : `Timed out (>${timeoutMs}ms)`
      : cancelled
      ? 'Cancelled'
      : undefined
  }
}
