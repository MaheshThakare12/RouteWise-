'use client'

import React from 'react'
import Link from 'next/link'
import {
  GitBranch,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Settings,
  BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTsp } from '@/context/tsp-context'
import { RouteMap } from '@/components/route-map'
import { PlaybackController } from '@/components/playback-controller'
import { BacktrackingInspector } from '@/components/backtracking-inspector'

export default function VisualizerPage() {
  const {
    cityCount,
    startCity,
    names,
    currentMatrix,
    cursor,
    isPlaying,
    setIsPlaying,
    handleStepChange,
    enableLargeAnimation,
    setEnableLargeAnimation,
    customMapPath,
    setCustomMapPath,
    activePrunedEdges,
    setCustomPrunedEdges,
    selectedResult,
    activeEvent,
    currentIncumbentRoute,
    currentIncumbentCost
  } = useTsp()

  return (
    <div className="workspace">
      {/* Workspace Header & Action Links */}
      <div className="workspace-head border-b border-slate-200 pb-4 mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-blue-700 font-bold">
            CO4 • DEPTH-FIRST SEARCH & PRUNING WORKSPACE
          </p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Backtracking Execution Debugger
          </h2>
          <p className="muted text-slate-600 text-xs mt-0.5">
            Step through permutations, monitor live call frames, and observe branch pruning inequality: <code className="font-mono font-semibold text-slate-800">currentCost + edgeWeight ≥ bestCost</code>.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/matrix">
            <Button variant="outline" size="sm" className="text-xs h-8">
              <Settings size={13} className="mr-1.5 text-slate-500" /> Configure Matrix
            </Button>
          </Link>
          <Link href="/results">
            <Button variant="outline" size="sm" className="text-xs h-8">
              <BarChart3 size={13} className="mr-1.5 text-slate-500" /> View Results
            </Button>
          </Link>
        </div>
      </div>

      {/* Warning and Animation Toggle for 9–12 Cities */}
      {cityCount >= 9 && (
        <div className="mb-4 p-3 bg-amber-50/90 border border-amber-200 rounded-lg text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={17} className="text-amber-600 flex-none" />
            <span>
              <strong>High Problem Complexity (N = {cityCount}):</strong> Backtracking explores up to (N-1)! permutations. Step-by-step animation is disabled by default to maintain fast execution and prevent browser lag.
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer font-semibold text-amber-800 bg-white px-2.5 py-1 rounded border border-amber-200">
            <input
              type="checkbox"
              checked={enableLargeAnimation}
              onChange={e => {
                setEnableLargeAnimation(e.target.checked)
                handleStepChange(0)
              }}
              className="accent-amber-600 rounded cursor-pointer"
            />
            <span>Enable Animation (N ≥ 9)</span>
          </label>
        </div>
      )}

      {/* Main Responsive Two-Column Layout: Route Map (Left) & Inspector (Right) */}
      <div className="algo-workbench-grid items-start gap-4">
        {/* Left Column: Route Map with Visual Network */}
        <div className="flex flex-col">
          <RouteMap
            matrix={currentMatrix}
            names={names}
            event={activeEvent}
            bestRoute={currentIncumbentRoute || []}
            start={startCity}
            customActivePath={customMapPath}
            prunedEdges={activePrunedEdges}
            modeLabel="Synchronized DFS Branch & Pruning"
          />
        </div>

        {/* Right Column: Execution Workbench Panel */}
        <section className="panel execution flex flex-col space-y-4">
          <div className="panel-head border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <p className="eyebrow text-slate-500 font-bold">STATE-SPACE RECURSION</p>
              <h3 className="text-base font-bold text-slate-900 m-0">
                Backtracking Call Stack & Search Tree
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {customMapPath && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomMapPath(null)
                    setCustomPrunedEdges(null)
                  }}
                  className="text-[11px] font-semibold px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  Reset Map Selection
                </button>
              )}
              <span className="status font-mono text-[11px] font-bold">
                <i />{' '}
                {cursor >= selectedResult.events.length - 1
                  ? selectedResult.timedOut
                    ? 'TIMED OUT'
                    : selectedResult.cancelled
                    ? 'CANCELLED'
                    : 'FINISHED'
                  : 'EXPLORING'}
              </span>
            </div>
          </div>

          {/* Shared Playback Engine Controls */}
          <PlaybackController
            currentStep={cursor}
            totalSteps={selectedResult.events.length}
            isPlaying={isPlaying}
            onStepChange={handleStepChange}
            onPlayingChange={setIsPlaying}
            onReset={() => handleStepChange(0)}
          />

          {/* Full Backtracking Inspector (SVG Tree, Stack, Decision Box, Collapsible Pseudocode & Log) */}
          <BacktrackingInspector
            result={selectedResult}
            event={activeEvent}
            names={names}
            cursor={cursor}
            start={startCity}
            onStepSelect={step => handleStepChange(step)}
            onHoverOrSelectPath={path => setCustomMapPath(path)}
          />
        </section>
      </div>
    </div>
  )
}
