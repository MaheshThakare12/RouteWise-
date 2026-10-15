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
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTsp } from '@/context/tsp-context'
import { MatrixPanel } from '@/components/matrix-panel'
import { ProblemConfiguration } from '@/components/problem-configuration'

export default function MatrixPage() {
  const {
    cityCount,
    startCity,
    setStartCity,
    currentMatrix,
    names,
    updateMatrix,
    handleReset,
    handleLoadFourCity
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

      {/* Dedicated Full-Width Matrix Editor Component */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
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
            Origin: C{startCity + 1}
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
