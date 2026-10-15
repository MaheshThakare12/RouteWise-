'use client'

import React, { useMemo, useState } from 'react'
import {
  GitBranch,
  ShieldCheck,
  CircleHelp,
  RotateCcw,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Info,
  AlertTriangle,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlgorithmEvent,
  AlgorithmResult,
  Matrix,
  puneMatrix,
  fourCityTestMatrix,
  solveBacktracking,
  formatRoute,
  cloneMatrix,
  getCityNames,
  expandOrResizeMatrix
} from '@/lib/algorithms'
import { RouteMap } from '@/components/route-map'
import { PlaybackController } from '@/components/playback-controller'
import { MatrixPanel } from '@/components/matrix-panel'
import { BacktrackingInspector } from '@/components/backtracking-inspector'
import { TestSuiteTab } from '@/components/test-suite-tab'
import { VivaDrawer } from '@/components/viva-drawer'

const tabs = [
  { id: 'visualizer', label: 'Backtracking Visualizer', icon: GitBranch },
  { id: 'tests', label: 'Test Suite', icon: ShieldCheck }
]

function StatCard({ label, value, tone = 'blue' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className={`stat tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default function Page() {
  const [activeTab, setActiveTab] = useState('visualizer')
  const [cityCount, setCityCount] = useState(8)
  const [customCountInput, setCustomCountInput] = useState('8')
  const [inputError, setInputError] = useState<string | null>(null)
  const [hasCustomEdits, setHasCustomEdits] = useState(false)
  const [enableLargeAnimation, setEnableLargeAnimation] = useState(false)
  const [startCity, setStartCity] = useState(0)
  const [matrix, setMatrix] = useState<Matrix>(() => cloneMatrix(puneMatrix))
  const [cursor, setCursor] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [vivaOpen, setVivaOpen] = useState(false)
  const [customMapPath, setCustomMapPath] = useState<number[] | null>(null)
  const [customPrunedEdges, setCustomPrunedEdges] = useState<Array<[number, number]> | null>(null)

  // Sub-matrix according to current city count
  const currentMatrix = useMemo(() => {
    return matrix.slice(0, cityCount).map(row => row.slice(0, cityCount))
  }, [matrix, cityCount])

  // City names: First 8 are Pune landmarks, 9-12 are labeled "Custom City 9", etc.
  const names = useMemo(() => {
    return getCityNames(cityCount)
  }, [cityCount])

  const solveOptions = useMemo(() => {
    return {
      animated: cityCount <= 8 || enableLargeAnimation,
      timeoutMs: 5000
    }
  }, [cityCount, enableLargeAnimation])

  // Solve TSP using Backtracking with branch pruning
  const selectedResult: AlgorithmResult = useMemo(() => {
    return solveBacktracking(currentMatrix, startCity, solveOptions)
  }, [currentMatrix, startCity, solveOptions])

  // Active event from timeline
  const activeEvent: AlgorithmEvent = useMemo(() => {
    const events = selectedResult.events
    if (!events || events.length === 0) {
      return {
        type: 'START',
        message: 'No events generated.',
        path: [startCity],
        bestCostSoFar: Infinity,
        bestRouteSoFar: [],
        explored: 0,
        pruned: 0,
        cost: 0
      }
    }
    const idx = Math.min(cursor, events.length - 1)
    return events[idx]
  }, [selectedResult, cursor, startCity])

  // Synchronized pruned edges for RouteMap
  const activePrunedEdges = useMemo(() => {
    if (customPrunedEdges) return customPrunedEdges
    const edges: Array<[number, number]> = []
    if (activeEvent?.type === 'NODE_PRUNED' && activeEvent.path && activeEvent.path.length >= 2) {
      const len = activeEvent.path.length
      edges.push([activeEvent.path[len - 2], activeEvent.path[len - 1]])
    } else if (activeEvent?.type === 'EDGE_REJECTED' && cursor > 0) {
      const prev = selectedResult.events[cursor - 1]
      if (prev?.type === 'NODE_PRUNED' && prev.path && prev.path.length >= 2) {
        const len = prev.path.length
        edges.push([prev.path[len - 2], prev.path[len - 1]])
      }
    }
    return edges
  }, [customPrunedEdges, activeEvent, cursor, selectedResult.events])

  // Current incumbent best cost and route at this exact playback step
  const currentIncumbentCost = useMemo(() => {
    if (cursor >= selectedResult.events.length - 1) {
      if (selectedResult.timedOut) return 'Timed out'
      if (selectedResult.cancelled) return 'Cancelled'
    }
    if (activeEvent?.bestCostSoFar === undefined || activeEvent.bestCostSoFar === Infinity) {
      return '∞'
    }
    return activeEvent.bestCostSoFar
  }, [activeEvent, selectedResult, cursor])

  const currentIncumbentRoute = useMemo(() => {
    if (activeEvent?.bestRouteSoFar && activeEvent.bestRouteSoFar.length > 0) {
      return activeEvent.bestRouteSoFar
    }
    return null
  }, [activeEvent])

  const applyCityCountChange = (newCount: number) => {
    if (isNaN(newCount) || newCount < 4 || newCount > 12) {
      setInputError('Please enter a valid city count between 4 and 12.')
      return
    }
    if (hasCustomEdits) {
      const ok = window.confirm(
        'You have unsaved edits to the distance matrix. Changing the city count will resize the matrix. Do you want to proceed?'
      )
      if (!ok) return
      setHasCustomEdits(false)
    }
    setInputError(null)
    setCityCount(newCount)
    setCustomCountInput(String(newCount))
    setMatrix(prev => expandOrResizeMatrix(prev, newCount))
    if (startCity >= newCount) setStartCity(0)
    setCursor(0)
    setIsPlaying(false)
    setCustomMapPath(null)
    setCustomPrunedEdges(null)
  }

  const handleReset = () => {
    setMatrix(cloneMatrix(puneMatrix))
    setCityCount(8)
    setCustomCountInput('8')
    setInputError(null)
    setHasCustomEdits(false)
    setStartCity(0)
    setCursor(0)
    setIsPlaying(false)
    setCustomMapPath(null)
    setCustomPrunedEdges(null)
  }

  const handleLoadFourCity = () => {
    setMatrix(cloneMatrix(fourCityTestMatrix))
    setCityCount(4)
    setCustomCountInput('4')
    setInputError(null)
    setHasCustomEdits(false)
    setStartCity(0)
    setCursor(0)
    setIsPlaying(false)
    setCustomMapPath(null)
    setCustomPrunedEdges(null)
  }

  const handleStepChange = (nextStep: number | ((prev: number) => number)) => {
    setCursor(nextStep)
    setCustomMapPath(null)
    setCustomPrunedEdges(null)
  }

  return (
    <main className="app-shell">
      {/* Top Navbar */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <GitBranch size={16} />
          </div>
          <div>
            <h1>
              ROUTEWISE <span>SMART TOUR ROUTE OPTIMIZER</span>
            </h1>
            <p>Travelling Salesperson Problem — Backtracking Algorithm (TY IT • DAA CO4).</p>
          </div>
        </div>

        <div className="header-actions">
          <span className="local">
            <i /> LOCAL COMPUTATION
          </span>
          <Button variant="outline" size="sm" onClick={() => setVivaOpen(true)}>
            <CircleHelp size={13} className="mr-1" /> Viva Mode
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw size={13} className="mr-1" /> Reset
          </Button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="layout">
        {/* Compact Navigation Bar */}
        <nav className="sidebar">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id)
                setCursor(0)
                setIsPlaying(false)
                setCustomMapPath(null)
                setCustomPrunedEdges(null)
              }}
              className={activeTab === id ? 'nav-item active' : 'nav-item'}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>

        {/* Workspace Container */}
        <div className="workspace">
          {/* Synthetic Data Notice */}
          <div className="notice">
            <span>
              <Sparkles size={14} /> SYNTHETIC DEMONSTRATION DATA
            </span>
            <p>
              Distances and coordinates are illustrative benchmarks based on Pune landmarks. No live map APIs or API keys required.
            </p>
          </div>

          {/* Workspace Heading & 3 Pastel Stat Cards */}
          <div className="workspace-head">
            <div>
              <p className="eyebrow">DESIGN & ANALYSIS OF ALGORITHMS • EXACT TSP BACKTRACKING (CO4)</p>
              <h2>
                {activeTab === 'visualizer'
                  ? 'Backtracking — Recursive Search Workspace'
                  : 'Automated Verification & Test Suite'}
              </h2>
              <p className="muted">
                {activeTab === 'visualizer'
                  ? 'Explore depth-first state-space tree traversal, branch pruning (currentCost + edgeWeight ≥ bestCost), and live LIFO call stack.'
                  : 'Comprehensive automated verification against Brute Force ground truth and textbook benchmarks.'}
              </p>
            </div>

            <div className="head-stats">
              <StatCard label="CITIES" value={cityCount} tone="blue" />
              <StatCard
                label="START CITY"
                value={`C${startCity + 1} (${names[startCity]?.startsWith('Custom City') ? names[startCity] : names[startCity]?.split(' ')[0]})`}
                tone="green"
              />
              <StatCard label="INCUMBENT COST" value={currentIncumbentCost} tone="amber" />
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'tests' ? (
            <TestSuiteTab />
          ) : (
            <>
              {/* Controls bar: City slider, Custom Number of Cities input, Start city dropdown */}
              <div className="controls-row flex-wrap gap-3">
                {/* 1. Existing City-Count Slider (4–8 cities) */}
                <label className="text-xs text-slate-700 flex items-center gap-2">
                  <span className="font-medium whitespace-nowrap">Cities ({cityCount <= 8 ? cityCount : '8+'}):</span>
                  <input
                    type="range"
                    min="4"
                    max="8"
                    value={Math.min(cityCount, 8)}
                    onChange={e => {
                      applyCityCountChange(Number(e.target.value))
                    }}
                    className="accent-blue-600 w-24 cursor-pointer"
                    aria-label="Preset city count slider (4 to 8 cities)"
                  />
                  <span className="font-mono text-xs font-bold text-blue-700">
                    {cityCount <= 8 ? `${cityCount} cities` : `${cityCount} (custom)`}
                  </span>
                </label>

                {/* 2. Custom Number of Cities Numeric Input & Apply Button */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
                  <label htmlFor="custom-city-input" className="text-xs font-medium text-slate-700 whitespace-nowrap">
                    Custom Number of Cities:
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
                    className="h-7 text-xs font-semibold px-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                  >
                    Apply City Count
                  </Button>
                </div>

                {/* 3. Start City Selector */}
                <div className="flex items-center gap-2">
                  <label htmlFor="start-city-select" className="text-xs font-medium text-slate-700">Start:</label>
                  <select
                    id="start-city-select"
                    value={startCity}
                    onChange={e => {
                      setStartCity(Number(e.target.value))
                      setCursor(0)
                      setIsPlaying(false)
                      setCustomMapPath(null)
                      setCustomPrunedEdges(null)
                    }}
                    className="bg-white text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm cursor-pointer"
                    style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                  >
                    {names.map((name, i) => (
                      <option
                        key={name}
                        value={i}
                        className="bg-white text-slate-900 font-medium py-1"
                        style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
                      >
                        C{i + 1} — {name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inline Input Validation Error Message */}
              {inputError && (
                <div className="mt-2 mb-1 p-2.5 bg-red-50 text-red-700 text-xs rounded-md border border-red-200 flex items-center gap-2">
                  <AlertCircle size={15} className="text-red-600 flex-none" />
                  <span className="font-medium">{inputError}</span>
                </div>
              )}

              {/* Warning and Animation Toggle for 9–12 Cities */}
              {cityCount >= 9 && (
                <div className="mt-2 mb-2 p-3 bg-amber-50/90 border border-amber-200 rounded-lg text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle size={17} className="text-amber-600 flex-none" />
                    <span>
                      <strong>High Problem Complexity (N = {cityCount}):</strong> Backtracking explores up to (N-1)! permutations. Step-by-step animation is disabled by default to maintain fast execution and prevent browser lag.
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-amber-800 bg-white/80 px-2.5 py-1 rounded border border-amber-200">
                    <input
                      type="checkbox"
                      checked={enableLargeAnimation}
                      onChange={e => {
                        setEnableLargeAnimation(e.target.checked)
                        setCursor(0)
                      }}
                      className="accent-amber-600 rounded"
                    />
                    <span>Enable Step-by-Step Animation (N ≥ 9)</span>
                  </label>
                </div>
              )}

              {/* Main Visualization Grid: RouteMap on Left, Backtracking Workspace on Right */}
              <div className="algo-workbench-grid">
                <RouteMap
                  matrix={currentMatrix}
                  names={names}
                  event={activeEvent}
                  bestRoute={currentIncumbentRoute || []}
                  start={startCity}
                  customActivePath={customMapPath}
                  prunedEdges={activePrunedEdges}
                />

                {/* Backtracking Workbench Panel */}
                <section className="panel execution">
                  <div className="panel-head">
                    <div>
                      <p className="eyebrow">
                        CO4 • DEPTH-FIRST RECURSIVE SEARCH & CALL STACK INSPECTOR
                      </p>
                      <h2>Backtracking — Recursive Search Workspace</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      {customMapPath && (
                        <button
                          onClick={() => {
                            setCustomMapPath(null)
                            setCustomPrunedEdges(null)
                          }}
                          className="text-[11px] font-semibold px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                        >
                          Reset Map Selection
                        </button>
                      )}
                      <span className="status">
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

                  {/* Playback Controls */}
                  <PlaybackController
                    currentStep={cursor}
                    totalSteps={selectedResult.events.length}
                    isPlaying={isPlaying}
                    onStepChange={handleStepChange}
                    onPlayingChange={setIsPlaying}
                    onReset={() => handleStepChange(0)}
                  />

                  {/* Backtracking Inspector */}
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

              {/* Lower Section: Input Distance Matrix & Tour Result Inspector */}
              <div className="lower-grid">
                <MatrixPanel
                  matrix={currentMatrix}
                  names={names}
                  start={startCity}
                  onMatrixChange={newMat => {
                    const full = matrix.map(r => [...r])
                    for (let i = 0; i < cityCount; i++) {
                      for (let j = 0; j < cityCount; j++) {
                        full[i][j] = newMat[i][j]
                      }
                    }
                    setMatrix(full)
                    setHasCustomEdits(true)
                    setCursor(0)
                    setIsPlaying(false)
                    setCustomMapPath(null)
                    setCustomPrunedEdges(null)
                  }}
                  onStartChange={newStart => {
                    setStartCity(newStart)
                    setCursor(0)
                    setIsPlaying(false)
                    setCustomMapPath(null)
                    setCustomPrunedEdges(null)
                  }}
                  onResetPune={handleReset}
                  onLoadFourCity={handleLoadFourCity}
                />

                <section className="panel insight">
                  <div className="panel-head">
                    <div>
                      <p className="eyebrow">TOUR RESULT INSPECTOR</p>
                      <h2>Incumbent Best Route (Event #{cursor + 1})</h2>
                    </div>
                    {cursor >= selectedResult.events.length - 1 && (selectedResult.timedOut || selectedResult.cancelled) ? (
                      <AlertCircle className="text-amber-600" size={18} />
                    ) : (
                      <CheckCircle2 className="text-emerald-600" size={18} />
                    )}
                  </div>

                  {cursor >= selectedResult.events.length - 1 && (selectedResult.timedOut || selectedResult.cancelled) ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 my-4 flex items-center gap-2">
                      <AlertCircle size={14} className="text-amber-600 flex-none" />
                      <span>
                        Search terminated early (<strong>{selectedResult.statusMessage || (selectedResult.timedOut ? 'Timed out' : 'Cancelled')}</strong>). Optimality is <strong>not proven</strong>, so no global optimal tour is claimed.
                      </span>
                    </div>
                  ) : currentIncumbentRoute ? (
                    <div className="route-result">
                      {currentIncumbentRoute.map((city, idx) => (
                        <span key={`${city}-${idx}`}>
                          <b>{city === startCity ? 'START' : `C${city + 1}`}</b>
                          <small>{names[city]}</small>
                          {idx < currentIncumbentRoute.length - 1 && <ArrowRight size={12} />}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded text-xs text-slate-500 my-4 flex items-center gap-2">
                      <Info size={14} className="text-blue-500 flex-none" />
                      <span>
                        Initial incumbent best cost is <strong>∞</strong>. No complete feasible tour has been formed yet. Advance playback steps to observe tour discovery.
                      </span>
                    </div>
                  )}

                  <div className="complexity">
                    <div>
                      <span>TIME COMPLEXITY</span>
                      <b>O((n − 1)!) worst-case</b>
                      <small className="text-[9px] text-slate-500 font-normal">
                        Pruned heavily in practice
                      </small>
                    </div>
                    <div>
                      <span>SPACE COMPLEXITY</span>
                      <b>O(n)</b>
                      <small className="text-[9px] text-slate-500 font-normal">
                        Recursion call stack & visited array
                      </small>
                    </div>
                    <div>
                      <span>COURSE OUTCOME</span>
                      <b className="text-blue-700">CO4 (Backtracking)</b>
                      <small className="text-[9px] text-slate-500 font-normal">
                        DFS Permutation Search
                      </small>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Viva Mode Drawer */}
      <VivaDrawer open={vivaOpen} onClose={() => setVivaOpen(false)} />
    </main>
  )
}
