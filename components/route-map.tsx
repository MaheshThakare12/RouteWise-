'use client'

import React, { useState, useMemo } from 'react'
import { MapPin, Eye, EyeOff } from 'lucide-react'
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
  const candidateFractions = [0.5, 0.38, 0.62, 0.28, 0.72, 0.44, 0.56, 0.2, 0.8]
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

    // Clearance from vertex circles (must not be inside or right against a vertex)
    if (minNodeDist < nodeRadius + 2.2) {
      continue
    }

    // Distance to closest already-placed label
    let minLabelDist = Infinity
    for (const lp of placedLabels) {
      const d = Math.hypot(lp[0] - x, lp[1] - y)
      if (d < minLabelDist) minLabelDist = d
    }

    // If well-spaced from other labels (> 5.0 viewBox units), accept immediately
    if (minLabelDist > 5.0) {
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

  const n = matrix.length
  // Positions for up to 12 cities
  const positions = defaultPositions.slice(0, n)

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
  const nodeRadius = n <= 6 ? 4.2 : n <= 9 ? 3.9 : 3.5
  const numberFontSize = n <= 6 ? 3.4 : n <= 9 ? 3.1 : 2.7
  const nameFontSize = n <= 6 ? 2.3 : n <= 9 ? 2.1 : 1.9

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

  return (
    <div className="map-shell">
      {/* Header with Title and Edge Distances Visibility Toggle */}
      <div className="map-label flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-bold text-slate-900 text-xs tracking-wider uppercase">
            <MapPin size={13} className="text-blue-600" /> Graph Network ({n} Vertices)
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            • {modeLabel || 'DFS Branch & Pruning'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowAllDistances(!showAllDistances)}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-semibold border transition-all shadow-2xs cursor-pointer ${
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

      <div className="map-svg-wrap">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          className="route-map"
          role="img"
          aria-label="Interactive route network map"
        >
          <defs>
            <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#e2e8f0" strokeWidth="0.16" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

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
                  className={isHovered ? 'stroke-blue-500 stroke-[0.8]' : 'edge-muted'}
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
                const pw = Math.max(4.2, strDist.length * 1.6 + 1.8)
                const ph = 2.8
                const fs = strDist.length > 3 ? 1.5 : strDist.length > 2 ? 1.7 : 1.9
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
                      rx="0.9"
                      ry="0.9"
                      fill={isHovered ? '#eff6ff' : '#ffffff'}
                      stroke={isHovered ? '#2563eb' : '#cbd5e1'}
                      strokeWidth={isHovered ? '0.55' : '0.35'}
                    />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isHovered ? '#1d4ed8' : '#475569'}
                      fontSize={fs}
                      fontWeight={isHovered ? '800' : '600'}
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
                    strokeWidth="0.75"
                    strokeDasharray="1.5 1.1"
                    opacity="0.8"
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
                className={isIncumbent || isFinished ? 'edge-win' : 'edge-active'}
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
              const pw = Math.max(4.6, strDist.length * 1.7 + 2.0)
              const ph = 3.0
              const fs = strDist.length > 3 ? 1.6 : strDist.length > 2 ? 1.8 : 2.0

              return (
                <g key={`act-badge-${seg.u}-${seg.v}-${seg.idx}`}>
                  <title>{`Active Traversal: V${seg.u + 1} → V${seg.v + 1} (Distance: ${seg.dist})`}</title>
                  <rect
                    x={lx - pw / 2}
                    y={ly - ph / 2}
                    width={pw}
                    height={ph}
                    rx="1.1"
                    ry="1.1"
                    fill={isIncumbent || isFinished ? '#eff6ff' : '#fef3c7'}
                    stroke={isIncumbent || isFinished ? '#2563eb' : '#f59e0b'}
                    strokeWidth="0.65"
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isIncumbent || isFinished ? '#1d4ed8' : '#92400e'}
                    fontSize={fs}
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
                    className="edge-final"
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
                  const pw = Math.max(4.6, strDist.length * 1.7 + 2.0)
                  const ph = 3.0
                  const fs = strDist.length > 3 ? 1.6 : strDist.length > 2 ? 1.8 : 2.0

                  return (
                    <g key={`best-badge-${seg.u}-${seg.v}-${seg.idx}`}>
                      <title>{`Optimal Tour Leg: V${seg.u + 1} → V${seg.v + 1} (Distance: ${seg.dist})`}</title>
                      <rect
                        x={lx - pw / 2}
                        y={ly - ph / 2}
                        width={pw}
                        height={ph}
                        rx="1.1"
                        ry="1.1"
                        fill="#eff6ff"
                        stroke="#2563eb"
                        strokeWidth="0.75"
                      />
                      <text
                        x={lx}
                        y={ly}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#1e40af"
                        fontSize={fs}
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

              // Vertex Circle Color Scheme:
              // White or light-blue circle with clear border
              let circleFill = '#ffffff'
              let circleStroke = '#2563eb'
              let strokeW = 0.8

              if (isStartNode) {
                circleFill = '#eff6ff'
                circleStroke = '#1d4ed8'
                strokeW = 1.1
              } else if (isVisited) {
                circleFill = '#f0f9ff'
                circleStroke = '#0284c7'
                strokeW = 0.9
              }

              return (
                <g key={`vertex-${i}`} className="city-vertex" tabIndex={0}>
                  <title>{`V${i + 1} — ${name}${isStartNode ? ' (START VERTEX)' : ''}`}</title>

                  {/* Outer Amber Pulse Ring for Current Active Vertex */}
                  {isCurrentHead && (
                    <circle
                      cx={x}
                      cy={y}
                      r={nodeRadius + 2.0}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="0.8"
                      strokeDasharray="1.6 1.2"
                    />
                  )}

                  {/* Outer Accent Ring for Start Vertex */}
                  {isStartNode && (
                    <circle
                      cx={x}
                      cy={y}
                      r={nodeRadius + 1.2}
                      fill="none"
                      stroke="#1d4ed8"
                      strokeWidth="0.45"
                      strokeDasharray="1 0.8"
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

                  {/* Separate Visit Order Badge if visited */}
                  {isVisited && visitOrderIndex !== null && !isStartNode && (
                    <g transform={`translate(${x}, ${y - nodeRadius - 2.2})`}>
                      <rect
                        x="-5"
                        y="-1.5"
                        width="10"
                        height="3"
                        rx="1"
                        fill="#f59e0b"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize="1.6"
                        fontWeight="bold"
                      >
                        Visit #{visitOrderIndex}
                      </text>
                    </g>
                  )}

                  {/* Start Vertex Label Badge */}
                  {isStartNode && (
                    <g transform={`translate(${x}, ${y - nodeRadius - 2.2})`}>
                      <rect
                        x="-5.5"
                        y="-1.5"
                        width="11"
                        height="3"
                        rx="1"
                        fill="#1d4ed8"
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#ffffff"
                        fontSize="1.6"
                        fontWeight="bold"
                      >
                        START
                      </text>
                    </g>
                  )}

                  {/* City Name Label Below Vertex */}
                  <g className="city-name-tag">
                    <text
                      x={x}
                      y={y + nodeRadius + 3.2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#1e293b"
                      fontSize={nameFontSize}
                      fontWeight="600"
                      stroke="#ffffff"
                      strokeWidth="0.8"
                      paintOrder="stroke fill"
                      className="select-none"
                    >
                      {`${i + 1} — ${name.startsWith('Custom City') ? name : name.split(' ').slice(0, 2).join(' ')}`}
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
        <span className="flex items-center gap-1">
          <span className="inline-block px-1 py-0.2 bg-white border border-slate-300 rounded text-[9px] font-mono text-slate-700 font-bold leading-none">
            24
          </span>
          Distance
        </span>
        <span>
          <i className="dot amber" /> Active Path
        </span>
        {prunedEdges.length > 0 && (
          <span>
            <i className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Pruned Branch
          </span>
        )}
        <span>
          <i className="dot blue" /> Optimal Tour
        </span>
        <span className="ml-auto text-[10px] text-slate-500 font-mono">
          Permanent Vertices: 1 through {n}
        </span>
      </div>
    </div>
  )
}
