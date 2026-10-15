'use client'

import React, { useState, useMemo } from 'react'
import { MapPin, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { AlgorithmEvent, Matrix } from '@/lib/algorithms/types'
import { defaultPositions } from '@/lib/algorithms/matrix-utils'

interface RouteMapProps {
  matrix: Matrix
  names: string[]
  event?: AlgorithmEvent
  bestRoute: number[]
  start: number
  customActivePath?: number[] | null
  prunedEdges?: Array<[number, number]>
  modeLabel?: string
  initialShowAllDistances?: boolean
}

// High-resolution canvas coordinate system
const CANVAS_W = 1000
const CANVAS_H = 850
const CENTER_X = 500
const CENTER_Y = 425

/**
 * Scales synthetic vertex coordinates into the enlarged 1000 x 850 SVG viewport,
 * keeping all vertices centered with comfortable margins on all sides.
 */
function getScaledPositions(n: number): [number, number][] {
  const raw = defaultPositions.slice(0, n)
  return raw.map(p => {
    // Map X from [14..82] to [120..880]
    const x = 120 + (p[0] - 14) * (760 / 68)
    // Map Y from [16..86] to [90..760]
    const y = 90 + (p[1] - 16) * (670 / 70)
    return [Math.round(x), Math.round(y)]
  })
}

/**
 * Calculates outward-pointing city label placement based on vertex angle from center,
 * ensuring city name labels never intersect inner edges or overlap neighbor nodes.
 */
function getCityLabelLayout(
  x: number,
  y: number,
  radius: number
): {
  lx: number
  ly: number
  anchor: 'start' | 'middle' | 'end'
} {
  const dx = x - CENTER_X
  const dy = y - CENTER_Y
  const distFromCenter = Math.hypot(dx, dy)

  if (distFromCenter > 175) {
    const angle = Math.atan2(dy, dx)
    const ux = Math.cos(angle)
    const uy = Math.sin(angle)

    if (ux > 0.4) {
      return { lx: x + radius + 12, ly: y + uy * 8, anchor: 'start' }
    } else if (ux < -0.4) {
      return { lx: x - radius - 12, ly: y + uy * 8, anchor: 'end' }
    } else {
      return {
        lx: x,
        ly: y + (uy > 0 ? radius + 24 : -radius - 14),
        anchor: 'middle'
      }
    }
  } else {
    // Inner nodes (e.g. Node 8, 9, 10, 11, 12)
    return { lx: x, ly: y + radius + 22, anchor: 'middle' }
  }
}

/**
 * Calculates a clean placement coordinate along the edge segment between p1 and p2,
 * ensuring the label avoids city vertices and minimizes overlap with other edge labels.
 */
function getEdgeLabelPosWithPlaced(
  p1: [number, number],
  p2: [number, number],
  allPositions: [number, number][],
  placedLabels: [number, number][],
  nodeRadius: number
): [number, number] {
  // Test interpolation points along the edge line: midpoint first, then staggered fractions
  const candidateFractions = [0.5, 0.38, 0.62, 0.28, 0.72, 0.44, 0.56, 0.22, 0.78, 0.33, 0.67]
  let bestPos: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]
  let bestScore = -Infinity

  for (const t of candidateFractions) {
    const x = p1[0] + (p2[0] - p1[0]) * t
    const y = p1[1] + (p2[1] - p1[1]) * t

    // Distance to closest vertex
    let minNodeDist = Infinity
    for (const p of allPositions) {
      const d = Math.hypot(p[0] - x, p[1] - y)
      if (d < minNodeDist) minNodeDist = d
    }

    // Clearance from vertex circles
    if (minNodeDist < nodeRadius + 15) {
      continue
    }

    // Distance to closest already-placed label
    let minLabelDist = Infinity
    for (const lp of placedLabels) {
      const d = Math.hypot(lp[0] - x, lp[1] - y)
      if (d < minLabelDist) minLabelDist = d
    }

    // If well-spaced (> 24px), accept immediately
    if (minLabelDist > 24) {
      return [x, y]
    }

    // Otherwise track the position that maximizes distance from other labels
    if (minLabelDist > bestScore) {
      bestScore = minLabelDist
      bestPos = [x, y]
    }
  }

  return bestPos
}

