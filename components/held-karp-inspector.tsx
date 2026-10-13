'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlgorithmEvent, AlgorithmResult, DPCellInfo, Matrix } from '@/lib/algorithms/types'
import {
  Table2,
  Calculator,
  ArrowRight,
  CornerDownRight,
  CheckCircle2,
  Binary,
  Sparkles
} from 'lucide-react'

interface HeldKarpInspectorProps {
  result: AlgorithmResult
  event: AlgorithmEvent
  names: string[]
  matrix: Matrix
  cursor?: number
  start?: number
  onSelectCellTransition?: (
    partialPath: number[] | null,
    transitionEdge: [number, number] | null
  ) => void
}

export function HeldKarpInspector({
  result,
  event,
  names,
  matrix,
  cursor = 0,
  start = 0,
  onSelectCellTransition
}: HeldKarpInspectorProps) {
  const n = names.length
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null)
  const [subsetSizeFilter, setSubsetSizeFilter] = useState<number | 'all'>('all')

  useEffect(() => {
    setSelectedCellKey(null)
  }, [cursor, start, result])

  useEffect(() => {
    if (subsetSizeFilter !== 'all' && subsetSizeFilter > n) {
      setSubsetSizeFilter('all')
    }
  }, [n, subsetSizeFilter])

  // Precompute all DP state events (START + DP_CELL_COMPUTED) once per result
  const allComputedCells = useMemo(() => {
    return result.events
      .filter(e => (e.type === 'START' || e.type === 'DP_CELL_COMPUTED') && e.cell)
      .map(e => e.cell!)
  }, [result.events])

  const allComputedCellsMap = useMemo(() => {
    const map = new Map<string, DPCellInfo>()
    for (const c of allComputedCells) {
      map.set(`${c.mask}-${c.end}`, c)
    }
    return map
  }, [allComputedCells])

  // Display computed DP states up to the current playback cursor in O(1) slice
  const computedCells = useMemo(() => {
    let count = 0
    const target = Math.min(cursor, result.events.length - 1)
    for (let i = 0; i <= target && i < result.events.length; i++) {
      const ev = result.events[i]
      if ((ev.type === 'START' || ev.type === 'DP_CELL_COMPUTED') && ev.cell) {
        count++
      }
    }
    return allComputedCells.slice(0, count)
  }, [allComputedCells, result.events, cursor])

  // Map `"${mask}-${end}"` -> computed DPCellInfo up to cursor
  const computedCellMap = useMemo(() => {
    const map = new Map<string, DPCellInfo>()
    for (const c of computedCells) {
      map.set(`${c.mask}-${c.end}`, c)
    }
    return map
  }, [computedCells])

  // Generate all valid subset rows S (containing `start`), ordered by subset size |S| = 1..n
  // For n <= 8 (up to 128 rows), show all subsets containing `start`. For n >= 9, show subsets that have computed cells or match size filter.
  const subsetRows = useMemo(() => {
    const rows: Array<{
      mask: number
      maskBinary: string
      subsetCities: number[]
      size: number
    }> = []

    if (n <= 8) {
      const totalMasks = 1 << n
      const startBit = 1 << start
      for (let size = 1; size <= n; size++) {
        for (let m = 1; m < totalMasks; m++) {
          if ((m & startBit) === 0) continue
          const cities: number[] = []
          for (let c = 0; c < n; c++) {
            if ((m & (1 << c)) !== 0) cities.push(c)
          }
          if (cities.length === size) {
            rows.push({
              mask: m,
              maskBinary: m.toString(2).padStart(n, '0'),
              subsetCities: cities,
              size
            })
          }
        }
      }
    } else {
      // For N >= 9, build rows from unique masks in allComputedCells
      const seen = new Set<number>()
      for (const c of allComputedCells) {
        if (!seen.has(c.mask)) {
          seen.add(c.mask)
          rows.push({
            mask: c.mask,
            maskBinary: c.maskBinary,
            subsetCities: c.subsetCities,
            size: c.subsetCities.length
          })
        }
      }
    }

    if (subsetSizeFilter !== 'all') {
      return rows.filter(r => r.size === subsetSizeFilter)
    }
    return rows
  }, [n, start, allComputedCells, subsetSizeFilter])

  // Determine the active cell being inspected (user-selected or current playback event cell)
  const activeCell: DPCellInfo | undefined = useMemo(() => {
    if (selectedCellKey && computedCellMap.has(selectedCellKey)) {
      return computedCellMap.get(selectedCellKey)
    }
    return event?.cell || computedCells[computedCells.length - 1]
  }, [selectedCellKey, computedCellMap, event?.cell, computedCells])

  // Identify predecessor cells `(prevMask, cand.from)` used in the recurrence of `activeCell`
  const predecessorHighlightMap = useMemo(() => {
    const map = new Map<string, 'min' | 'rejected'>()
    if (!activeCell || !activeCell.candidates || activeCell.candidates.length === 0) {
      return map
    }
    // For BOUND_COMPUTED (closing tour at start), predecessors are in fullMask
    const isClosingTour =
      event?.type === 'BOUND_COMPUTED' &&
      activeCell.end === start &&
      activeCell.subsetCities.length === n
    const prevMask = isClosingTour
      ? activeCell.mask
      : activeCell.mask ^ (1 << activeCell.end)

    for (const cand of activeCell.candidates) {
      map.set(`${prevMask}-${cand.from}`, cand.isMin ? 'min' : 'rejected')
    }
    return map
  }, [activeCell, event?.type, start, n])

  // Reconstruct optimal parent-pointer traceback chain when available
  const tracebackChain = useMemo(() => {
    if (result.timedOut || result.cancelled || result.route.length < 2) return []
    const chain: Array<{
      step: number
      mask: number
      maskBinary: string
      city: number
      predecessor: number
      dpCost: number
      edgeCost: number
    }> = []

    // Walk along result.route: [start, c1, c2, ..., ck, start]
    const tour = result.route
    let mask = 1 << start
    let runningCost = 0
    for (let idx = 1; idx < tour.length - 1; idx++) {
      const prevCity = tour[idx - 1]
      const city = tour[idx]
      mask |= 1 << city
      const edgeCost = matrix[prevCity]?.[city] ?? 0
      runningCost += edgeCost
      const cell = computedCellMap.get(`${mask}-${city}`) || allComputedCellsMap.get(`${mask}-${city}`)
      chain.push({
        step: idx,
        mask,
        maskBinary: mask.toString(2).padStart(n, '0'),
        city,
        predecessor: prevCity,
        dpCost: cell?.cost ?? runningCost,
        edgeCost
      })
    }
    return chain
  }, [result.timedOut, result.cancelled, result.route, start, n, computedCellMap, allComputedCellsMap, matrix])

  const tracebackCellKeys = useMemo(() => {
    const keys = new Set<string>()
    if (event?.type === 'TRACEBACK_STEP' || event?.type === 'FINISHED') {
      keys.add(`${1 << start}-${start}`)
      for (const item of tracebackChain) {
        keys.add(`${item.mask}-${item.city}`)
      }
    }
    return keys
  }, [event?.type, start, tracebackChain])

  // Reconstruct partial path for any clicked cell `(mask, end)` by following stored parent pointers
  const reconstructPartialPath = (cell: DPCellInfo): number[] => {
    const path: number[] = []
    let currMask = cell.mask
    let currCity: number | undefined = cell.end
    let safety = 0
    while (currCity !== undefined && currCity >= 0 && currMask > 0 && safety < n + 2) {
      safety++
      path.push(currCity)
      if (currCity === start) break
      const cInfo = computedCellMap.get(`${currMask}-${currCity}`)
      if (!cInfo || cInfo.from === undefined) break
      currMask ^= 1 << currCity
      currCity = cInfo.from
    }
    return path.reverse()
  }

  const handleCellClick = (cell: DPCellInfo) => {
    const key = `${cell.mask}-${cell.end}`
    setSelectedCellKey(key)
    const partial = reconstructPartialPath(cell)
    const transition: [number, number] | null =
      cell.from !== undefined && cell.from >= 0 ? [cell.from, cell.end] : null
    onSelectCellTransition?.(partial, transition)
  }

  const subsetSize = activeCell?.subsetCities.length ?? 1
  const currentMaskBinary =
    activeCell?.maskBinary ?? (1 << start).toString(2).padStart(n, '0')
  const currentEndCity = activeCell?.end ?? start
  const currentMinCost =
    cursor >= result.events.length - 1 && (result.timedOut || result.cancelled)
      ? result.timedOut
        ? 'Timed out'
        : 'Cancelled'
      : activeCell?.cost !== undefined && activeCell.cost < Infinity
      ? activeCell.cost
      : event?.cost ?? 0

  return (
    <div className="space-y-4">
      {/* TOP ROW — 5 HELD-KARP DYNAMIC PROGRAMMING METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-2.5 bg-teal-50/60 border border-teal-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 block">
            DP States Computed
          </span>
          <strong className="text-lg font-mono font-extrabold text-teal-700">
            {computedCells.length > 0 ? computedCells.length : event?.explored ?? 1}
          </strong>
        </div>
        <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Current Subset Size
          </span>
          <strong className="text-lg font-mono font-extrabold text-slate-900">
            |S| = {subsetSize} / {n}
          </strong>
        </div>
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
            Current Bitmask
          </span>
          <strong className="text-base font-mono font-extrabold text-teal-800 tracking-wider">
            {currentMaskBinary}
          </strong>
        </div>
        <div className="p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Current Ending City
          </span>
          <strong className="text-lg font-mono font-extrabold text-slate-900">
            C{currentEndCity + 1} ({names[currentEndCity]?.split(' ')[0]})
          </strong>
        </div>
        <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
            Current Minimum Cost
          </span>
          <strong className="text-lg font-mono font-extrabold text-emerald-700">
            {currentMinCost}
          </strong>
        </div>
      </div>

      {/* MAIN AREA — TWO-COLUMN DP RESEARCH WORKBENCH (65% 2D DP Spreadsheet | 35% Recurrence Inspector) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* LEFT 65% (8 cols): 2D Scrollable DP Table (Rows = Subsets S, Columns = Ending Cities C1..Cn) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Table2 size={14} className="text-teal-600" /> 2D Dynamic Programming Table — dp[S][j] ({subsetRows.length} Subset Rows × {n} Cities)
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Rows represent city subsets S (binary mask &amp; set); columns represent ending city Cⱼ. Click any computed cell.
              </p>
            </div>

            {/* Subset Size Filter Pills */}
            <div className="flex items-center gap-1 text-[10px] font-mono bg-slate-50 p-1 rounded border border-slate-200">
              <span className="text-slate-500 px-1 font-sans">Filter |S|:</span>
              <button
                type="button"
                onClick={() => setSubsetSizeFilter('all')}
                className={`px-1.5 py-0.5 rounded ${
                  subsetSizeFilter === 'all'
                    ? 'bg-teal-600 text-white font-bold'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              {Array.from({ length: n }, (_, idx) => idx + 1).map(sz => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSubsetSizeFilter(sz)}
                  className={`px-1.5 py-0.5 rounded ${
                    subsetSizeFilter === sz
                      ? 'bg-teal-600 text-white font-bold'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Color Legend for DP Spreadsheet Cells */}
          <div className="flex items-center gap-3 text-[10px] font-medium text-slate-600 mb-2 flex-wrap">
            <span className="flex items-center gap-1">
              <i className="w-2.5 h-2.5 rounded-xs bg-teal-600 inline-block" /> Active Cell dp[S][j]
            </span>
            <span className="flex items-center gap-1">
              <i className="w-2.5 h-2.5 rounded-xs bg-emerald-500 inline-block" /> Chosen Min Predecessor
            </span>
            <span className="flex items-center gap-1">
              <i className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block" /> Rejected Predecessor
            </span>
            <span className="flex items-center gap-1">
              <i className="w-2.5 h-2.5 rounded-xs bg-blue-500 inline-block" /> Traceback Path
            </span>
            <span className="flex items-center gap-1">
              <i className="w-2.5 h-2.5 rounded-xs bg-slate-200 inline-block" /> Uncomputed (…)
            </span>
          </div>

          {/* Scrollable 2D Spreadsheet Grid */}
          <div className="flex-1 overflow-auto border border-slate-200 rounded max-h-[410px]">
            {subsetRows.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Step-by-step DP table cells are disabled for large N by default. Check &quot;Enable Step-by-Step Animation (N ≥ 9)&quot; above to inspect all individual DP cells.
              </div>
            ) : (
              <table className="text-[11px] border-collapse w-full font-mono">
                <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-300 shadow-2xs">
                  <tr>
                    <th className="p-1.5 text-left text-slate-700 border-r border-slate-200">
                      Mask (Binary)
                    </th>
                    <th className="p-1.5 text-left font-sans text-slate-700 border-r border-slate-200">
                      Subset S (|S|)
                    </th>
                    {Array.from({ length: n }, (_, j) => (
                      <th
                        key={j}
                        className={`p-1.5 text-center border-r border-slate-200 ${
                          activeCell?.end === j
                            ? 'bg-teal-100 text-teal-950 font-extrabold'
                            : 'text-slate-700'
                        }`}
                      >
                        End C{j + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subsetRows.map(row => {
                    const isActiveRow = activeCell?.mask === row.mask
                    return (
                      <tr
                        key={row.mask}
                        className={`border-b border-slate-200 ${
                          isActiveRow ? 'bg-teal-50/30' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="p-1.5 text-slate-600 border-r border-slate-200 font-semibold whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Binary size={11} className="text-teal-600" />
                            {row.maskBinary}
                          </span>
                        </td>
                        <td className="p-1.5 font-sans text-slate-800 border-r border-slate-200 whitespace-nowrap">
                          <span className="font-semibold">
                            &#123;{row.subsetCities.map(c => `C${c + 1}`).join(', ')}&#125;
                          </span>{' '}
                          <span className="text-[10px] text-slate-400 font-mono">
                            (|S|={row.size})
                          </span>
                        </td>

                        {Array.from({ length: n }, (_, j) => {
                          const cellKey = `${row.mask}-${j}`
                          const inSubset = (row.mask & (1 << j)) !== 0
                          const isValidState =
                            row.size === 1 ? j === start : inSubset && j !== start
                          const computed = computedCellMap.get(cellKey)
                          const isCurrentTarget =
                            activeCell?.mask === row.mask &&
                            activeCell?.end === j &&
                            event?.type !== 'BOUND_COMPUTED'
                          const predRole = predecessorHighlightMap.get(cellKey)
                          const isOnTraceback = tracebackCellKeys.has(cellKey)

                          if (!isValidState) {
                            return (
                              <td
                                key={j}
                                className="p-1.5 text-center text-slate-300 bg-slate-50/70 border-r border-slate-100 select-none"
                              >
                                —
                              </td>
                            )
                          }

                          if (!computed) {
                            return (
                              <td
                                key={j}
                                className="p-1.5 text-center text-slate-400 bg-white border-r border-slate-100 italic"
                                title={`Uncomputed state dp[${row.maskBinary}][C${j + 1}]`}
                              >
                                …
                              </td>
                            )
                          }

                          let cellStyle = 'bg-white text-slate-800 hover:bg-teal-50/60'
                          let badgeText: string | null = null

                          if (isCurrentTarget) {
                            cellStyle =
                              'bg-teal-100 text-teal-950 font-extrabold ring-2 ring-inset ring-teal-600'
                            badgeText = 'COMPUTING'
                          } else if (predRole === 'min') {
                            cellStyle =
                              'bg-emerald-100 text-emerald-950 font-extrabold ring-2 ring-inset ring-emerald-600'
                            badgeText = 'MIN PRED'
                          } else if (predRole === 'rejected') {
                            cellStyle =
                              'bg-amber-50 text-amber-900 font-semibold ring-1 ring-inset ring-amber-400'
                            badgeText = 'ALT PRED'
                          } else if (isOnTraceback) {
                            cellStyle =
                              'bg-blue-50 text-blue-950 font-bold ring-1 ring-inset ring-blue-500'
                          }

                          return (
                            <td
                              key={j}
                              onClick={() => handleCellClick(computed)}
                              className={`p-1.5 text-center border-r border-slate-200 cursor-pointer transition-all ${cellStyle}`}
                              title={`dp[{${row.subsetCities.map(c => `C${c + 1}`).join(',')}}][C${j + 1}] = ${computed.cost}${
                                computed.from !== undefined && computed.from >= 0
                                  ? ` (via predecessor C${computed.from + 1})`
                                  : ' (Base Case)'
                              }`}
                            >
                              <div className="flex flex-col items-center leading-tight">
                                <span className="text-xs font-bold">{computed.cost}</span>
                                <span className="text-[9px] text-slate-500">
                                  {computed.from !== undefined && computed.from >= 0
                                    ? `← C${computed.from + 1}`
                                    : 'base'}
                                </span>
                                {badgeText && (
                                  <span className="mt-0.5 text-[8px] px-1 rounded bg-white/90 border border-current font-extrabold">
                                    {badgeText}
                                  </span>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT 35% (4 cols): Live Recurrence & Candidate Predecessor Inspector */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator size={14} className="text-teal-600" /> Live Recurrence Inspector
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Exact candidate predecessor evaluations and parent pointer.
                </p>
              </div>
              {selectedCellKey && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCellKey(null)
                    onSelectCellTransition?.(null, null)
                  }}
                  className="text-[10px] text-teal-700 hover:underline font-semibold"
                >
                  Follow step
                </button>
              )}
            </div>

            {/* Instantiated Recurrence Formula Box */}
            {activeCell ? (
              <div className="p-2.5 bg-teal-50/70 border border-teal-200 rounded-lg text-xs space-y-1 font-mono mb-3">
                <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-teal-800">
                  {event?.type === 'BOUND_COMPUTED' && activeCell.end === start
                    ? 'Closing Tour Recurrence'
                    : `Target Cell: dp[{${activeCell.subsetCities.map(c => `C${c + 1}`).join(',')}}][C${activeCell.end + 1}]`}
                </div>
                <div className="text-teal-950 font-bold text-[11px] leading-snug">
                  {activeCell.subsetCities.length === 1
                    ? `dp[{C${start + 1}}][C${start + 1}] = 0 (Base Case)`
                    : event?.type === 'BOUND_COMPUTED' && activeCell.end === start
                    ? `OPT = min_{i ≠ C${start + 1}} ( dp[All][Cᵢ] + dist(Cᵢ, C${start + 1}) ) = ${activeCell.cost}`
                    : `dp[S][C${activeCell.end + 1}] = min_{Cᵢ ∈ S\\{C${activeCell.end + 1}}} ( dp[S\\{C${activeCell.end + 1}}][Cᵢ] + dist(Cᵢ, C${activeCell.end + 1}) ) = ${activeCell.cost}`}
                </div>
                {activeCell.from !== undefined && activeCell.from >= 0 && (
                  <div className="pt-1 border-t border-teal-200/80 text-emerald-800 font-bold text-[11px]">
                    Recorded Parent Pointer: parent[{activeCell.maskBinary}][C{activeCell.end + 1}] = C{activeCell.from + 1}
                  </div>
                )}
              </div>
            ) : null}

            {/* Candidate Predecessors Decomposition List */}
            <div className="space-y-1.5 max-h-[235px] overflow-y-auto pr-1">
              {activeCell?.candidates && activeCell.candidates.length > 0 ? (
                activeCell.candidates.map((cand, idx) => {
                  const edgeWeight = matrix[cand.from]?.[activeCell.end] ?? 0
                  const prevDpCost = cand.cost - edgeWeight
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border text-xs transition-all ${
                        cand.isMin
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-2xs'
                          : 'bg-amber-50/40 border-amber-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono font-bold flex items-center gap-1">
                          Predecessor C{cand.from + 1} <ArrowRight size={11} /> C{activeCell.end + 1}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-extrabold ${
                            cand.isMin
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {cand.isMin ? 'SELECTED MIN' : 'REJECTED ALT'}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] flex items-center justify-between text-slate-700">
                        <span>
                          dp_prev ({prevDpCost}) + dist(C{cand.from + 1},C{activeCell.end + 1}) ({edgeWeight})
                        </span>
                        <strong className="text-xs font-extrabold">= {cand.cost}</strong>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded text-xs text-slate-500">
                  {activeCell?.subsetCities.length === 1
                    ? `Base state dp[{C${start + 1}}][C${start + 1}] = 0 requires no predecessor transitions.`
                    : 'Click Next Step or select any computed DP cell in the table to inspect its candidate predecessor calculations.'}
                </div>
              )}
            </div>
          </div>

          {/* Plain-English Calculation Explanation */}
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 leading-relaxed">
            <div className="font-bold text-slate-900 mb-0.5 flex items-center gap-1">
              <Sparkles size={12} className="text-teal-600" /> Plain-English Explanation
            </div>
            {activeCell && activeCell.from !== undefined && activeCell.from >= 0 ? (
              <p>
                To visit subset <strong>&#123;{activeCell.subsetCities.map(c => `C${c + 1}`).join(', ')}&#125;</strong> and finish at <strong>C{activeCell.end + 1}</strong>, Held-Karp checks all {activeCell.candidates?.length ?? 1} possible previous cities. Coming from <strong>C{activeCell.from + 1}</strong> yields the minimum cost of <strong>{activeCell.cost}</strong>, so <code>parent[S][C{activeCell.end + 1}] = C{activeCell.from + 1}</code> is stored.
              </p>
            ) : (
              <p>{event?.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION — OPTIMAL-TOUR PARENT-POINTER TRACEBACK PANEL */}
      <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 mb-2.5 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CornerDownRight size={14} className="text-teal-600" /> Optimal-Tour Parent-Pointer Traceback Panel
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Reconstructs the global optimal tour by following stored parent[S][j] pointers from full bitmask S = {(1 << n) - 1} back to start C{start + 1}.
            </p>
          </div>
          {!result.timedOut && !result.cancelled && result.cost < Infinity && (
            <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600" /> Optimal Cost = {result.cost}
            </span>
          )}
        </div>

        {tracebackChain.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {/* Base State Card */}
              <div className="p-2 rounded border border-teal-300 bg-teal-50/70 text-xs font-mono flex-none">
                <div className="text-[9px] text-teal-700 font-bold">BASE CASE</div>
                <div className="font-bold text-slate-900">
                  dp[{(1 << start).toString(2).padStart(n, '0')}][C{start + 1}] = 0
                </div>
                <div className="text-[10px] text-slate-500">Start: {names[start]?.split(' ')[0]}</div>
              </div>

              {tracebackChain.map(step => {
                const isCurrentTracebackStep =
                  event?.type === 'TRACEBACK_STEP' && event?.cell?.end === step.city
                return (
                  <React.Fragment key={step.step}>
                    <ArrowRight size={14} className="text-teal-600 flex-none" />
                    <button
                      type="button"
                      onClick={() => {
                        const cell = computedCellMap.get(`${step.mask}-${step.city}`)
                        if (cell) handleCellClick(cell)
                      }}
                      className={`p-2 rounded border text-left text-xs font-mono flex-none transition-all ${
                        isCurrentTracebackStep
                          ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500/40 font-bold'
                          : 'bg-slate-50 border-slate-200 hover:bg-teal-50/50'
                      }`}
                    >
                      <div className="text-[9px] text-slate-500 flex items-center justify-between gap-2">
                        <span>STEP #{step.step}</span>
                        <span className="text-teal-700 font-bold">
                          parent → C{step.predecessor + 1}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900">
                        dp[{step.maskBinary}][C{step.city + 1}] = {step.dpCost}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        +dist(C{step.predecessor + 1}→C{step.city + 1}) = {step.edgeCost}
                      </div>
                    </button>
                  </React.Fragment>
                )
              })}

              {/* Tour Closing Edge back to Start */}
              <ArrowRight size={14} className="text-emerald-600 flex-none" />
              <div className="p-2 rounded border border-emerald-400 bg-emerald-50 text-xs font-mono flex-none">
                <div className="text-[9px] text-emerald-800 font-bold">CLOSE TOUR</div>
                <div className="font-extrabold text-emerald-950">
                  Return → C{start + 1} (Total = {result.cost})
                </div>
                <div className="text-[10px] text-emerald-700">
                  {result.route.map(c => `C${c + 1}`).join(' → ')}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded text-xs text-slate-500">
            Advance playback or complete DP table evaluation to inspect the parent-pointer traceback chain.
          </div>
        )}
      </div>
    </div>
  )
}
