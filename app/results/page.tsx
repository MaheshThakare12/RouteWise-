'use client'

import React, { useMemo } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  GitBranch,
  Settings,
  Clock,
  Layers,
  Sparkles,
  MapPin,
  ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTsp } from '@/context/tsp-context'
import { RouteMap } from '@/components/route-map'
import { formatRoute, validRoute } from '@/lib/algorithms'

export default function ResultsPage() {
  const {
    cityCount,
    startCity,
    names,
    currentMatrix,
    selectedResult,
    activeEvent,
    currentIncumbentRoute,
    currentIncumbentCost,
    activePrunedEdges
  } = useTsp()

  const finalRoute = selectedResult.route
  const isTimedOut = selectedResult.timedOut
  const isCancelled = selectedResult.cancelled
  const isOptimalProven = !isTimedOut && !isCancelled && finalRoute.length === cityCount + 1
  const isValidTour = validRoute(finalRoute, cityCount, startCity)

  // Calculate leg-by-leg breakdown
  const routeLegs = useMemo(() => {
    if (!finalRoute || finalRoute.length < 2) return []
    let cumulative = 0
    return finalRoute.slice(0, -1).map((from, idx) => {
      const to = finalRoute[idx + 1]
      const dist = currentMatrix[from][to]
      cumulative += dist
      return {
        legIndex: idx + 1,
        fromCity: from,
        toCity: to,
        dist,
        cumulative
      }
    })
  }, [finalRoute, currentMatrix])

  const totalExploredAndPruned = selectedResult.explored + selectedResult.pruned
  const pruningRate =
    totalExploredAndPruned > 0
      ? ((selectedResult.pruned / totalExploredAndPruned) * 100).toFixed(1)
      : '0.0'

  return (
    <div className="workspace">
      {/* Workspace Header */}
      <div className="workspace-head border-b border-slate-200 pb-4 mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-blue-700 font-bold">
            OPTIMALITY VERIFICATION & METRICS
          </p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Tour Results & Performance Analysis
          </h2>
          <p className="muted text-slate-600 text-xs mt-0.5">
            Examine the proven minimum-cost Hamiltonian cycle, computation status, branch pruning efficiency, and asymptotic complexity.
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
            <span className="font-mono font-bold bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded border border-blue-200">
              Number of Vertices: {cityCount}
            </span>
            <span className="font-mono font-bold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded border border-emerald-200">
              Starting Vertex: V{startCity + 1} — {names[startCity]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/visualizer">
            <Button variant="outline" size="sm" className="text-xs h-8">
              <GitBranch size={13} className="mr-1.5 text-blue-600" /> Open in Visualizer
            </Button>
          </Link>
          <Link href="/matrix">
            <Button variant="outline" size="sm" className="text-xs h-8">
              <Settings size={13} className="mr-1.5 text-slate-500" /> Edit Matrix
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Alert Banner */}
      {isTimedOut ? (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
          <AlertCircle size={18} className="text-amber-600 flex-none mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-950 text-sm m-0">Search Timed Out (5000ms Threshold)</h4>
            <p className="mt-1 leading-relaxed">
              Backtracking terminated early due to high permutation complexity ($N={cityCount}$). The best discovered incumbent tour is displayed below, but <strong>global optimality is NOT mathematically proven</strong>.
            </p>
          </div>
        </div>
      ) : isCancelled ? (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
          <AlertTriangle size={18} className="text-amber-600 flex-none mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-950 text-sm m-0">Search Cancelled</h4>
            <p className="mt-1 leading-relaxed">
              Execution was cancelled. The search space was not completely exhausted.
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-950 flex items-start gap-3 shadow-2xs">
          <CheckCircle2 size={18} className="text-emerald-600 flex-none mt-0.5" />
          <div>
            <h4 className="font-bold text-emerald-900 text-sm m-0">Optimal Hamiltonian Tour Proven</h4>
            <p className="mt-1 leading-relaxed">
              Depth-first search with branch-and-bound pruning has explored all feasible branches. Subtrees exceeding cost <strong>{selectedResult.cost}</strong> were pruned. Global optimality is proven.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Compact Final Map (Left) + Performance Metrics & Leg Breakdown (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Final Route Map */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-blue-600" /> Final Tour Route Map
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Total Tour Distance: <strong className="text-blue-700 font-mono">{selectedResult.cost}</strong>
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 font-semibold">
              {isValidTour ? 'Valid Cycle' : 'Incomplete'}
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-50/50">
            <RouteMap
              matrix={currentMatrix}
              names={names}
              event={activeEvent}
              bestRoute={finalRoute}
              start={startCity}
              prunedEdges={activePrunedEdges}
              modeLabel="Optimal Hamiltonian Cycle"
            />
          </div>

          {/* Route Sequence Pills */}
          <div className="mt-3 pt-3 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1.5">
              Visited Sequence ({finalRoute.length} stops):
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {finalRoute.map((city, idx) => (
                <React.Fragment key={`${city}-${idx}`}>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                      city === startCity
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    V{city + 1}
                  </span>
                  {idx < finalRoute.length - 1 && (
                    <ArrowRight size={11} className="text-slate-400" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Execution Metrics & Leg-by-Leg Table */}
        <div className="lg:col-span-7 space-y-4">
          {/* 4 Performance Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Total Tour Cost
              </span>
              <strong className="text-xl font-mono font-extrabold text-blue-700">
                {selectedResult.cost}
              </strong>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Nodes Explored
              </span>
              <strong className="text-xl font-mono font-extrabold text-slate-900">
                {selectedResult.explored}
              </strong>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-red-600 block">
                Nodes Pruned
              </span>
              <strong className="text-xl font-mono font-extrabold text-red-600">
                {selectedResult.pruned}
              </strong>
              <span className="text-[10px] text-slate-400 block font-mono">
                {pruningRate}% pruned
              </span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                Execution Time
              </span>
              <strong className="text-xl font-mono font-extrabold text-emerald-700">
                {selectedResult.duration.toFixed(2)} ms
              </strong>
            </div>
          </div>

          {/* Step-by-Step Leg Breakdown Table */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-blue-600" /> Route Leg Breakdown
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {routeLegs.length} Segments
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                    <th className="py-2 px-2.5">Leg</th>
                    <th className="py-2 px-2.5">Origin Vertex</th>
                    <th className="py-2 px-2.5">Destination Vertex</th>
                    <th className="py-2 px-2.5 text-right">Distance</th>
                    <th className="py-2 px-2.5 text-right">Cumulative</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {routeLegs.map(leg => (
                    <tr key={leg.legIndex} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-2.5 text-slate-500 font-bold">#{leg.legIndex}</td>
                      <td className="py-2 px-2.5 text-slate-800">
                        V{leg.fromCity + 1} ({names[leg.fromCity]?.split(' ')[0]})
                      </td>
                      <td className="py-2 px-2.5 text-slate-800">
                        V{leg.toCity + 1} ({names[leg.toCity]?.split(' ')[0]})
                      </td>
                      <td className="py-2 px-2.5 text-right font-bold text-blue-700">
                        {leg.dist}
                      </td>
                      <td className="py-2 px-2.5 text-right text-slate-900 font-bold">
                        {leg.cumulative}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Asymptotic Complexity & Space Efficiency Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2.5">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Layers size={14} className="text-blue-600" /> Theoretical & Space Complexity Analysis
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Time Complexity
                </span>
                <strong className="text-sm font-mono text-slate-900 block mt-0.5">
                  O((n − 1)!) worst-case
                </strong>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Exhaustive permutation search would evaluate (n−1)! candidate tours. Incumbent bounding prunes subtrees where partial cost exceeds best incumbent.
                </p>
              </div>

              <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Space Complexity
                </span>
                <strong className="text-sm font-mono text-blue-700 block mt-0.5">
                  O(n) Stack Space
                </strong>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Only requires the current DFS recursion stack (depth ≤ n) and a boolean visited array, consuming minimal memory.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
