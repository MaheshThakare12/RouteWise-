'use client'

import React from 'react'
import {
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTsp } from '@/context/tsp-context'
import { validateMatrix } from '@/lib/algorithms'

interface ProblemConfigurationProps {
  compact?: boolean
  showResetActions?: boolean
}

export function ProblemConfiguration({
  compact = false,
  showResetActions = true
}: ProblemConfigurationProps) {
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
    handleReset
  } = useTsp()

  const parsedInput = parseInt(customCountInput, 10)
  const sliderValue = isNaN(parsedInput) ? cityCount : Math.min(12, Math.max(4, parsedInput))
  const validation = validateMatrix(currentMatrix)
  const edgeCount = (cityCount * (cityCount - 1)) / 2

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomCountInput(e.target.value)
    setInputError(null)
  }

  const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomCountInput(e.target.value)
    setInputError(null)
  }

  const handleApply = () => {
    applyCityCountChange(Number(customCountInput))
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
        <div>
          <p className="eyebrow text-blue-700 font-bold">PROBLEM CONFIGURATION</p>
          <h3 className="text-sm font-bold text-slate-900 m-0">
            Number of Vertices & Starting Vertex
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold bg-blue-50 text-blue-800 px-2.5 py-1 rounded-md border border-blue-200">
            Number of Vertices: {cityCount}
          </span>
          <span className="text-xs font-mono font-bold bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-200">
            Start: V{startCity + 1}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Number of Vertices: Slider + Numeric Input + Apply Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-2">
            <span>Vertices (4–12):</span>
            <input
              type="range"
              min="4"
              max="12"
              value={sliderValue}
              onChange={handleSliderChange}
              className="accent-blue-600 w-28 cursor-pointer"
              aria-label="Number of Vertices slider"
            />
          </label>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
            <input
              type="number"
              min="4"
              max="12"
              value={customCountInput}
              onChange={handleNumericChange}
              onKeyDown={e => {
                if (e.key === 'Enter') handleApply()
              }}
              className="w-12 h-7 text-xs font-bold font-mono text-center border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Number of Vertices numeric input"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleApply}
              className="h-7 text-xs font-semibold px-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 cursor-pointer"
            >
              Apply Vertex Count
            </Button>
          </div>
        </div>

        {/* Starting Vertex Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="starting-vertex-dropdown" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            Starting Vertex:
          </label>
          <select
            id="starting-vertex-dropdown"
            value={startCity}
            onChange={e => setStartCity(Number(e.target.value))}
            className="bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs cursor-pointer max-w-[240px] truncate"
            style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
            aria-label="Select Starting Vertex"
          >
            {names.map((name, i) => (
              <option key={name} value={i} className="bg-white text-slate-900 font-medium py-1">
                V{i + 1} — {name}
              </option>
            ))}
          </select>
        </div>

        {/* Optional Reset Button */}
        {showResetActions && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            className="text-xs h-8 text-slate-600 hover:text-slate-900 ml-auto cursor-pointer"
          >
            <RotateCcw size={12} className="mr-1" /> Reset Pune Default
          </Button>
        )}
      </div>

      {/* Input Error Alert */}
      {inputError && (
        <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-md border border-red-200 flex items-center gap-2">
          <AlertCircle size={15} className="text-red-600 flex-none" />
          <span className="font-medium">{inputError}</span>
        </div>
      )}

      {/* Unsaved Edits Warning */}
      {hasCustomEdits && (
        <div className="p-2.5 bg-amber-50 text-amber-800 text-xs rounded-md border border-amber-200 flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-600 flex-none" />
          <span>
            <strong>Custom matrix edits active:</strong> Changing the vertex count will resize the matrix.
          </span>
        </div>
      )}

      {/* Validation Status Bar */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {validation.valid ? (
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 size={13} className="text-emerald-600" /> Valid symmetric matrix
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <AlertCircle size={13} /> {validation.error}
            </span>
          )}
          <span className="text-slate-300">•</span>
          <span className="font-mono text-slate-600">
            {cityCount} vertices, {edgeCount} undirected edges
          </span>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Tour: <span className="font-bold text-blue-700">V{startCity + 1}</span> → ... → <span className="font-bold text-blue-700">V{startCity + 1}</span>
        </div>
      </div>
    </section>
  )
}
