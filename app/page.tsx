'use client'

import React from 'react'
import Link from 'next/link'
import {
  GitBranch,
  Grid3X3,
  BarChart3,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  Clock,
  Layers
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTsp } from '@/context/tsp-context'
import { RouteMap } from '@/components/route-map'
import { formatRoute } from '@/lib/algorithms'

import { ProblemConfiguration } from '@/components/problem-configuration'

export default function OverviewPage() {
  const {
    cityCount,
    startCity,
    names,
    currentMatrix,
    activeEvent,
    selectedResult,
    currentIncumbentCost,
    currentIncumbentRoute,
    activePrunedEdges
  } = useTsp()

  const isComplete = !selectedResult.timedOut && !selectedResult.cancelled
  const formattedRoute = currentIncumbentRoute ? formatRoute(currentIncumbentRoute, names) : 'Pending'

  return (
    <div className="workspace space-y-6">
      {/* Workspace Header */}
      <div className="workspace-head border-b border-slate-200 pb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-blue-700 font-bold">
            DESIGN & ANALYSIS OF ALGORITHMS • CO4 BACKTRACKING
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Travelling Salesperson Problem — Backtracking
          </h2>
          <p className="muted text-slate-600 text-sm max-w-3xl mt-1 leading-relaxed">
            Find the minimum-cost Hamiltonian cycle visiting every vertex exactly once and returning to the chosen start vertex. This interactive laboratory visualizes Depth-First Search (DFS) with incumbent branch pruning to eliminate provably suboptimal subtrees.
          </p>
        </div>

        {/* 3 Pastel Summary Stat Badges */}
        <div className="head-stats flex items-center gap-3 flex-wrap">
          <div className="stat tone-blue bg-blue-50 border border-blue-200 rounded-lg p-2.5">
            <span className="text-[10px] font-bold text-blue-600 uppercase">Number of Vertices</span>
            <strong className="text-lg font-mono text-blue-900">{cityCount} Vertices</strong>
          </div>
          <div className="stat tone-green bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">Starting Vertex</span>
            <strong className="text-lg font-mono text-emerald-900">
              V{startCity + 1} ({names[startCity]?.split(' ')[0]})
            </strong>
          </div>
          <div className="stat tone-amber bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            <span className="text-[10px] font-bold text-amber-700 uppercase">Best Tour Cost</span>
            <strong className="text-lg font-mono text-amber-900">{currentIncumbentCost}</strong>
          </div>
        </div>
      </div>

      {/* Clearly Visible Problem Configuration Controls */}
      <ProblemConfiguration />

      {/* Main 2-Column Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Compact Route Map Preview */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-blue-600" /> Route Map Preview
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {cityCount} vertices with permanent numbering & tour connection
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 font-semibold">
              N = {cityCount}
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-50/50">
            <RouteMap
              matrix={currentMatrix}
              names={names}
              event={activeEvent}
              bestRoute={currentIncumbentRoute || []}
              start={startCity}
              prunedEdges={activePrunedEdges}
              modeLabel="Complete Tour Geometry"
            />
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-1.5 truncate pr-2">
              <span className="font-semibold text-slate-700">Tour:</span>
              <span className="font-mono text-blue-700 truncate">{formattedRoute}</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-700 font-semibold flex-none">
              {isComplete ? (
                <>
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>Cost: {currentIncumbentCost}</span>
                </>
              ) : (
                <>
                  <AlertCircle size={13} className="text-amber-600" />
                  <span>Unproven</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Exploration Hub & Page Navigation */}
        <div className="lg:col-span-7 space-y-4">
          {/* Prominent Call to Action */}
          <div className="p-5 bg-linear-to-r from-blue-50 to-indigo-50/60 border border-blue-200 rounded-xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                Interactive Execution Laboratory
              </span>
              <h3 className="text-lg font-bold text-slate-900 m-0">
                Inspect State-Space Search & Call Stack
              </h3>
              <p className="text-xs text-slate-600 mt-1 max-w-md">
                Step through DFS recursion, observe branch pruning decisions ($cost + dist \ge bestCost$), and inspect call frames in real time.
              </p>
            </div>
            <Link href="/visualizer" className="flex-none">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs">
                Open Visualizer <ArrowRight size={14} className="ml-1.5" />
              </Button>
            </Link>
          </div>

          {/* Module Navigation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Visualizer Card */}
            <Link
              href="/visualizer"
              className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center font-bold">
                    <GitBranch size={16} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase group-hover:text-blue-600">
                    /visualizer
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Backtracking Visualizer
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Interactive state-space recursion tree, LIFO call stack inspector, and synchronized playback controls.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs font-semibold text-blue-600 flex items-center gap-1">
                Launch Debugger <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Matrix Card */}
            <Link
              href="/matrix"
              className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center font-bold">
                    <Grid3X3 size={16} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase group-hover:text-blue-600">
                    /matrix
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Distance Matrix Editor
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Configure 4–12 cities, edit symmetric distances with instant validation, or load the 4-city textbook example.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                Configure Inputs <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Results Card */}
            <Link
              href="/results"
              className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center font-bold">
                    <BarChart3 size={16} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase group-hover:text-blue-600">
                    /results
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Results & Analysis
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Examine tour cost, step-by-step leg breakdown, nodes explored vs pruned, and theoretical complexity.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs font-semibold text-amber-600 flex items-center gap-1">
                View Performance <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            {/* Viva & Tests Card */}
            <Link
              href="/viva"
              className="p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-xs transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100/80 text-purple-700 flex items-center justify-center font-bold">
                    <BookOpen size={16} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase group-hover:text-blue-600">
                    /viva
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Viva & Test Suite
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  DAA faculty viva prep, core questions, NP-hardness proofs, 4-city benchmark, and 200 automated correctness tests.
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs font-semibold text-purple-600 flex items-center gap-1">
                Open Viva Mode <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
