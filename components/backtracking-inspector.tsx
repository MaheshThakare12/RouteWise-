'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AlgorithmEvent, AlgorithmResult } from '@/lib/algorithms/types'
import { BACKTRACKING_PSEUDOCODE } from '@/lib/algorithms/backtracking'
import {
  Layers,
  Scissors,
  CheckCircle2,
  GitFork,
  Terminal,
  AlertOctagon,
  CornerUpLeft,
  ArrowRight,
  ScrollText,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface BacktrackingTreeNode {
  key: string
  parentKey: string | null
  city: number
  path: number[]
  depth: number
  cost: number
  status: 'active' | 'backtracked' | 'pruned' | 'solution'
  pruneReason?: string
  stepIndex: number
}

interface BacktrackingInspectorProps {
  result: AlgorithmResult
  event: AlgorithmEvent
  names: string[]
  cursor?: number
  start?: number
  onStepSelect?: (step: number) => void
  onHoverOrSelectPath?: (path: number[] | null) => void
}

export function BacktrackingInspector({
  result,
  event,
  names,
  cursor = 0,
  start = 0,
  onStepSelect,
  onHoverOrSelectPath
}: BacktrackingInspectorProps) {
  const n = names.length
  const stack = event?.stack || []
  const activeLine = event?.pseudocodeLine ?? 0
  const [selectedTreeKey, setSelectedTreeKey] = useState<string | null>(null)
  const [bottomSectionOpen, setBottomSectionOpen] = useState(true)
  const [activeBottomTab, setActiveBottomTab] = useState<'both' | 'pseudocode' | 'log'>('both')
  const treeScrollRef = useRef<HTMLDivElement | null>(null)
  const logScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setSelectedTreeKey(null)
  }, [cursor, start, result])

  const prunedTipKey = useMemo(() => {
    if (event?.type === 'NODE_PRUNED' && event.path) {
      return event.path.join('-')
    }
    if (event?.type === 'EDGE_REJECTED' && cursor > 0) {
      const prev = result.events[cursor - 1]
      if (prev?.type === 'NODE_PRUNED' && prev.path) {
        return prev.path.join('-')
      }
    }
    return null
  }, [event, cursor, result.events])

  // Reconstruct the recursion state-space tree deterministically up to `cursor`
  const treeNodes = useMemo(() => {
    const events = result.events
    if (!events || events.length === 0) return []

    const target = Math.min(cursor, events.length - 1)
    const map = new Map<string, BacktrackingTreeNode>()

    const rootKey = `${start}`
    map.set(rootKey, {
      key: rootKey,
      parentKey: null,
      city: start,
      path: [start],
      depth: 0,
      cost: 0,
      status: 'active',
      stepIndex: 0
    })

    for (let i = 0; i <= target; i++) {
      const ev = events[i]
      const p = ev.path
      if (!p || p.length === 0) continue

      // Ensure all prefixes along p exist in the recursion tree
      for (let len = 1; len <= p.length; len++) {
        const sub = p.slice(0, len)
        const key = sub.join('-')
        const parentKey = len > 1 ? sub.slice(0, len - 1).join('-') : null
        const existing = map.get(key)
        if (!existing) {
          map.set(key, {
            key,
            parentKey,
            city: sub[sub.length - 1],
            path: sub,
            depth: len - 1,
            cost: len === p.length ? (ev.cost ?? 0) : 0,
            status: 'backtracked',
            stepIndex: i
          })
        } else if (len === p.length && ev.cost !== undefined && ev.cost < Infinity) {
          existing.cost = ev.cost
          existing.stepIndex = i
        }
      }

      const tipKey = p.join('-')
      const tipNode = map.get(tipKey)
      if (tipNode) {
        if (ev.type === 'NODE_PRUNED') {
          tipNode.status = 'pruned'
          tipNode.pruneReason = ev.message
        } else if (ev.type === 'BOUND_COMPUTED' || ev.type === 'BEST_SOLUTION_FOUND') {
          tipNode.status = 'solution'
        }
      }
    }

    // Mark active DFS branch vs best complete tour vs backtracked vs pruned
    const currentPath = event?.path || [start]
    const activePrefixKeys = new Set<string>()
    for (let len = 1; len <= currentPath.length; len++) {
      activePrefixKeys.add(currentPath.slice(0, len).join('-'))
    }

    const bestTour = event?.bestRouteSoFar || []
    const bestPrefixKeys = new Set<string>()
    if (bestTour.length > 1) {
      for (let len = 1; len <= bestTour.length; len++) {
        bestPrefixKeys.add(bestTour.slice(0, len).join('-'))
      }
    }

    const list = Array.from(map.values())
    for (const node of list) {
      if (node.status === 'pruned') {
        continue
      }
      if (activePrefixKeys.has(node.key) && event?.type !== 'FINISHED') {
        node.status = 'active'
      } else if (bestPrefixKeys.has(node.key)) {
        node.status = 'solution'
      } else {
        node.status = 'backtracked'
      }
    }

    // Keep up to 140 most relevant nodes if tree is huge on larger N, preserving all ancestor chains
    if (list.length > 140) {
      const keepKeys = new Set<string>()
      const addWithAncestors = (nd: BacktrackingTreeNode) => {
        let curr: BacktrackingTreeNode | undefined = nd
        while (curr && !keepKeys.has(curr.key)) {
          keepKeys.add(curr.key)
          curr = curr.parentKey ? map.get(curr.parentKey) : undefined
        }
      }

      for (const nd of list) {
        if (nd.status === 'active' || nd.status === 'solution' || nd.depth <= 1) {
          addWithAncestors(nd)
        }
      }
      for (let idx = list.length - 1; idx >= 0 && keepKeys.size < 140; idx--) {
        addWithAncestors(list[idx])
      }
      return list.filter(nd => keepKeys.has(nd.key))
    }

    return list
  }, [result.events, cursor, start, event])

  // Compute 2D hierarchical coordinates for the SVG state-space tree
  const treeLayout = useMemo(() => {
    if (treeNodes.length === 0) {
      return { nodes: [], edges: [], width: 600, height: 340, activePos: null }
    }

    const byDepth = new Map<number, BacktrackingTreeNode[]>()
    let maxDepth = 0
    for (const nd of treeNodes) {
      maxDepth = Math.max(maxDepth, nd.depth)
      const group = byDepth.get(nd.depth) || []
      group.push(nd)
      byDepth.set(nd.depth, group)
    }

    let maxRowCount = 1
    byDepth.forEach(group => {
      maxRowCount = Math.max(maxRowCount, group.length)
    })

    const colSpacing = 74
    const rowSpacing = 68
    const width = Math.max(580, maxRowCount * colSpacing + 70)
    const height = Math.max(320, (maxDepth + 1) * rowSpacing + 56)

    const posMap = new Map<string, { x: number; y: number; node: BacktrackingTreeNode }>()

    for (let d = 0; d <= maxDepth; d++) {
      const group = byDepth.get(d) || []
      const rowWidth = (group.length - 1) * colSpacing
      const startX = width / 2 - rowWidth / 2
      const y = 36 + d * rowSpacing
      group.forEach((nd, idx) => {
        posMap.set(nd.key, {
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
      status: BacktrackingTreeNode['status']
      isFlashingPruned: boolean
    }> = []

    const currentTipKey = (event?.path || [start]).join('-')

    posMap.forEach(({ x, y, node }) => {
      if (node.parentKey && posMap.has(node.parentKey)) {
        const parent = posMap.get(node.parentKey)!
        const isFlashingPruned = prunedTipKey !== null && node.key === prunedTipKey
        edges.push({
          id: `${node.parentKey}->${node.key}`,
          x1: parent.x,
          y1: parent.y,
          x2: x,
          y2: y,
          status: node.status,
          isFlashingPruned
        })
      }
    })

    const activePos = posMap.get(prunedTipKey || currentTipKey) || posMap.get(currentTipKey) || null

    return {
      nodes: Array.from(posMap.values()),
      edges,
      width,
      height,
      activePos
    }
  }, [treeNodes, event, start, prunedTipKey])

  // Auto-scroll the recursion tree container to keep the active DFS node centered
  useEffect(() => {
    if (treeScrollRef.current && treeLayout.activePos) {
      const container = treeScrollRef.current
      const targetLeft = Math.max(0, treeLayout.activePos.x - container.clientWidth / 2)
      const targetTop = Math.max(0, treeLayout.activePos.y - container.clientHeight / 2)
      container.scrollTo({ left: targetLeft, top: targetTop, behavior: 'smooth' })
    }
  }, [treeLayout.activePos, cursor])

  // Auto-scroll chronological decision log
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight
    }
  }, [cursor])

  const currentTipKey = (event?.path || [start]).join('-')
  const currentDepth =
    stack.length > 0
      ? stack[stack.length - 1].depth
      : Math.max(0, (event?.path?.length ?? 1) - 1)

  const bestTourCost =
    cursor >= result.events.length - 1 && (result.timedOut || result.cancelled)
      ? result.timedOut
        ? 'Timed out'
        : 'Cancelled'
      : event?.bestCostSoFar !== undefined && event.bestCostSoFar < Infinity
      ? event.bestCostSoFar
      : '∞'

  // Recent chronological decision log entries up to cursor
  const logStart = Math.max(0, cursor - 29)
  const decisionLog = result.events.slice(logStart, cursor + 1).map((ev, idx) => ({
    step: logStart + idx,
    ev
  }))

  const isPruningStep = event?.type === 'NODE_PRUNED' || event?.type === 'EDGE_REJECTED'

  return (
    <div className="space-y-4">
      {/* TOP ROW — 5 BACKTRACKING RECURSION METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Nodes Explored
          </span>
          <strong className="text-lg font-mono font-extrabold text-blue-700">
            {event?.explored ?? 0}
          </strong>
        </div>
        <div className="p-2.5 bg-white border border-red-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
            Nodes Pruned
          </span>
          <strong className="text-lg font-mono font-extrabold text-red-600">
            {event?.pruned ?? 0}
          </strong>
        </div>
        <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Current Route Cost
          </span>
          <strong className="text-lg font-mono font-extrabold text-slate-900">
            {event?.cost !== undefined && event.cost < Infinity ? event.cost : 0}
          </strong>
        </div>
        <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Best Complete Tour
          </span>
          <strong className="text-lg font-mono font-extrabold text-emerald-700">
            {bestTourCost}
          </strong>
        </div>
        <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
            Recursion Depth
          </span>
          <strong className="text-lg font-mono font-extrabold text-blue-800">
            d = {currentDepth} / {n}
          </strong>
        </div>
      </div>

      {/* MAIN AREA — TWO-COLUMN DEBUGGER LAYOUT (60% SVG State-Space Tree | 40% Live Call Stack) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT 60% (7 cols): Interactive SVG State-Space Recursion Tree */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <GitFork size={14} className="text-blue-600" /> DFS State-Space Recursion Tree
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Click any branch vertex to inspect its partial path on the map ({treeNodes.length} states visible).
              </p>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] font-medium text-slate-600">
              <span className="flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Active DFS Branch
              </span>
              <span className="flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Best Tour
              </span>
              <span className="flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Pruned
              </span>
              <span className="flex items-center gap-1">
                <i className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" /> Backtracked
              </span>
            </div>
          </div>

          <div
            ref={treeScrollRef}
            className="flex-1 overflow-auto border border-slate-100 rounded bg-slate-50/50 min-h-[320px] max-h-[410px]"
          >
            <svg
              width={treeLayout.width}
              height={treeLayout.height}
              viewBox={`0 0 ${treeLayout.width} ${treeLayout.height}`}
              className="block mx-auto"
            >
              {/* Parent-Child Branch Connections */}
              <g>
                {treeLayout.edges.map(edge => {
                  let stroke = '#cbd5e1'
                  let strokeWidth = 1.4
                  let dash = undefined
                  if (edge.status === 'active') {
                    stroke = '#2563eb'
                    strokeWidth = 2.5
                  } else if (edge.status === 'solution') {
                    stroke = '#16a34a'
                    strokeWidth = 2.2
                  } else if (edge.status === 'pruned') {
                    stroke = '#dc2626'
                    strokeWidth = edge.isFlashingPruned ? 2.6 : 1.6
                    dash = '4 3'
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

              {/* Tree Nodes */}
              <g>
                {treeLayout.nodes.map(({ x, y, node }) => {
                  const isCurrentHead = node.key === currentTipKey
                  const isUserSelected = node.key === selectedTreeKey
                  const isFlashingPruned = prunedTipKey !== null && node.key === prunedTipKey

                  let fill = '#f8fafc'
                  let stroke = '#94a3b8'
                  let textColor = '#475569'
                  if (node.status === 'active') {
                    fill = isCurrentHead ? '#dbeafe' : '#eff6ff'
                    stroke = '#2563eb'
                    textColor = '#1e3a8a'
                  } else if (node.status === 'solution') {
                    fill = '#f0fdf4'
                    stroke = '#16a34a'
                    textColor = '#14532d'
                  } else if (node.status === 'pruned') {
                    fill = '#fef2f2'
                    stroke = '#dc2626'
                    textColor = '#991b1b'
                  }

                  return (
                    <g
                      key={node.key}
                      transform={`translate(${x}, ${y})`}
                      onClick={() => {
                        setSelectedTreeKey(node.key)
                        onHoverOrSelectPath?.(node.path)
                      }}
                      className="cursor-pointer"
                    >
                      <title>{`Path: ${node.path.map(c => `C${c + 1}`).join(' → ')} | Cost: ${node.cost} | Status: ${node.status.toUpperCase()}`}</title>

                      {/* Active head or pruned flash outer ring */}
                      {(isCurrentHead || isUserSelected || isFlashingPruned) && (
                        <circle
                          r={23}
                          fill="none"
                          stroke={isFlashingPruned ? '#dc2626' : '#2563eb'}
                          strokeWidth="2"
                          strokeDasharray={isFlashingPruned ? '3 2' : '4 2'}
                        />
                      )}

                      <circle
                        r={18}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={isCurrentHead || isUserSelected ? 2.4 : 1.5}
                      />

                      <text
                        y="-3"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={textColor}
                        fontSize="10"
                        fontWeight="800"
                      >
                        C{node.city + 1}
                      </text>
                      <text
                        y="8"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={textColor}
                        fontSize="8.5"
                        fontFamily="monospace"
                        fontWeight="600"
                      >
                        {node.status === 'pruned' ? 'PRUNED' : `c:${node.cost}`}
                      </text>
                    </g>
                  )
                })}
              </g>
            </svg>
          </div>

          {/* Active DFS Path Footer Bar */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 flex-wrap gap-2">
            <div>
              <span className="font-semibold text-slate-700">Active DFS Branch: </span>
              <span className="font-mono text-blue-700 font-bold">
                {(event?.path || [start]).map(c => `C${c + 1}`).join(' → ')}
              </span>
            </div>
            {selectedTreeKey && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTreeKey(null)
                  onHoverOrSelectPath?.(null)
                }}
                className="text-[11px] text-blue-600 hover:underline font-medium"
              >
                Reset map to live DFS head
              </button>
            )}
          </div>
        </div>

        {/* RIGHT 40% (5 cols): Live Call Stack Frames & Recursive Decision Inspector */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-blue-600" /> Live Call Stack Inspector ({stack.length} frames)
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  LIFO recursion frames showing partial route, cost, and unvisited candidates.
                </p>
              </div>
              <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                O(n) Stack Space
              </span>
            </div>

            {/* Stack Frames List (Top of stack first) */}
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {stack.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 border border-slate-100 rounded text-xs text-slate-400 italic">
                  Recursion stack is empty (search complete).
                </div>
              ) : (
                [...stack].reverse().map((frame, revIdx) => {
                  const isTopFrame = revIdx === 0
                  const frameIndex = stack.length - 1 - revIdx
                  const partialRoute = stack.slice(0, frameIndex + 1).map(f => f.city)
                  const unvisited = Array.from({ length: n }, (_, c) => c).filter(
                    c => !partialRoute.includes(c)
                  )

                  return (
                    <div
                      key={`${frame.city}-${frame.depth}-${revIdx}`}
                      className={`p-2.5 rounded-lg border text-xs transition-all ${
                        isTopFrame
                          ? 'bg-blue-50/90 border-blue-400 shadow-2xs ring-1 ring-blue-500/30'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              isTopFrame
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            depth {frame.depth}
                          </span>
                          <strong className="text-slate-900">
                            C{frame.city + 1} — {names[frame.city]?.split(' ').slice(0, 2).join(' ')}
                          </strong>
                        </div>
                        <span className="font-mono font-bold text-blue-800">
                          cost = {frame.cost}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 font-mono truncate">
                        Prefix: {partialRoute.map(c => `C${c + 1}`).join(' → ')}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 flex-wrap">
                        <span className="font-semibold">Unvisited ({unvisited.length}):</span>
                        {unvisited.length > 0 ? (
                          unvisited.map(u => (
                            <span
                              key={u}
                              className="px-1 py-0.2 bg-white border border-slate-200 rounded font-mono text-slate-700"
                            >
                              C{u + 1}
                            </span>
                          ))
                        ) : (
                          <span className="italic text-emerald-700 font-medium">
                            All cities visited — ready to close tour to C{start + 1}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Most Recent Recursive Decision & Bounding / Pruning Box */}
          <div
            className={`p-3 rounded-lg border text-xs ${
              isPruningStep
                ? 'bg-red-50 border-red-300 text-red-900'
                : event?.type === 'BEST_SOLUTION_FOUND'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : event?.type === 'BACKTRACK'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <div className="flex items-center justify-between font-bold mb-1">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                {isPruningStep ? (
                  <>
                    <Scissors size={13} className="text-red-600" /> Branch Pruned by Bounding Inequality
                  </>
                ) : event?.type === 'BACKTRACK' ? (
                  <>
                    <CornerUpLeft size={13} className="text-amber-600" /> Backtracking Up Call Stack
                  </>
                ) : event?.type === 'BEST_SOLUTION_FOUND' ? (
                  <>
                    <CheckCircle2 size={13} className="text-emerald-600" /> New Best Complete Tour Found
                  </>
                ) : (
                  <>
                    <Terminal size={13} className="text-blue-600" /> Active Recursive Decision
                  </>
                )}
              </span>
              <span className="font-mono text-[10px] opacity-80">{event?.type}</span>
            </div>
            <p className="leading-relaxed font-medium">{event?.message}</p>
            {isPruningStep && (
              <div className="mt-1.5 pt-1.5 border-t border-red-200/80 text-[11px] font-mono text-red-800 flex items-center gap-1.5">
                <AlertOctagon size={12} className="flex-none text-red-600" />
                <span>
                  Why pruned: Partial cost ({event?.cost}) ≥ Best tour ({event?.bestCostSoFar}). Since all edge weights are positive, extending this path can never beat {event?.bestCostSoFar}.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION — PSEUDOCODE TRACE & CHRONOLOGICAL DECISION LOG */}
      <div className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
        <div className="flex items-center justify-between p-2.5 bg-slate-50 border-b border-slate-200 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal size={13} className="text-blue-600" /> Trace Details
            </span>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setBottomSectionOpen(true)
                  setActiveBottomTab('both')
                }}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  bottomSectionOpen && activeBottomTab === 'both'
                    ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Side-by-Side
              </button>
              <button
                type="button"
                onClick={() => {
                  setBottomSectionOpen(true)
                  setActiveBottomTab('pseudocode')
                }}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  bottomSectionOpen && activeBottomTab === 'pseudocode'
                    ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pseudocode
              </button>
              <button
                type="button"
                onClick={() => {
                  setBottomSectionOpen(true)
                  setActiveBottomTab('log')
                }}
                className={`px-2 py-0.5 rounded font-medium transition-colors ${
                  bottomSectionOpen && activeBottomTab === 'log'
                    ? 'bg-blue-50 text-blue-700 font-bold border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Decision Log
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setBottomSectionOpen(!bottomSectionOpen)}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
          >
            {bottomSectionOpen ? (
              <>
                <span>Collapse</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>Expand (Pseudocode & Log)</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>

        {bottomSectionOpen && (
          <div className="p-3.5 bg-white">
            <div className={`grid grid-cols-1 ${activeBottomTab === 'both' ? 'lg:grid-cols-12 gap-4' : 'gap-0'}`}>
              {/* Pseudocode Panel */}
              {(activeBottomTab === 'both' || activeBottomTab === 'pseudocode') && (
                <div className={activeBottomTab === 'both' ? 'lg:col-span-6' : 'w-full'}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal size={13} className="text-blue-600" /> Recursive Backtracking Pseudocode
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Executing Line #{activeLine + 1}
                    </span>
                  </div>
                  <pre className="text-[11px] font-mono leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-800 overflow-x-auto max-h-56">
                    {BACKTRACKING_PSEUDOCODE.map((line, idx) => {
                      const isHighlight = idx === activeLine
                      return (
                        <div
                          key={idx}
                          className={`py-0.5 px-1.5 rounded transition-colors ${
                            isHighlight
                              ? 'bg-blue-100 text-blue-950 font-bold border-l-4 border-blue-600 pl-2'
                              : 'text-slate-600'
                          }`}
                        >
                          <span className="inline-block w-5 text-slate-400 select-none text-[10px]">
                            {idx + 1}
                          </span>
                          {line}
                        </div>
                      )
                    })}
                  </pre>
                </div>
              )}

              {/* Chronological Decision Log */}
              {(activeBottomTab === 'both' || activeBottomTab === 'log') && (
                <div className={activeBottomTab === 'both' ? 'lg:col-span-6' : 'w-full'}>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ScrollText size={13} className="text-blue-600" /> Chronological Decision Log (Steps 1–{cursor + 1})
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Choices • Pruning • Backtracking
                    </span>
                  </div>

                  <div
                    ref={logScrollRef}
                    className="space-y-1 max-h-56 overflow-y-auto pr-1 font-mono text-[11px]"
                  >
                    {decisionLog.map(({ step, ev }) => {
                      const isCurrent = step === cursor
                      let badgeClass = 'bg-slate-100 text-slate-700'
                      if (ev.type === 'NODE_PRUNED' || ev.type === 'EDGE_REJECTED') {
                        badgeClass = 'bg-red-100 text-red-800 font-bold'
                      } else if (ev.type === 'BEST_SOLUTION_FOUND') {
                        badgeClass = 'bg-emerald-100 text-emerald-800 font-bold'
                      } else if (ev.type === 'BACKTRACK') {
                        badgeClass = 'bg-amber-100 text-amber-800'
                      } else if (ev.type === 'EDGE_SELECTED' || ev.type === 'NODE_EXPANDING') {
                        badgeClass = 'bg-blue-100 text-blue-800'
                      }

                      return (
                        <button
                          key={step}
                          type="button"
                          onClick={() => onStepSelect?.(step)}
                          className={`w-full text-left px-2 py-1 rounded flex items-center gap-2 border transition-colors ${
                            isCurrent
                              ? 'bg-blue-50 border-blue-300 text-slate-900 font-semibold'
                              : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-[10px] text-slate-400 w-9 flex-none">
                            #{String(step + 1).padStart(3, '0')}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded flex-none ${badgeClass}`}>
                            {ev.type}
                          </span>
                          <span className="truncate font-sans text-xs">{ev.message}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