export function RouteMap({
  matrix,
  names,
  event,
  bestRoute,
  start,
  customActivePath,
  prunedEdges = [],
  modeLabel,
  initialShowAllDistances = true
}: RouteMapProps) {
  const [showAllDistances, setShowAllDistances] = useState<boolean>(initialShowAllDistances)
  const [hoveredEdge, setHoveredEdge] = useState<[number, number] | null>(null)

  // Zoom & Pan interactive state
  const [zoom, setZoom] = useState<number>(1.0)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const n = matrix.length
  // High-resolution scaled positions
  const positions = useMemo(() => getScaledPositions(n), [n])

  // Current partial path in execution (or custom inspected path from tree selection)
  const activePath =
    customActivePath && customActivePath.length > 0
      ? customActivePath
      : event?.path && event.path.length > 0
      ? event.path
      : [start]
  const isFinished = event?.type === 'FINISHED' && bestRoute.length > 1
  const isIncumbent = event?.type === 'BEST_SOLUTION_FOUND'

  // Dynamic scaling for vertex radius and typography based on city count (4 to 12)
  const nodeRadius = n <= 6 ? 26 : n <= 8 ? 24 : n <= 10 ? 22 : 20
  const numberFontSize = n <= 6 ? 18 : n <= 8 ? 17 : n <= 10 ? 16 : 15
  const nameFontSize = n <= 6 ? 13 : n <= 8 ? 12.5 : n <= 10 ? 12 : 11.5

  // Precompute complete background graph edges with non-overlapping label coordinates
  const backgroundEdges = useMemo(() => {
    const edges: Array<{
      u: number
      v: number
      dist: number
      p1: [number, number]
      p2: [number, number]
      labelPos: [number, number]
    }> = []

    const placedLabels: Array<[number, number]> = []

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (i >= positions.length || j >= positions.length) continue
        const dist = matrix[i]?.[j] ?? 0
        const p1 = positions[i]
        const p2 = positions[j]
        const labelPos = getEdgeLabelPosWithPlaced(p1, p2, positions, placedLabels, nodeRadius)
        placedLabels.push(labelPos)
        edges.push({ u: i, v: j, dist, p1, p2, labelPos })
      }
    }
    return edges
  }, [matrix, positions, nodeRadius, n])

  // Active path segments
  const activeSegments = useMemo(() => {
    if (activePath.length <= 1) return []
    const segments: Array<{ u: number; v: number; idx: number; dist: number }> = []
    for (let idx = 0; idx < activePath.length - 1; idx++) {
      const u = activePath[idx]
      const v = activePath[idx + 1]
      if (u < positions.length && v < positions.length) {
        segments.push({ u, v, idx, dist: matrix[u]?.[v] ?? 0 })
      }
    }
    return segments
  }, [activePath, positions.length, matrix])

  // Tour segments on finish
  const tourSegments = useMemo(() => {
    if (!isFinished || bestRoute.length <= 1) return []
    const segments: Array<{ u: number; v: number; idx: number; dist: number }> = []
    for (let idx = 0; idx < bestRoute.length - 1; idx++) {
      const u = bestRoute[idx]
      const v = bestRoute[idx + 1]
      if (u < positions.length && v < positions.length) {
        segments.push({ u, v, idx, dist: matrix[u]?.[v] ?? 0 })
      }
    }
    return segments
  }, [isFinished, bestRoute, positions.length, matrix])

  // Zoom handlers
  const handleZoomIn = () => setZoom(z => Math.min(2.5, Number((z + 0.15).toFixed(2))))
  const handleZoomOut = () => setZoom(z => Math.max(0.6, Number((z - 0.15).toFixed(2))))
  const handleResetView = () => {
    setZoom(1.0)
    setPan({ x: 0, y: 0 })
  }

  // Pointer drag for smooth canvas panning
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    setDragStart({ x: e.clientX, y: e.clientY })

    const svgRect = e.currentTarget.getBoundingClientRect()
    const scaleFactor = (CANVAS_W / (svgRect.width || CANVAS_W)) / zoom
    setPan(p => ({
      x: p.x + dx * scaleFactor,
      y: p.y + dy * scaleFactor
    }))
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isDragging) {
      setIsDragging(false)
      ;(e.target as Element).releasePointerCapture?.(e.pointerId)
    }
  }

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    setZoom(z => Math.min(2.5, Math.max(0.6, Number((z + delta).toFixed(2)))))
  }

  // Dynamic viewBox based on zoom and pan
  const vbWidth = CANVAS_W / zoom
  const vbHeight = CANVAS_H / zoom
  const vbX = CENTER_X - vbWidth / 2 - pan.x
  const vbY = CENTER_Y - vbHeight / 2 - pan.y

  return (
    <div className="map-shell">
      {/* Header with Title, Zoom Controls, and Edge Distances Visibility Toggle */}
      <div className="map-label flex items-center justify-between gap-2 flex-wrap pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 font-bold text-slate-900 text-xs tracking-wider uppercase">
            <MapPin size={14} className="text-blue-600" /> Graph Network ({n} Vertices)
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            • {modeLabel || 'DFS Branch & Pruning'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom & Pan Control Bar */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 0.6}
              className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              onClick={handleResetView}
              className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700 hover:text-blue-700 hover:bg-white rounded transition-colors cursor-pointer"
              title="Click to reset view to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 2.5}
              className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />
            <button
              type="button"
              onClick={handleResetView}
              className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-white transition-colors cursor-pointer"
              title="Reset View / Center"
              aria-label="Reset View"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Distances Visibility Toggle */}
          <button
            type="button"
            onClick={() => setShowAllDistances(!showAllDistances)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold border transition-all shadow-2xs cursor-pointer ${
              showAllDistances
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
            title={showAllDistances ? 'Hide background edge distances' : 'Show all edge distances'}
            aria-label={showAllDistances ? 'Hide background edge distances' : 'Show all edge distances'}
          >
            {showAllDistances ? (
              <Eye size={12} className="text-blue-600" />
            ) : (
              <EyeOff size={12} className="text-slate-400" />
            )}
            <span>
              Distances:{' '}
              <strong className={showAllDistances ? 'text-blue-700' : 'text-slate-500'}>
                {showAllDistances ? 'Visible' : 'Hidden'}
              </strong>
            </span>
          </button>
        </div>
      </div>

      <div className="map-svg-wrap">
        <svg
          viewBox={`${vbX} ${vbY} ${vbWidth} ${vbHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className={`route-map ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          role="img"
          aria-label="Interactive route network map"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onDoubleClick={handleResetView}
        >
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x={vbX} y={vbY} width={vbWidth} height={vbHeight} fill="url(#grid)" />

          {/* 1. LAYER 1: Background Complete Graph Edge Lines */}
          <g className="edges-background">
            {backgroundEdges.map(edge => {
              const isHovered =
                hoveredEdge &&
                ((hoveredEdge[0] === edge.u && hoveredEdge[1] === edge.v) ||
                  (hoveredEdge[0] === edge.v && hoveredEdge[1] === edge.u))
              return (
                <line
                  key={`bg-line-${edge.u}-${edge.v}`}
                  x1={edge.p1[0]}
                  y1={edge.p1[1]}
                  x2={edge.p2[0]}
                  y2={edge.p2[1]}
                  className={isHovered ? 'stroke-blue-500 stroke-[2.2]' : 'stroke-slate-300 stroke-[1.2]'}
                />
              )
            })}
          </g>

          {/* 1a. LAYER 1a: Background Edge Distance Badges */}
          {showAllDistances && (
            <g className="edge-distances-background">
              {backgroundEdges.map(edge => {
                const isHovered =
                  hoveredEdge &&
                  ((hoveredEdge[0] === edge.u && hoveredEdge[1] === edge.v) ||
                    (hoveredEdge[0] === edge.v && hoveredEdge[1] === edge.u))
                const strDist = String(edge.dist)
                const pw = Math.max(28, strDist.length * 8.5 + 14)
                const ph = 18
                const [lx, ly] = edge.labelPos

                return (
                  <g
                    key={`bg-badge-${edge.u}-${edge.v}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredEdge([edge.u, edge.v])}
                    onMouseLeave={() => setHoveredEdge(null)}
                  >
                    <title>{`V${edge.u + 1} (${names[edge.u]}) ↔ V${edge.v + 1} (${names[edge.v]}): Distance ${edge.dist}`}</title>
                    <rect
                      x={lx - pw / 2}
                      y={ly - ph / 2}
                      width={pw}
                      height={ph}
                      rx="4"
                      ry="4"
                      fill={isHovered ? '#eff6ff' : '#ffffff'}
                      stroke={isHovered ? '#2563eb' : '#94a3b8'}
                      strokeWidth={isHovered ? '1.8' : '1.2'}
                    />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isHovered ? '#1d4ed8' : '#0f172a'}
                      fontSize="11"
                      fontWeight="700"
                      className="select-none pointer-events-none"
                    >
                      {edge.dist}
                    </text>
                  </g>
                )
              })}
            </g>
          )}

          {/* 1b. LAYER 1b: Pruned Branch Edges (Backtracking) */}
          {prunedEdges.length > 0 && (
            <g className="edges-pruned">
              {prunedEdges.map(([u, v], idx) => {
                if (u >= positions.length || v >= positions.length || u < 0 || v < 0) return null
                return (
                  <line
                    key={`pruned-${u}-${v}-${idx}`}
                    x1={positions[u][0]}
                    y1={positions[u][1]}
                    x2={positions[v][0]}
                    y2={positions[v][1]}
                    stroke="#ef4444"
                    strokeWidth="2.2"
                    strokeDasharray="6 4"
                    opacity="0.85"
                  />
                )
              })}
            </g>
          )}

          {/* 2. LAYER 2: Active Executing Route Edges */}
          <g className="edges-active">
            {activeSegments.map(seg => (
              <line
                key={`act-line-${seg.u}-${seg.v}-${seg.idx}`}
                x1={positions[seg.u][0]}
                y1={positions[seg.u][1]}
                x2={positions[seg.v][0]}
                y2={positions[seg.v][1]}
                className={isIncumbent || isFinished ? 'stroke-blue-600 stroke-[3.6]' : 'stroke-amber-500 stroke-[3.2]'}
              />
            ))}
          </g>

          {/* 2a. LAYER 2a: Active Traversal Distance Badges */}
          <g className="active-distance-badges">
            {activeSegments.map(seg => {
              const p1 = positions[seg.u]
              const p2 = positions[seg.v]
              const lx = (p1[0] + p2[0]) / 2
              const ly = (p1[1] + p2[1]) / 2
              const strDist = String(seg.dist)
              const pw = Math.max(30, strDist.length * 9 + 16)
              const ph = 20

              return (
                <g key={`act-badge-${seg.u}-${seg.v}-${seg.idx}`}>
                  <title>{`Active Traversal: V${seg.u + 1} → V${seg.v + 1} (Distance: ${seg.dist})`}</title>
                  <rect
                    x={lx - pw / 2}
                    y={ly - ph / 2}
                    width={pw}
                    height={ph}
                    rx="4"
                    ry="4"
                    fill={isIncumbent || isFinished ? '#eff6ff' : '#fef3c7'}
                    stroke={isIncumbent || isFinished ? '#2563eb' : '#f59e0b'}
                    strokeWidth="1.8"
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isIncumbent || isFinished ? '#1d4ed8' : '#78350f'}
                    fontSize="12"
                    fontWeight="800"
                    className="select-none pointer-events-none"
                  >
                    {seg.dist}
                  </text>
                </g>
              )
            })}
          </g>

          {/* 3. LAYER 3: Optimal Global Tour Overlay & Badges on Finish */}
          {isFinished && tourSegments.length > 0 && (
            <>
              <g className="edges-optimal">
                {tourSegments.map(seg => (
                  <line
                    key={`best-line-${seg.u}-${seg.v}-${seg.idx}`}
                    x1={positions[seg.u][0]}
                    y1={positions[seg.u][1]}
                    x2={positions[seg.v][0]}
                    y2={positions[seg.v][1]}
                    className="stroke-blue-600 stroke-[3.6]"
                  />
                ))}
              </g>
              <g className="tour-distance-badges">
                {tourSegments.map(seg => {
                  const p1 = positions[seg.u]
                  const p2 = positions[seg.v]
                  const lx = (p1[0] + p2[0]) / 2
                  const ly = (p1[1] + p2[1]) / 2
                  const strDist = String(seg.dist)
                  const pw = Math.max(30, strDist.length * 9 + 16)
                  const ph = 20

                  return (
                    <g key={`best-badge-${seg.u}-${seg.v}-${seg.idx}`}>
                      <title>{`Optimal Tour Leg: V${seg.u + 1} → V${seg.v + 1} (Distance: ${seg.dist})`}</title>
                      <rect
                        x={lx - pw / 2}
                        y={ly - ph / 2}
                        width={pw}
                        height={ph}
                        rx="4"
                        ry="4"
                        fill="#eff6ff"
                        stroke="#2563eb"
                        strokeWidth="2.0"
                      />
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#1e40af"
                        fontSize="12"
                        fontWeight="800"
                        className="select-none pointer-events-none"
                      >
                        {seg.dist}
                      </text>
                    </g>
                  )
                })}
              </g>
            </>
          )}

          {/* 4. LAYER 4: City Vertices & Prominent Numeric Labels */}
          <g className="vertices">
            {names.map((name, i) => {
              if (i >= positions.length) return null
              const [x, y] = positions[i]
              const isStartNode = i === start
              const isVisited = activePath.includes(i)
              const isCurrentHead = activePath[activePath.length - 1] === i
              const visitOrderIndex = isVisited ? activePath.indexOf(i) + 1 : null
              const labelLayout = getCityLabelLayout(x, y, nodeRadius)
              const displayName = name.startsWith('Custom City') ? name : name.split(' ').slice(0, 2).join(' ')

              // High-contrast clean color scheme
              let circleFill = '#ffffff'
              let circleStroke = '#2563eb'
              let strokeW = 2.6

              if (isStartNode) {
                circleFill = '#eff6ff'
                circleStroke = '#1d4ed8'
                strokeW = 3.4
              } else if (isVisited) {
                circleFill = '#f0f9ff'
                circleStroke = '#0284c7'
                strokeW = 2.8
              }

              return (
                <g key={`vertex-${i}`} className="city-vertex" tabIndex={0}>
                  <title>{`V${i + 1} — ${name}${isStartNode ? ' (START VERTEX)' : ''}`}</title>

                  {/* Outer Amber Pulse Ring for Current Active Vertex */}
                  {isCurrentHead && (
                    <circle
                      cx={x}
                      cy={y}
                      r={nodeRadius + 9}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeDasharray="6 4"
                    />
                  )}

                  {/* Outer Accent Ring for Start Vertex */}
                  {isStartNode && (
                    <circle
                      cx={x}
                      cy={y}
                      r={nodeRadius + 6}
                      fill="none"
                      stroke="#1d4ed8"
                      strokeWidth="2.0"
                      strokeDasharray="5 3"
                    />
                  )}

                  {/* Circular Vertex Body */}
                  <circle
                    cx={x}
                    cy={y}
                    r={nodeRadius}
                    fill={circleFill}
                    stroke={circleStroke}
                    strokeWidth={strokeW}
                  />

                  {/* Prominent Sequential Number (1 to n) centered horizontally & vertically */}
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#0f172a"
                    fontSize={numberFontSize}
                    fontWeight="800"
                    className="select-none pointer-events-none"
                  >
                    {i + 1}
                  </text>

                  {/* Start Vertex Label Badge */}
                  {isStartNode && (
                    <g transform={`translate(${x}, ${y - nodeRadius - 16})`}>
                      <rect
                        x="-24"
                        y="-8"
                        width="48"
                        height="16"
                        rx="4"
                        fill="#1d4ed8"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize="9.5"
                        fontWeight="bold"
                        className="select-none pointer-events-none"
                      >
                        START
                      </text>
                    </g>
                  )}

                  {/* Separate Visit Order Badge if visited */}
                  {isVisited && visitOrderIndex !== null && !isStartNode && (
                    <g transform={`translate(${x}, ${y - nodeRadius - 16})`}>
                      <rect
                        x="-28"
                        y="-8"
                        width="56"
                        height="16"
                        rx="4"
                        fill="#f59e0b"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="bold"
                        className="select-none pointer-events-none"
                      >
                        VISIT #{visitOrderIndex}
                      </text>
                    </g>
                  )}

                  {/* City Name Label with Protective Background Halo */}
                  <g className="city-name-tag">
                    <text
                      x={labelLayout.lx}
                      y={labelLayout.ly}
                      textAnchor={labelLayout.anchor}
                      dominantBaseline="central"
                      fill="#0f172a"
                      fontSize={nameFontSize}
                      fontWeight="700"
                      stroke="#ffffff"
                      strokeWidth="4"
                      paintOrder="stroke fill"
                      className="select-none pointer-events-none"
                    >
                      {`V${i + 1} • ${displayName}`}
                    </text>
                  </g>
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {/* Map Legend */}
      <div className="legend">
        <span>
          <i className="dot cyan" /> Base Edge
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono text-slate-800 font-bold leading-none shadow-2xs">
            24
          </span>
          Distance
        </span>
        <span>
          <i className="dot amber" /> Active Path
        </span>
        {prunedEdges.length > 0 && (
          <span>
            <i className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Pruned Branch
          </span>
        )}
        <span>
          <i className="dot blue" /> Optimal Tour
        </span>
        <span className="ml-auto text-[11px] text-slate-500 font-mono">
          Permanent Vertices: V1 to V{n} (Click & drag to pan • Scroll to zoom)
        </span>
      </div>
    </div>
  )
}
