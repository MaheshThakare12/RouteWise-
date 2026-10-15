'use client'

import React from 'react'
import { MapPin } from 'lucide-react'
import { AlgorithmEvent, AlgorithmName, Matrix } from '@/lib/algorithms/types'
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
}

export function RouteMap({
  matrix,
  names,
  event,
  bestRoute,
  start,
  customActivePath,
  prunedEdges = [],
  modeLabel
}: RouteMapProps) {
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

  return (
    <div className="map-shell">
      <div className="map-label">
        <span>
          <MapPin size={13} /> ILLUSTRATIVE NETWORK GRAPH ({n} CITIES)
        </span>
        <em>
          {modeLabel || 'Synchronized with DFS Recursion Branch & Pruning'}
        </em>
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

          {/* 1. LAYER 1: Background Complete Graph Edges */}
          <g className="edges-background">
            {matrix.map((row, i) =>
              row.map((dist, j) => {
                if (j <= i || i >= positions.length || j >= positions.length) return null
                const p1 = positions[i]
                const p2 = positions[j]
                const midX = (p1[0] + p2[0]) / 2
                const midY = (p1[1] + p2[1]) / 2

                // Check distance to all vertices to prevent label overlap
                const overlapsVertex = positions.some(p => {
                  const dx = p[0] - midX
                  const dy = p[1] - midY
                  return Math.sqrt(dx * dx + dy * dy) < nodeRadius + 3
                })

                return (
                  <g key={`edge-${i}-${j}`}>
                    <line
                      x1={p1[0]}
                      y1={p1[1]}
                      x2={p2[0]}
                      y2={p2[1]}
                      className="edge-muted"
                    />
                    {/* Distance label on sparse graphs without vertex collision */}
                    {n <= 5 && !overlapsVertex && (
                      <text
                        x={midX}
                        y={midY - 0.7}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#64748b"
                        fontSize="1.9"
                        stroke="#ffffff"
                        strokeWidth="0.6"
                        paintOrder="stroke fill"
                        fontWeight="500"
                      >
                        {dist}
                      </text>
                    )}
                  </g>
                )
              })
            )}
          </g>

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
                    strokeWidth="0.7"
                    strokeDasharray="1.4 1.1"
                    opacity="0.75"
                  />
                )
              })}
            </g>
          )}

          {/* 2. LAYER 2: Active Executing / Selected Route Edges */}
          <g className="edges-active">
            {activePath.length > 1 &&
              activePath.slice(0, -1).map((city, idx) => {
                const nextCity = activePath[idx + 1]
                if (city >= positions.length || nextCity >= positions.length) return null
                return (
                  <line
                    key={`active-${city}-${nextCity}-${idx}`}
                    x1={positions[city][0]}
                    y1={positions[city][1]}
                    x2={positions[nextCity][0]}
                    y2={positions[nextCity][1]}
                    className={
                      isIncumbent || isFinished
                        ? 'edge-win'
                        : 'edge-active'
                    }
                  />
                )
              })}
          </g>

          {/* 3. LAYER 3: Optimal Global Tour Overlay on Finish */}
          <g className="edges-optimal">
            {isFinished &&
              bestRoute.length > 1 &&
              bestRoute.slice(0, -1).map((city, idx) => {
                const nextCity = bestRoute[idx + 1]
                if (city >= positions.length || nextCity >= positions.length) return null
                return (
                  <line
                    key={`best-${city}-${nextCity}-${idx}`}
                    x1={positions[city][0]}
                    y1={positions[city][1]}
                    x2={positions[nextCity][0]}
                    y2={positions[nextCity][1]}
                    className="edge-final"
                  />
                )
              })}
          </g>

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
              // White or light-cyan circle with clear blue border
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

      <div className="legend">
        <span>
          <i className="dot cyan" /> Base Network
        </span>
        <span>
          <i className="dot amber" /> Active Path / Prefix
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
          Permanent Vertex Numbers: 1 through {n}
        </span>
      </div>
    </div>
  )
}
