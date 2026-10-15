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

export default function MatrixPage() {
  const {
    cityCount,
    customCountInput,
    setCustomCountInput,
    inputError,
    setInputError,
    hasCustomEdits,
    startCity,
    setStartCity,
    currentMatrix,
    names,
    applyCityCountChange,
    updateMatrix,
    handleReset,
    handleLoadFourCity,
    handleRandomizeMatrix
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

      {/* Top Configuration Controls Row */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl mb-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* 1. Slider: Preset 4–8 Cities */}
          <label className="text-xs text-slate-700 flex items-center gap-2.5">
            <span className="font-semibold whitespace-nowrap">City Count Slider:</span>
            <input
              type="range"
              min="4"
              max="8"
              value={Math.min(cityCount, 8)}
              onChange={e => applyCityCountChange(Number(e.target.value))}
              className="accent-blue-600 w-28 cursor-pointer"
              aria-label="Preset city count slider (4 to 8 cities)"
            />
            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              {cityCount <= 8 ? `${cityCount} cities` : `${cityCount} (custom)`}
            </span>
          </label>

          {/* 2. Custom Numeric Input (4–12) */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <label htmlFor="custom-city-input" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Custom Count (4–12):
            </label>
            <input
              id="custom-city-input"
              type="number"
              min={4}
              max={12}
              value={customCountInput}
              onChange={e => {
                setCustomCountInput(e.target.value)
                setInputError(null)
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  applyCityCountChange(Number(customCountInput))
                }
              }}
              className="w-14 h-7 text-xs font-bold font-mono text-center border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Enter custom number of cities between 4 and 12"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyCityCountChange(Number(customCountInput))}
              className="h-7 text-xs font-semibold px-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
            >
              Apply Count
            </Button>
          </div>

          {/* 3. Start City Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="start-city-select" className="text-xs font-semibold text-slate-700">
              Start City:
            </label>
            <select
              id="start-city-select"
              value={startCity}
              onChange={e => setStartCity(Number(e.target.value))}
              className="bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer"
            >
              {names.map((name, i) => (
                <option key={name} value={i} className="bg-white text-slate-900 font-medium py-1">
                  C{i + 1} — {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Indicators & Alerts */}
        {inputError && (
          <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-md border border-red-200 flex items-center gap-2">
            <AlertCircle size={15} className="text-red-600 flex-none" />
            <span className="font-medium">{inputError}</span>
          </div>
        )}

        {hasCustomEdits && (
          <div className="p-2.5 bg-amber-50 text-amber-800 text-xs rounded-md border border-amber-200 flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-600 flex-none" />
            <span>
              <strong>Custom matrix edits active:</strong> Resizing the city count will recalculate edge dimensions. Results in the Visualizer will reflect these exact weights.
            </span>
          </div>
        )}
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
