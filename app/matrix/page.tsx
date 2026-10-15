'use client'

import React from 'react'
import Link from 'next/link'
import {
  Grid3X3,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Shuffle,
  BookOpen,
  ArrowRight,
  GitBranch,
  Info,
  MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTsp } from '@/context/tsp-context'
import { MatrixPanel } from '@/components/matrix-panel'
import { ProblemConfiguration } from '@/components/problem-configuration'
import { RouteMap } from '@/components/route-map'

export default function MatrixPage() {
  const {
    cityCount,
    startCity,
    setStartCity,
    currentMatrix,
    names,
    updateMatrix,
    handleReset,
    handleLoadFourCity,
    activeEvent,
    currentIncumbentRoute
  } = useTsp()

  const edgeCount = (cityCount * (cityCount - 1)) / 2

  return (
    <div className="workspace">
      {/* Workspace Header */}
      <div className="workspace-head border-b border-slate-200 pb-4 mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-blue-700 font-bold">
            GRAPH TOPOLOGY & WEIGHT CONFIGURATION
          </p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Distance Matrix Configuration
          </h2>
          <p className="muted text-slate-600 text-xs mt-0.5">
            Configure symmetric edge weights between cities (4–12). Editing cell <code className="font-mono text-slate-800">d(u, v)</code> automatically syncs <code className="font-mono text-slate-800">d(v, u)</code> to guarantee an undirected TSP graph.
          </p>
        </div>

        <Link href="/visualizer">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-xs">
            Run in Visualizer <ArrowRight size={13} className="ml-1.5" />
          </Button>
        </Link>
      </div>

      {/* Problem Configuration Section (Number of Vertices & Starting Vertex) */}
      <div className="mb-5">
        <ProblemConfiguration />
      </div>

      {/* Grid: Matrix Editor + Synchronized Diagram Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Dedicated Matrix Editor Component */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <MatrixPanel
            matrix={currentMatrix}
            names={names}
            start={startCity}
            onMatrixChange={updateMatrix}
            onStartChange={setStartCity}
            onResetPune={handleReset}
            onLoadFourCity={handleLoadFourCity}
          />
        </div>

        {/* Right Column: Live Network Diagram Preview with Real-time Distance Badges */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={14} className="text-blue-600" /> Live Graph Topology
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Edge distances update live as you modify any matrix cell
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 font-semibold">
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
              modeLabel="Live Synchronized Topology"
            />
          </div>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="mt-5 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-600">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-800">Graph Properties:</span>
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
            N = {cityCount} vertices
          </span>
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
            |E| = {edgeCount} undirected edges
          </span>
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono">
            Origin: V{startCity + 1}
          </span>
        </div>

        <Link href="/visualizer" className="flex-none">
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs">
            Launch Backtracking with this Matrix <ArrowRight size={13} className="ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
