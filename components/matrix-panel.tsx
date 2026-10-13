'use client'

import React, { useState } from 'react'
import { Matrix } from '@/lib/algorithms/types'
import { seededMatrix, puneMatrix, fourCityTestMatrix, validateMatrix } from '@/lib/algorithms/matrix-utils'
import { RotateCcw, Shuffle, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MatrixPanelProps {
  matrix: Matrix
  names: string[]
  start: number
  onMatrixChange: (newMatrix: Matrix) => void
  onStartChange: (newStart: number) => void
  onResetPune: () => void
  onLoadFourCity: () => void
}

export function MatrixPanel({
  matrix,
  names,
  start,
  onMatrixChange,
  onStartChange,
  onResetPune,
  onLoadFourCity
}: MatrixPanelProps) {
  const [error, setError] = useState<string | null>(null)
  const validation = validateMatrix(matrix)

  const handleCellChange = (row: number, col: number, valueStr: string) => {
    if (row === col) return

    const parsed = parseInt(valueStr, 10)
    if (isNaN(parsed) || parsed <= 0) {
      setError(`Distance must be a positive integer (> 0).`)
      return
    }

    setError(null)
    const nextMatrix = matrix.map(r => [...r])
    nextMatrix[row][col] = parsed
    nextMatrix[col][row] = parsed // Enforce symmetric distance
    onMatrixChange(nextMatrix)
  }

  return (
    <section className="panel matrix-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">INPUT DISTANCE MATRIX</p>
          <h2>Symmetric Graph (Complete TSP)</h2>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const rand = seededMatrix(matrix.length, Math.floor(Math.random() * 10000))
              setError(null)
              onMatrixChange(rand)
            }}
          >
            <Shuffle size={13} className="mr-1" /> Randomize
          </Button>

          <Button variant="outline" size="sm" onClick={onResetPune}>
            <RotateCcw size={13} className="mr-1" /> Reset Pune
          </Button>

          <Button variant="outline" size="sm" onClick={onLoadFourCity}>
            <BookOpen size={13} className="mr-1" /> 4-City Textbook
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 mt-2 mb-3">
        <p className="muted m-0">
          Editable undirected distance matrix. Distances are symmetric <code className="text-slate-700">d(u,v) = d(v,u)</code> and non-negative.
        </p>

        {validation.valid ? (
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <CheckCircle2 size={13} /> Valid symmetric matrix
          </span>
        ) : (
          <span className="flex items-center gap-1 text-red-600 font-medium">
            <AlertCircle size={13} /> {validation.error}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-2 p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">
          {error}
        </div>
      )}

      <div className="matrix-scroll overflow-x-auto pb-3 pt-1 rounded-lg border border-slate-200 bg-white">
        <table className="w-auto border-separate border-spacing-2 m-auto md:m-0 text-left">
          <thead>
            <tr className="bg-slate-50/80">
              <th className="p-2 text-slate-400 font-mono text-center text-xs w-12 bg-slate-50 rounded-tl">
                —
              </th>
              {names.map((name, i) => (
                <th
                  key={i}
                  className="p-2 text-center min-w-[76px] bg-slate-50 border border-slate-200 rounded-md align-bottom"
                >
                  <div className="text-blue-700 font-bold text-sm">C{i + 1}</div>
                  <div
                    className="text-[11px] text-slate-700 font-medium truncate max-w-[80px] mx-auto leading-tight"
                    title={`City ${i + 1} — ${name}`}
                  >
                    {name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <th className="p-2.5 font-mono text-left min-w-[140px] bg-slate-50 border border-slate-200 rounded-md align-middle">
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-700 font-bold text-sm">C{i + 1}</span>
                    <span className="text-slate-300 font-normal">|</span>
                    <span
                      className="text-xs text-slate-800 font-semibold truncate max-w-[96px]"
                      title={names[i]}
                    >
                      {names[i]}
                    </span>
                  </div>
                </th>
                {row.map((val, j) => (
                  <td key={j} className="p-0.5 text-center align-middle">
                    <input
                      type="number"
                      min={1}
                      disabled={i === j}
                      aria-label={`Distance between City ${i + 1} (${names[i]}) and City ${j + 1} (${names[j]})`}
                      className={`w-[68px] h-[42px] text-center font-mono text-[15px] font-bold rounded-[6px] border transition-all ${
                        i === j
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none'
                          : 'bg-white text-slate-900 border-slate-300 hover:border-blue-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-xs'
                      }`}
                      style={{
                        backgroundColor: i === j ? '#f1f5f9' : '#ffffff',
                        color: i === j ? '#64748b' : '#0f172a',
                        borderColor: i === j ? '#e2e8f0' : '#cbd5e1',
                        fontSize: '15px'
                      }}
                      value={i === j ? 0 : val}
                      onChange={e => handleCellChange(i, j, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
