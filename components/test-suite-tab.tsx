'use client'

import React, { useState } from 'react'
import { runFourCityTest, runSingleRandomTest, TestResultItem } from '@/lib/algorithms/test-suite'
import { ShieldCheck, CheckCircle2, AlertTriangle, Play, RefreshCw, Layers, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TestSuiteTab() {
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [results, setResults] = useState<TestResultItem[]>([])
  const [fourCityResult, setFourCityResult] = useState(() => runFourCityTest())

  const handleRunFourCity = () => {
    setFourCityResult(runFourCityTest())
  }

  const handleRunAllTests = async () => {
    setRunning(true)
    setCompleted(0)
    setResults([])

    const total = 200
    const accumulated: TestResultItem[] = []

    for (let i = 0; i < total; i++) {
      const item = runSingleRandomTest(i)
      accumulated.push(item)
      // Update UI state every 10 tests or at the end
      if (i % 10 === 0 || i === total - 1) {
        setCompleted(i + 1)
        setResults([...accumulated])
        // Yield to browser rendering loop
        await new Promise(r => setTimeout(r, 10))
      }
    }

    setRunning(false)
  }

  const passedCount = results.filter(r => r.passed).length
  const failedCount = results.filter(r => !r.passed).length

  return (
    <div className="space-y-4">
      {/* 1. Canonical 4-City Textbook Backtracking Verification */}
      <section className="panel p-4 bg-white border border-slate-200 rounded-lg">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
          <div>
            <p className="eyebrow">CANONICAL TEXTBOOK VERIFICATION</p>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GitBranch size={16} className="text-blue-600" />
              Known 4-City Textbook Backtracking Optimum Case
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Input: A-B=10, A-C=15, A-D=20, B-C=35, B-D=25, C-D=30 (Known Optimum Cost = 80).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                fourCityResult.passed
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {fourCityResult.passed ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              {fourCityResult.passed ? 'PASSED (80 / 80)' : 'FAILED'}
            </span>

            <Button size="sm" variant="outline" onClick={handleRunFourCity}>
              <RefreshCw size={13} className="mr-1" /> Re-test
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 bg-blue-50/60 rounded border border-blue-200">
            <span className="text-[10px] text-blue-700 block uppercase font-bold">Backtracking Cost</span>
            <strong className="text-blue-900 font-mono text-base">
              {fourCityResult.backtrackingCost}
            </strong>
            <span className="text-[10px] text-emerald-600 block">(Expected: 80)</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Expected Optimum</span>
            <strong className="text-slate-800 font-mono text-base">
              {fourCityResult.expectedCost}
            </strong>
            <span className="text-[10px] text-slate-500 block">Exact ground truth</span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded border border-slate-200 sm:col-span-2">
            <span className="text-[10px] text-slate-500 block uppercase font-bold">Optimal Tour Route</span>
            <strong className="text-slate-800 font-mono text-xs block truncate mt-0.5">
              {fourCityResult.optimalRoute}
            </strong>
            <span className="text-[10px] text-emerald-600 block">Valid Hamiltonian cycle starting at City A</span>
          </div>
        </div>
      </section>

      {/* 2. 200 Randomized Test Suite Runner */}
      <section className="panel p-4 bg-white border border-slate-200 rounded-lg">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
          <div>
            <p className="eyebrow">AUTOMATED TEST HARNESS</p>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={16} className="text-blue-600" />
              200 Reproducible Random Matrix Assertions (n = 4..9)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tests Backtracking against independent Brute Force ground truth for exact tour cost and valid cycle structure.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={running}
              onClick={handleRunAllTests}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Play size={13} className="mr-1" />
              {running ? `Running (${completed}/200)...` : 'Run 200 Tests'}
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        {running && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-600 mb-1">
              <span>Executing Backtracking test batch...</span>
              <span>{completed} / 200 ({((completed / 200) * 100).toFixed(0)}%)</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-100"
                style={{ width: `${(completed / 200) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Summary counts */}
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-medium">
                  Total Executed
                </span>
                <strong className="text-xl text-slate-800">{results.length}</strong>
              </div>
              <Layers size={18} className="text-slate-400" />
            </div>

            <div className="p-3 bg-emerald-50 rounded border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-700 uppercase block font-medium">
                  Passed Tests
                </span>
                <strong className="text-xl text-emerald-800">{passedCount}</strong>
              </div>
              <CheckCircle2 size={18} className="text-emerald-600" />
            </div>

            <div className="p-3 bg-red-50 rounded border border-red-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-red-700 uppercase block font-medium">
                  Failed Tests
                </span>
                <strong className="text-xl text-red-800">{failedCount}</strong>
              </div>
              <AlertTriangle size={18} className="text-red-500" />
            </div>
          </div>
        )}

        {/* Results Log Table */}
        {results.length > 0 ? (
          <div className="max-h-72 overflow-y-auto border border-slate-200 rounded">
            <table className="text-xs border-collapse w-full">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-2 text-left text-slate-500 font-mono">ID</th>
                  <th className="p-2 text-left text-slate-700 font-medium">Test Case</th>
                  <th className="p-2 text-center text-slate-700 font-medium">Status</th>
                  <th className="p-2 text-left text-slate-700 font-medium">Details</th>
                  <th className="p-2 text-right text-slate-500 font-mono">Time (ms)</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2 text-slate-400 font-mono text-[11px]">#{r.id}</td>
                    <td className="p-2 text-slate-800 font-medium">{r.description}</td>
                    <td className="p-2 text-center">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          r.passed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {r.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="p-2 text-slate-600 font-mono text-[11px]">{r.details}</td>
                    <td className="p-2 text-right text-slate-500 font-mono">
                      {r.executionTimeMs?.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 bg-slate-50 border border-slate-100 rounded-lg">
            <p className="text-sm font-medium">Test harness ready.</p>
            <p className="text-xs text-slate-400 mt-1">
              Click &quot;Run 200 Tests&quot; to execute all 200 seeded test cases and verify Backtracking against Brute Force ground truth.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
