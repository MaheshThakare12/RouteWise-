'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AlgorithmEvent, AlgorithmResult, LCBBTreeNode } from '@/lib/algorithms/types'
import {
  GitBranch,
  ListFilter,
  Table,
  Calculator,
  ArrowUpDown,
  Scissors,
  CheckCircle2,
  Sparkles
} from 'lucide-react'

interface LCBBInspectorProps {
  result: AlgorithmResult
  event: AlgorithmEvent
  names: string[]
  cursor?: number
  start?: number
  onSelectNodePrefix?: (prefix: number[] | null, prunedEdges?: Array<[number, number]>) => void
}

export function LCBBInspector({
  result,
  event,
  names,
  cursor = 0,
  start = 0,
  onSelectNodePrefix
}: LCBBInspectorProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)
  const treeScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setSelectedNodeId(null)
  }, [cursor, start, result])

  // Precompute lightweight periodic checkpoints (every 25 events) once when result changes
  const CHECKPOINT_INTERVAL = 25
  const checkpoints = useMemo(() => {
    const total = result.events.length
    if (total === 0) return []

    const list: Array<{
      eventIndex: number
      generatedNodeIds: Set<number>
      statusMap: Map<number, 'active' | 'expanded' | 'pruned' | 'solution'>
    }> = []

    const curGen = new Set<number>([1])
    const curStatus = new Map<number, 'active' | 'expanded' | 'pruned' | 'solution'>([
      [1, 'active']
    ])

    for (let i = 0; i < total; i++) {
      const e = result.events[i]
      if (e.nodeId) curGen.add(e.nodeId)
      if (e.type === 'NODE_GENERATED' && e.nodeId) curStatus.set(e.nodeId, 'active')
      else if (e.type === 'NODE_EXPANDING' && e.nodeId) curStatus.set(e.nodeId, 'expanded')
      else if (e.type === 'NODE_PRUNED' && e.nodeId) curStatus.set(e.nodeId, 'pruned')
      else if (e.type === 'BOUND_COMPUTED' && e.nodeId) curStatus.set(e.nodeId, 'solution')

      if (i % CHECKPOINT_INTERVAL === 0 || i === total - 1) {
        list.push({
          eventIndex: i,
          generatedNodeIds: new Set(curGen),
          statusMap: new Map(curStatus)
        })
      }
    }
    return list
  }, [result.events])

  // Replay from nearest checkpoint: strictly bounded to at most 24 delta events
  const allNodes = useMemo(() => {
    const all = result.allNodes || []
    if (all.length === 0 || checkpoints.length === 0) return []

    const targetCursor = cursor ?? 0
    const cpIndex = Math.min(
      Math.floor(targetCursor / CHECKPOINT_INTERVAL),
      checkpoints.length - 1
    )
    const cp = checkpoints[cpIndex]

    const gen = new Set(cp.generatedNodeIds)
    const stat = new Map(cp.statusMap)

    for (let i = cp.eventIndex + 1; i <= targetCursor && i < result.events.length; i++) {
      const e = result.events[i]
      if (e.nodeId) gen.add(e.nodeId)
      if (e.type === 'NODE_GENERATED' && e.nodeId) stat.set(e.nodeId, 'active')
      else if (e.type === 'NODE_EXPANDING' && e.nodeId) stat.set(e.nodeId, 'expanded')
      else if (e.type === 'NODE_PRUNED' && e.nodeId) stat.set(e.nodeId, 'pruned')
      else if (e.type === 'BOUND_COMPUTED' && e.nodeId) stat.set(e.nodeId, 'solution')
    }

    return all
      .filter(n => gen.has(n.id))
      .map(n => {
        const currentStatus = stat.get(n.id) || 'active'
        return {
          ...n,
          status: currentStatus,
          pruneReason: currentStatus === 'pruned' ? n.pruneReason : undefined
        }
      })
  }, [result.allNodes, result.events, checkpoints, cursor])

  // Find which node is currently expanding at this exact playback step
  const expandingNodeId = useMemo(() => {
    const target = Math.min(cursor, result.events.length - 1)
    const curEv = result.events[target]
    if (!curEv || curEv.type === 'FINISHED' || curEv.type === 'START') return null

    let candidateId: number | null = null
    for (let i = target; i >= 0; i--) {
      const e = result.events[i]
      if (e.type === 'NODE_EXPANDING' && e.nodeId) {
        candidateId = e.nodeId
        break
      }
    }
    if (!candidateId) return null

    // If current event is NODE_PRUNED popped directly from the heap (not a child of candidateId), no node is expanding
    if (
      curEv.type === 'NODE_PRUNED' &&
      curEv.treeNode &&
      curEv.treeNode.parentId !== candidateId
    ) {
      return null
    }
    return candidateId
  }, [result.events, cursor])

  // Determine nodes belonging to the incumbent / final optimal tour path
  const optimalPathNodeIds = useMemo(() => {
    const bestTour = event?.bestRouteSoFar || []
    if (bestTour.length < 2) return new Set<number>()
    const tourWithoutClose = bestTour.slice(0, -1)
    const ids = new Set<number>()
    for (const nd of allNodes) {
      if (
        nd.path.length <= tourWithoutClose.length &&
        nd.path.every((c, idx) => c === tourWithoutClose[idx])
      ) {
        ids.add(nd.id)
      }
    }
    return ids
  }, [allNodes, event?.bestRouteSoFar])

  // Sort visible live priority queue entries by increasing lower bound
  const sortedQueue = useMemo(() => {
    const raw = event?.queue || []
    return [...raw].sort((a, b) => {
      if (Math.abs(a.bound - b.bound) > 1e-6) return a.bound - b.bound
      if (a.depth !== b.depth) return b.depth - a.depth
      return a.id - b.id
    })
  }, [event?.queue])

  const liveQueueIds = useMemo(() => new Set(sortedQueue.map(q => q.id)), [sortedQueue])

  const currentNodeId = event?.nodeId || expandingNodeId || (allNodes[0]?.id ?? 1)
  const activeNode = useMemo(() => {
    if (selectedNodeId) {
      const found = allNodes.find(n => n.id === selectedNodeId)
      if (found) return found
    }
    return (
      allNodes.find(n => n.id === currentNodeId) ||
      event?.treeNode ||
      allNodes[0] ||
      null
    )
  }, [selectedNodeId, allNodes, currentNodeId, event?.treeNode])

  const parentNode = useMemo(() => {
    if (!activeNode?.parentId) return null
    return (
      allNodes.find(n => n.id === activeNode.parentId) ||
      result.allNodes?.find(n => n.id === activeNode.parentId) ||
      null
    )
  }, [activeNode, allNodes, result.allNodes])

  // Compute pruned edges up to cursor for RouteMap synchronization
  const prunedEdges = useMemo(() => {
    const edges: Array<[number, number]> = []
    for (const nd of allNodes) {
      if (nd.status === 'pruned' && nd.path.length >= 2) {
        const u = nd.path[nd.path.length - 2]
        const v = nd.path[nd.path.length - 1]
        edges.push([u, v])
      }
    }
    return edges
  }, [allNodes])

  const handleSelectNode = (nodeId: number) => {
    setSelectedNodeId(nodeId)
    const target = allNodes.find(n => n.id === nodeId)
    if (target) {
      onSelectNodePrefix?.(target.path, prunedEdges)
    }
  }

  // Compute 2D hierarchical coordinates for the SVG state-space tree
  const treeLayout = useMemo(() => {
    if (allNodes.length === 0) {
      return { nodes: [], edges: [], width: 520, height: 340, activePos: null }
    }

    const byDepth = new Map<number, LCBBTreeNode[]>()
    let maxDepth = 0
    for (const nd of allNodes) {
      maxDepth = Math.max(maxDepth, nd.depth)
      const list = byDepth.get(nd.depth) || []
      list.push(nd)
      byDepth.set(nd.depth, list)
    }

    // Order nodes at each depth by parent position so edges do not cross unnecessarily
    const posMap = new Map<number, { x: number; y: number; node: LCBBTreeNode }>()
    let maxRowLen = 1
    byDepth.forEach(list => {
      maxRowLen = Math.max(maxRowLen, list.length)
    })

    const colSpacing = 78
    const rowSpacing = 74
    const width = Math.max(500, maxRowLen * colSpacing + 70)
    const height = Math.max(330, (maxDepth + 1) * rowSpacing + 60)

    for (let d = 0; d <= maxDepth; d++) {
      const group = byDepth.get(d) || []
      if (d > 0) {
        group.sort((a, b) => {
          const pa = a.parentId ? posMap.get(a.parentId)?.x ?? 0 : 0
          const pb = b.parentId ? posMap.get(b.parentId)?.x ?? 0 : 0
          if (pa !== pb) return pa - pb
          return a.id - b.id
        })
      }
      const rowWidth = (group.length - 1) * colSpacing
      const startX = width / 2 - rowWidth / 2
      const y = 38 + d * rowSpacing
      group.forEach((nd, idx) => {
        posMap.set(nd.id, {
          x: startX + idx * colSpacing,
          y,
          node: nd
        })
      })
    }

    const edges: Array<{
      id: string
      x1: number
      y1: number
      x2: number
      y2: number
      child: LCBBTreeNode
      isOptimalEdge: boolean
    }> = []

    posMap.forEach(({ x, y, node }) => {
      if (node.parentId && posMap.has(node.parentId)) {
        const p = posMap.get(node.parentId)!
        edges.push({
          id: `${node.parentId}->${node.id}`,
          x1: p.x,
          y1: p.y,
          x2: x,
          y2: y,
          child: node,
          isOptimalEdge:
            optimalPathNodeIds.has(node.id) && optimalPathNodeIds.has(node.parentId)
        })
      }
    })

    const activePos = activeNode ? posMap.get(activeNode.id) || null : null

    return {
      nodes: Array.from(posMap.values()),
      edges,
      width,
      height,
      activePos
    }
  }, [allNodes, optimalPathNodeIds, activeNode])

  // Auto-scroll SVG state-space tree to active/selected node
  useEffect(() => {
    if (treeScrollRef.current && treeLayout.activePos) {
      const container = treeScrollRef.current
      const left = Math.max(0, treeLayout.activePos.x - container.clientWidth / 2)
      const top = Math.max(0, treeLayout.activePos.y - container.clientHeight / 2)
      container.scrollTo({ left, top, behavior: 'smooth' })
    }
  }, [treeLayout.activePos, cursor])

  const matrixSnapshot = activeNode?.reducedMatrix || event?.matrixSnapshot
  const rowReductions = activeNode?.rowReductions || event?.rowReductions || []
  const colReductions = activeNode?.colReductions || event?.colReductions || []
  const rowRedSum = rowReductions.reduce((a, b) => a + (b < 1e8 ? b : 0), 0)
  const colRedSum = colReductions.reduce((a, b) => a + (b < 1e8 ? b : 0), 0)
  const totalReduction = activeNode?.reductionSum ?? rowRedSum + colRedSum

  // Exact lower-bound arithmetic breakdown from actual matrix reduction
  const parentBound = parentNode?.bound ?? 0
  const edgeReducedCost = useMemo(() => {
    if (!activeNode || !parentNode) return 0
    if (parentNode.reducedMatrix) {
      const raw = parentNode.reducedMatrix[parentNode.city]?.[activeNode.city]
      if (raw !== undefined && raw < 1e8) return raw
    }
    return Math.max(0, activeNode.bound - parentBound - totalReduction)
  }, [activeNode, parentNode, parentBound, totalReduction])

  const bestTourCost =
    cursor >= result.events.length - 1 && (result.timedOut || result.cancelled)
      ? result.timedOut
        ? 'Timed out'
        : 'Cancelled'
      : event?.bestCostSoFar !== undefined && event.bestCostSoFar < Infinity
      ? event.bestCostSoFar
      : '∞'

  const expandingNode = allNodes.find(n => n.id === expandingNodeId) || null

  return (
    <div className="space-y-4">
      {/* TOP ROW — 5 LCBB OPTIMIZATION METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Nodes Generated
          </span>
          <strong className="text-lg font-mono font-extrabold text-slate-900">
            {event?.generated ?? 1}
          </strong>
        </div>
        <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
            Nodes Expanded
          </span>
          <strong className="text-lg font-mono font-extrabold text-amber-700">
            {event?.explored ?? 0}
          </strong>
        </div>
        <div className="p-2.5 bg-red-50/40 border border-red-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block">
            Nodes Pruned
          </span>
          <strong className="text-lg font-mono font-extrabold text-red-600">
            {event?.pruned ?? 0}
          </strong>
        </div>
        <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
            Best Actual Tour Cost
          </span>
          <strong className="text-lg font-mono font-extrabold text-blue-700">
            {bestTourCost}
          </strong>
        </div>
        <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
            Live Priority-Queue Size
          </span>
          <strong className="text-lg font-mono font-extrabold text-emerald-700">
            {sortedQueue.length} open
          </strong>
        </div>
      </div>

      {/* MAIN AREA — THREE-PANEL LOGISTICS CONSOLE (30% Queue | 45% SVG Tree | 25% Reduced Matrix) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-stretch">
        {/* LEFT PANEL (~30%, 3.5 cols -> xl:col-span-4): Genuine Min-Heap Priority Queue */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ListFilter size={14} className="text-emerald-600" /> Min-Heap Priority Queue ({sortedQueue.length})
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Sorted by increasing lower bound. Click an entry to inspect.
                </p>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                Best-First
              </span>
            </div>

            {/* Active Expanding Node Popped from Queue Banner */}
            {expandingNode && (
              <button
                type="button"
                onClick={() => handleSelectNode(expandingNode.id)}
                className={`w-full text-left mb-2.5 p-2 rounded-lg border transition-all ${
                  activeNode?.id === expandingNode.id
                    ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-500/40'
                    : 'bg-amber-50 border-amber-300 hover:bg-amber-100/60'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-900 mb-0.5">
                  <span className="flex items-center gap-1">
                    <ArrowUpDown size={11} className="text-amber-700" /> Currently Expanding (Popped Min)
                  </span>
                  <span className="font-mono bg-amber-200/80 px-1.5 py-0.2 rounded text-amber-950">
                    LB = {expandingNode.bound}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-900 font-semibold">
                  <span>
                    Node #{expandingNode.id} • City C{expandingNode.city + 1} (d={expandingNode.depth})
                  </span>
                  <span className="font-mono text-[11px] text-amber-900">
                    {expandingNode.path.map(c => `C${c + 1}`).join('→')}
                  </span>
                </div>
              </button>
            )}

            {/* Queue Operation Indicator */}
            <div className="mb-2 px-2 py-1 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
              <span className="font-medium">Queue Event:</span>
              <span className="font-mono font-semibold text-slate-800">
                {event?.type === 'QUEUE_UPDATED'
                  ? `Inserted Node #${event.nodeId} (LB=${event.bound})`
                  : event?.type === 'NODE_EXPANDING'
                  ? `Popped Node #${event.nodeId} (Min LB=${event.bound})`
                  : event?.type === 'NODE_PRUNED'
                  ? `Rejected Node #${event.nodeId} (LB=${event.bound})`
                  : event?.type || 'IDLE'}
              </span>
            </div>

            {/* Live Min-Heap Entries */}
            <div className="space-y-1.5 max-h-[290px] overflow-y-auto pr-1">
              {sortedQueue.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 border border-slate-100 rounded text-xs text-slate-400 italic">
                  Live min-heap priority queue is empty.
                </div>
              ) : (
                sortedQueue.map((item, idx) => {
                  const isNextToExpand = idx === 0
                  const isSelected = activeNode?.id === item.id
                  return (
                    <button
                      key={`${item.id}-${idx}`}
                      type="button"
                      onClick={() => handleSelectNode(item.id)}
                      className={`w-full text-left p-2 rounded-lg border text-xs transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/30 font-semibold'
                          : isNextToExpand
                          ? 'bg-emerald-50/60 border-emerald-300 text-slate-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              isNextToExpand
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isNextToExpand ? 'MIN #1' : `#${idx + 1}`}
                          </span>
                          <strong className="text-slate-900">
                            Node #{item.id} (City C{item.city + 1})
                          </strong>
                        </div>
                        <span className="font-mono font-extrabold text-emerald-700 text-xs">
                          LB: {item.bound}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span className="truncate">
                          Prefix: {item.path.map(c => `C${c + 1}`).join(' → ')}
                        </span>
                        <span className="flex-none ml-2">depth={item.depth}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Heap Ordering: (1) Min Bound, (2) Max Depth, (3) FIFO ID</span>
          </div>
        </div>

        {/* CENTER PANEL (~45%, xl:col-span-5): Interactive Bound-Labelled SVG State-Space Tree */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-3 flex flex-col">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 mb-2 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch size={14} className="text-amber-600" /> Bound-Labelled State-Space Tree
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Click any node to inspect its reduced cost matrix ({allNodes.length} nodes).
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-600 flex-wrap">
              <span className="flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Promising
              </span>
              <span className="flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Expanding
              </span>
              <span className="flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Pruned
              </span>
              <span className="flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Optimal Path
              </span>
            </div>
          </div>

          <div
            ref={treeScrollRef}
            className="flex-1 overflow-auto border border-slate-100 rounded bg-slate-50/50 min-h-[340px] max-h-[420px]"
          >
            <svg
              width={treeLayout.width}
              height={treeLayout.height}
              viewBox={`0 0 ${treeLayout.width} ${treeLayout.height}`}
              className="block mx-auto"
            >
              {/* Parent-Child Tree Edges */}
              <g>
                {treeLayout.edges.map(edge => {
                  const isExpandingChild = edge.child.id === expandingNodeId
                  let stroke = '#cbd5e1'
                  let strokeWidth = 1.5
                  let dash = undefined

                  if (edge.isOptimalEdge) {
                    stroke = '#2563eb'
                    strokeWidth = 2.5
                  } else if (isExpandingChild) {
                    stroke = '#d97706'
                    strokeWidth = 2.4
                  } else if (edge.child.status === 'pruned') {
                    stroke = '#ef4444'
                    strokeWidth = 1.5
                    dash = '4 3'
                  } else if (liveQueueIds.has(edge.child.id)) {
                    stroke = '#16a34a'
                    strokeWidth = 1.9
                  }

                  return (
                    <line
                      key={edge.id}
                      x1={edge.x1}
                      y1={edge.y1}
                      x2={edge.x2}
                      y2={edge.y2}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      strokeDasharray={dash}
                    />
                  )
                })}
              </g>

              {/* Tree Vertex Nodes */}
              <g>
                {treeLayout.nodes.map(({ x, y, node }) => {
                  const isSelected = activeNode?.id === node.id
                  const isExpanding = node.id === expandingNodeId
                  const isLiveInQueue = liveQueueIds.has(node.id)
                  const isOptimalNode = optimalPathNodeIds.has(node.id)

                  // Color coding per Section 2 specification:
                  // Amber = expanding node; Green = promising/live node; Red = pruned; Blue = optimal path; Slate = expanded
                  let fill = '#f8fafc'
                  let stroke = '#64748b'
                  let textColor = '#334155'

                  if (isExpanding) {
                    fill = '#fef3c7'
                    stroke = '#d97706'
                    textColor = '#92400e'
                  } else if (node.status === 'pruned') {
                    fill = '#fef2f2'
                    stroke = '#dc2626'
                    textColor = '#991b1b'
                  } else if (isOptimalNode || node.status === 'solution') {
                    fill = '#eff6ff'
                    stroke = '#2563eb'
                    textColor = '#1e3a8a'
                  } else if (isLiveInQueue) {
                    fill = '#f0fdf4'
                    stroke = '#16a34a'
                    textColor = '#14532d'
                  }

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${x}, ${y})`}
                      onClick={() => handleSelectNode(node.id)}
                      className="cursor-pointer"
                    >
                      <title>{`Node #${node.id} | City C${node.city + 1} | Lower Bound: ${node.bound} | Prefix: ${node.path.map(c => `C${c + 1}`).join('→')}`}</title>

                      {isSelected && (
                        <rect
                          x="-31"
                          y="-22"
                          width="62"
                          height="44"
                          rx="10"
                          fill="none"
                          stroke="#1d4ed8"
                          strokeWidth="2"
                          strokeDasharray="3 2"
                        />
                      )}

                      <rect
                        x="-27"
                        y="-18"
                        width="54"
                        height="36"
                        rx="8"
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isSelected || isExpanding ? 2.4 : 1.5}
                      />

                      <text
                        y="-5"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={textColor}
                        fontSize="9.5"
                        fontWeight="800"
                      >
                        #{node.id} C{node.city + 1}
                      </text>
                      <text
                        y="7"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={textColor}
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="700"
                      >
                        LB:{node.bound}
                      </text>
                    </g>
                  )
                })}
              </g>
            </svg>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
            <span>
              Selected: <strong>Node #{activeNode?.id ?? 1}</strong> (Prefix:{' '}
              <code className="font-mono text-blue-700 font-bold">
                {activeNode?.path.map(c => `C${c + 1}`).join(' → ')}
              </code>
              )
            </span>
            {selectedNodeId !== null && (
              <button
                type="button"
                onClick={() => {
                  setSelectedNodeId(null)
                  onSelectNodePrefix?.(null, prunedEdges)
                }}
                className="text-[11px] text-blue-600 hover:underline font-medium"
              >
                Follow live event node
              </button>
            )}
          </div>
        </div>

        {/* RIGHT PANEL (~25%, xl:col-span-3): Reduced Cost Matrix of Selected Tree Node */}
        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-lg p-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Table size={14} className="text-blue-600" /> Reduced Matrix (Node #{activeNode?.id ?? 1})
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {activeNode?.parentId
                    ? `Parent: Node #${activeNode.parentId} (C${(parentNode?.city ?? 0) + 1} → C${activeNode.city + 1})`
                    : 'Root Node #1 Initial Reduction'}
                </p>
              </div>
              <span className="text-xs font-mono font-extrabold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                LB = {activeNode?.bound ?? 0}
              </span>
            </div>

            {activeNode?.pruneReason && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 text-red-800 rounded text-[11px] flex items-center gap-1.5">
                <Scissors size={12} className="text-red-600 flex-none" />
                <span>
                  <strong>Pruned:</strong> {activeNode.pruneReason}
                </span>
              </div>
            )}

            {matrixSnapshot ? (
              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="text-[11px] border-collapse w-full font-mono">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-1 text-slate-500 text-center">From\To</th>
                      {matrixSnapshot.map((_, col) => (
                        <th
                          key={col}
                          className={`p-1 text-center ${
                            parentNode && col === activeNode?.city
                              ? 'bg-amber-100 text-amber-900 font-bold'
                              : 'text-slate-700'
                          }`}
                        >
                          C{col + 1}
                        </th>
                      ))}
                      <th className="p-1 text-blue-700 text-center bg-blue-50/70">rᵢ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrixSnapshot.map((row, r) => {
                      const isLockedRow = parentNode && r === parentNode.city
                      return (
                        <tr
                          key={r}
                          className={`border-b border-slate-100 ${
                            isLockedRow ? 'bg-amber-50/40' : ''
                          }`}
                        >
                          <td
                            className={`p-1 text-center font-bold ${
                              isLockedRow
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-50 text-slate-700'
                            }`}
                          >
                            C{r + 1}
                          </td>
                          {row.map((val, c) => {
                            const isInf = val >= 1e8
                            const isSelectedTransition =
                              parentNode && r === parentNode.city && c === activeNode?.city
                            const isForbiddenBackEdge =
                              parentNode &&
                              r === activeNode?.city &&
                              c === start &&
                              (activeNode?.path.length ?? 0) < names.length

                            return (
                              <td
                                key={c}
                                className={`p-1 text-center ${
                                  isSelectedTransition
                                    ? 'bg-amber-200 text-amber-950 font-extrabold ring-1 ring-amber-500'
                                    : isForbiddenBackEdge
                                    ? 'bg-red-50 text-red-600 font-bold'
                                    : isInf
                                    ? 'text-slate-300 bg-slate-50/60'
                                    : val === 0
                                    ? 'text-emerald-700 font-bold'
                                    : 'text-slate-800'
                                }`}
                                title={
                                  isSelectedTransition
                                    ? `Selected branch transition C${r + 1} → C${c + 1}`
                                    : isForbiddenBackEdge
                                    ? `Forbidden premature cycle C${r + 1} → C${c + 1}`
                                    : undefined
                                }
                              >
                                {isInf ? '∞' : val}
                              </td>
                            )
                          })}
                          <td
                            className={`p-1 text-center font-bold ${
                              (rowReductions[r] ?? 0) > 0
                                ? 'bg-blue-100/70 text-blue-900'
                                : 'bg-blue-50/30 text-slate-400'
                            }`}
                          >
                            {rowReductions[r] ?? 0}
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="bg-blue-50/60 font-bold text-blue-800">
                      <td className="p-1 text-center">cⱼ</td>
                      {matrixSnapshot.map((_, c) => (
                        <td
                          key={c}
                          className={`p-1 text-center ${
                            (colReductions[c] ?? 0) > 0 ? 'bg-blue-100 text-blue-900' : 'text-slate-400'
                          }`}
                        >
                          {colReductions[c] ?? 0}
                        </td>
                      ))}
                      <td className="p-1 text-center bg-blue-200/70 text-blue-950 font-extrabold">
                        Σ={totalReduction}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 text-center bg-slate-50 border border-slate-100 rounded text-xs text-slate-400 italic">
                Select a node in the tree or queue to inspect its reduced matrix.
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600 space-y-1">
            <div className="flex items-center justify-between">
              <span>Row Reductions (Σrᵢ):</span>
              <strong className="font-mono text-blue-700">{rowRedSum}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Col Reductions (Σcⱼ):</span>
              <strong className="font-mono text-blue-700">{colRedSum}</strong>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-1">
              <span className="font-semibold">Total Reduction Penalty:</span>
              <strong className="font-mono text-slate-900">{totalReduction}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION — STEP-BY-STEP REDUCTION EXPLANATION & LOWER-BOUND FORMULA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Exact Lower-Bound Formula & Step-by-Step Reduction Explanation */}
        <div className="lg:col-span-7 p-3.5 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator size={14} className="text-blue-600" /> Exact Lower-Bound & Matrix Reduction Breakdown (Node #{activeNode?.id ?? 1})
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              CO5 Branch & Bound
            </span>
          </div>

          {activeNode && !activeNode.parentId ? (
            <div className="space-y-2 text-xs text-slate-700">
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded font-mono text-blue-950 font-semibold">
                LB(Root #1) = Σ RowMin ({rowRedSum}) + Σ ColMin ({colRedSum}) = {activeNode.bound}
              </div>
              <p className="leading-relaxed">
                <strong>Step 1 (Row Reduction):</strong> Subtract the minimum entry of each row so every row contains at least one zero (sum of row minimums = <strong>{rowRedSum}</strong>).{' '}
                <strong>Step 2 (Column Reduction):</strong> Subtract the minimum of each column that still lacks a zero (sum of column minimums = <strong>{colRedSum}</strong>). Every complete tour must pay at least <strong>{activeNode.bound}</strong>.
              </p>
            </div>
          ) : activeNode && parentNode ? (
            <div className="space-y-2 text-xs text-slate-700">
              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded font-mono text-amber-950 font-semibold">
                LB(Node #{activeNode.id}) = LB(Parent #{parentNode.id}) [{parentBound}] + ReducedMatrix(C{parentNode.city + 1}, C{activeNode.city + 1}) [{edgeReducedCost}] + ReductionSum [{totalReduction}] = {activeNode.bound}
              </div>
              <p className="leading-relaxed">
                <strong>Transition C{parentNode.city + 1} → C{activeNode.city + 1}:</strong> Row <code>C{parentNode.city + 1}</code> and Column <code>C{activeNode.city + 1}</code> are set to <strong>∞</strong> (highlighted in amber), and the back-edge <code>C{activeNode.city + 1} → C{start + 1}</code> is blocked to prevent a premature subtour. Re-reducing the matrix yields row reductions of <strong>{rowRedSum}</strong> and column reductions of <strong>{colRedSum}</strong> (total penalty <strong>{totalReduction}</strong>).
              </p>
            </div>
          ) : null}
        </div>

        {/* Right: Best-First Selection & Pruning Rationale */}
        <div className="lg:col-span-5 p-3.5 bg-white border border-slate-200 rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-emerald-600" /> Why This Node Is Selected / Pruned
              </span>
              <span className="text-[10px] font-mono text-slate-500">{event?.type}</span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200">
              {event?.message}
            </p>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
            {sortedQueue.length > 0 ? (
              <span>
                <strong>Best-First Guarantee:</strong> Node <strong>#{sortedQueue[0].id}</strong> has the smallest live lower bound (<strong>LB = {sortedQueue[0].bound}</strong>) among all {sortedQueue.length} open nodes in the min-heap
                {sortedQueue.length > 1
                  ? ` (next best is Node #${sortedQueue[1].id} with LB = ${sortedQueue[1].bound})`
                  : ''}.
              </span>
            ) : (
              <span>
                <strong>Termination Guarantee:</strong> Priority queue is empty — all live branches with LB &lt; {bestTourCost} have been expanded or pruned.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
