'use client'

import React, { useState } from 'react'
import { AlgorithmResult, Matrix } from '@/lib/algorithms/types'
import { formatRoute } from '@/lib/algorithms/matrix-utils'
import { solveBruteForce } from '@/lib/algorithms/brute-force'
import { BenchmarkRunResult, runBenchmarkForN, exportBenchmarkCSV } from '@/lib/algorithms/benchmark'
import { CheckCircle2, AlertTriangle, Download, Play, Square, LineChart } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ComparisonTabProps {
  matrix: Matrix
  results: AlgorithmResult[]
  names: string[]
  start: number
}

export function ComparisonTab({ matrix, results, names, start }: ComparisonTabProps) {
  const n = matrix.length
  const [benchmarking, setBenchmarking] = useState(false)
  const [benchmarkProgress, setBenchmarkProgress] = useState(0)
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkRunResult[]>([])
  const [scaleMode, setScaleMode] = useState<'linear' | 'log'>('linear')

  // Run brute-force verification for current matrix if n <= 9
  const bfResult = React.useMemo(() => {
    if (n <= 9) {
      return solveBruteForce(matrix, start)
    }
    return null
  }, [matrix, start, n])

  // Check if all completed algorithms agree on cost
  const completedResults = results.filter(r => !r.timedOut && !r.cancelled)
  const allCosts = completedResults.map(r => r.cost)
  if (bfResult) allCosts.push(bfResult.cost)
  const isVerified = completedResults.length > 0 && new Set(allCosts).size === 1
  const verifiedCost = completedResults[0]?.cost ?? 'N/A'

  // Benchmark runner for n = 5 to 12
  const handleStartBenchmark = async () => {
    setBenchmarking(true)
    setBenchmarkProgress(0)
    const collected: BenchmarkRunResult[] = []

    for (let testN = 5; testN <= 12; testN++) {
      setBenchmarkProgress(testN)
      // Small pause so UI stays responsive
      await new Promise(r => setTimeout(r, 40))
      const res = runBenchmarkForN(testN)
      collected.push(res)
      setBenchmarkResults([...collected])
    }

    setBenchmarking(false)
  }

  const handleDownloadCSV = () => {
    if (benchmarkResults.length === 0) return
    const csvContent = exportBenchmarkCSV(benchmarkResults)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `routewise_tsp_benchmark_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Chart rendering helpers
  const maxN = 12
  const minN = 5
  const chartWidth = 520
  const chartHeight = 200
  const padding = 36

  const getTimeVal = (val: number) => {
    if (scaleMode === 'log') {
      return Math.log10(Math.max(val, 0.01))
    }
    return val
  }

  // Find max time for scaling
  let maxTime = 1
  benchmarkResults.forEach(r => {
    if (!r.data.backtracking.timedOut) maxTime = Math.max(maxTime, r.data.backtracking.timeMs)
    if (!r.data.lcbb.timedOut) maxTime = Math.max(maxTime, r.data.lcbb.timeMs)
    maxTime = Math.max(maxTime, r.data.heldKarp.timeMs)
  })
  const maxTimeScaled = getTimeVal(maxTime)
  const minTimeScaled = scaleMode === 'log' ? -2 : 0

  const getX = (currN: number) => {
    return padding + ((currN - minN) / (maxN - minN)) * (chartWidth - 2 * padding)
  }

  const getYTime = (val: number) => {
    const scaled = getTimeVal(val)
    const ratio = (scaled - minTimeScaled) / (maxTimeScaled - minTimeScaled || 1)
    return chartHeight - padding - ratio * (chartHeight - 2 * padding)
  }

  return (
    <div className="space-y-4">
      {/* Current Matrix Side-by-Side Comparison */}
      <section className="panel comparison-card">
        <div className="panel-head">
          <div>
            <p className="eyebrow">EXACT TSP COMPARISON (n = {n})</p>
            <h2>Performance & Exact Optimality on Current Matrix</h2>
          </div>
          <span className={isVerified ? 'verified' : 'failed'}>
            {isVerified ? (
              <>
                <CheckCircle2 size={14} /> {completedResults.length === results.length ? 'ALL ALGORITHMS VERIFIED' : 'COMPLETED ALGORITHMS VERIFIED'} (Cost: {verifiedCost})
              </>
            ) : (
              <>
                <AlertTriangle size={14} /> COST MISMATCH DETECTED
              </>
            )}
          </span>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="results-table">
            <thead>
              <tr>
                <th>Algorithm</th>
                <th>Optimal Cost</th>
                <th>Tour Route</th>
                <th>Duration (ms)</th>
                <th>Work Done</th>
                <th>Pruned Nodes</th>
                <th>Optimality Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.algorithm}>
                  <td>
                    <strong>
                      {r.algorithm === 'held-karp'
                        ? 'Held-Karp DP (CO3)'
                        : r.algorithm === 'lcbb'
                        ? 'Least Cost B&B (CO5)'
                        : 'Backtracking DFS (CO4)'}
                    </strong>
                  </td>
                  <td className={r.timedOut ? "text-amber-600 font-bold font-mono" : r.cancelled ? "text-slate-500 font-bold font-mono" : "green-text font-bold font-mono"}>
                    {r.timedOut ? 'Timed out' : r.cancelled ? 'Cancelled' : r.cost}
                  </td>
                  <td className="text-xs font-mono">{r.timedOut || r.cancelled ? 'N/A' : formatRoute(r.route, names)}</td>
                  <td className="font-mono">{r.duration.toFixed(3)} ms</td>
                  <td className="font-mono">
                    {r.algorithm === 'held-karp'
                      ? `${r.dpStates} DP states`
                      : `${r.explored} nodes explored`}
                  </td>
                  <td className="font-mono text-slate-500">{r.pruned}</td>
                  <td>
                    {r.timedOut ? (
                      <span className="text-amber-700 font-medium text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Timed Out (&gt; limit)
                      </span>
                    ) : r.cancelled ? (
                      <span className="text-slate-700 font-medium text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        Cancelled
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-medium text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Exact Global Optimal
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {/* Independent Brute Force Row (n <= 9) */}
              {bfResult && (
                <tr className="bg-slate-50/70">
                  <td>
                    <strong className="text-slate-600">
                      Brute-Force Ground Truth (Verifier)
                    </strong>
                  </td>
                  <td className="green-text font-bold font-mono">{bfResult.cost}</td>
                  <td className="text-xs font-mono">{formatRoute(bfResult.route, names)}</td>
                  <td className="font-mono">{bfResult.duration.toFixed(3)} ms</td>
                  <td className="font-mono">{bfResult.explored} tours evaluated</td>
                  <td className="font-mono text-slate-400">0 (exhausted)</td>
                  <td>
                    <span className="text-blue-700 font-medium text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Ground Truth Match
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Benchmark Harness for n = 5 through 12 */}
      <section className="panel p-4 bg-white border border-slate-200 rounded-lg">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
          <div>
            <p className="eyebrow">AUTOMATED EMPIRICAL BENCHMARKS</p>
            <h2 className="text-base font-bold text-slate-900">
              Scalability Suite (n = 5 through n = 12)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Executes all three algorithms on identical seeded symmetric matrices measuring genuine CPU time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                type="button"
                className={`px-2 py-0.5 rounded font-medium ${
                  scaleMode === 'linear'
                    ? 'bg-white shadow-sm text-blue-700'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                onClick={() => setScaleMode('linear')}
              >
                Linear Scale
              </button>
              <button
                type="button"
                className={`px-2 py-0.5 rounded font-medium ${
                  scaleMode === 'log'
                    ? 'bg-white shadow-sm text-blue-700'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                onClick={() => setScaleMode('log')}
              >
                Logarithmic
              </button>
            </div>

            <Button
              size="sm"
              disabled={benchmarking}
              onClick={handleStartBenchmark}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Play size={13} className="mr-1" />
              {benchmarking ? `Running n=${benchmarkProgress}...` : 'Run Benchmarks'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={benchmarkResults.length === 0}
              onClick={handleDownloadCSV}
            >
              <Download size={13} className="mr-1" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Real SVG Charts */}
        {benchmarkResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1: Time vs N */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <LineChart size={13} className="text-blue-600" /> Execution Time ({scaleMode === 'log' ? 'log10 ms' : 'ms'}) vs City Count (n)
                </span>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="flex items-center gap-1 text-blue-600">
                    <span className="w-2.5 h-0.5 bg-blue-600 inline-block" /> Held-Karp
                  </span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <span className="w-2.5 h-0.5 bg-amber-600 inline-block" /> LCBB
                  </span>
                  <span className="flex items-center gap-1 text-purple-600">
                    <span className="w-2.5 h-0.5 bg-purple-600 inline-block" /> Backtracking
                  </span>
                </div>
              </div>

              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44 bg-white border border-slate-200 rounded">
                {/* Axes */}
                <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#cbd5e1" strokeWidth="1" />
                <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#cbd5e1" strokeWidth="1" />

                {/* X labels */}
                {benchmarkResults.map(r => (
                  <text key={r.n} x={getX(r.n)} y={chartHeight - padding + 14} textAnchor="middle" fontSize="10" fill="#64748b">
                    {r.n}
                  </text>
                ))}

                {/* Polyline: Held-Karp */}
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2"
                  points={benchmarkResults.map(r => `${getX(r.n)},${getYTime(r.data.heldKarp.timeMs)}`).join(' ')}
                />

                {/* Polyline: LCBB */}
                <polyline
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="2"
                  points={benchmarkResults.filter(r => !r.data.lcbb.timedOut).map(r => `${getX(r.n)},${getYTime(r.data.lcbb.timeMs)}`).join(' ')}
                />

                {/* Polyline: Backtracking */}
                <polyline
                  fill="none"
                  stroke="#9333ea"
                  strokeWidth="2"
                  points={benchmarkResults.filter(r => !r.data.backtracking.timedOut).map(r => `${getX(r.n)},${getYTime(r.data.backtracking.timeMs)}`).join(' ')}
                />

                {/* Data points */}
                {benchmarkResults.map(r => (
                  <g key={r.n}>
                    <circle cx={getX(r.n)} cy={getYTime(r.data.heldKarp.timeMs)} r="3" fill="#2563eb" />
                    {!r.data.lcbb.timedOut && (
                      <circle cx={getX(r.n)} cy={getYTime(r.data.lcbb.timeMs)} r="3" fill="#d97706" />
                    )}
                    {!r.data.backtracking.timedOut && (
                      <circle cx={getX(r.n)} cy={getYTime(r.data.backtracking.timeMs)} r="3" fill="#9333ea" />
                    )}
                  </g>
                ))}
              </svg>
            </div>

            {/* Benchmark Table Summary */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg overflow-y-auto max-h-56">
              <span className="text-xs font-bold text-slate-700 block mb-2">
                Empirical Run Values Table
              </span>
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="p-1 text-left font-mono">n</th>
                    <th className="p-1 text-right text-purple-700">BT (ms)</th>
                    <th className="p-1 text-right text-amber-700">LCBB (ms)</th>
                    <th className="p-1 text-right text-blue-700">HK (ms)</th>
                    <th className="p-1 text-right font-mono">Optimum</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmarkResults.map(r => (
                    <tr key={r.n} className="border-b border-slate-100 font-mono">
                      <td className="p-1 font-bold">{r.n}</td>
                      <td className="p-1 text-right text-purple-900">
                        {r.data.backtracking.timedOut ? 'timeout' : `${r.data.backtracking.timeMs.toFixed(2)}`}
                      </td>
                      <td className="p-1 text-right text-amber-900">
                        {r.data.lcbb.timedOut ? 'timeout' : `${r.data.lcbb.timeMs.toFixed(2)}`}
                      </td>
                      <td className="p-1 text-right text-blue-900 font-semibold">
                        {r.data.heldKarp.timeMs.toFixed(2)}
                      </td>
                      <td className="p-1 text-right text-emerald-700 font-bold">
                        {r.data.heldKarp.cost}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-100 rounded-lg">
            <p className="text-sm font-medium">No benchmark data collected yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Click &quot;Run Benchmarks&quot; to test all algorithms across city sizes n = 5 through 12 on seeded matrices with live SVG charts.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
