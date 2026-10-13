'use client'

import React from 'react'
import { X, BookOpen, HelpCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VivaDrawerProps {
  open: boolean
  onClose: () => void
}

export function VivaDrawer({ open, onClose }: VivaDrawerProps) {
  if (!open) return null

  const vivaQuestions = [
    {
      q: '1. Why is the LCBB lower bound valid?',
      a: 'The matrix reduction lower bound subtracts the minimum edge leaving each row and entering each column. Because any valid Travelling Salesperson tour must enter and leave every city exactly once, the sum of these row and column minimums represents an unavoidable lower bound on the tour cost. Since the actual edge chosen cannot cost less than the row/column minimum, the reduction sum never overestimates the true completion cost, preserving admissibility.'
    },
    {
      q: '2. How does LCBB differ from backtracking?',
      a: 'Backtracking uses Depth-First Search (DFS) with a Last-In First-Out (LIFO) stack, exploring deeply along a single path and pruning only when the accumulated cost exceeds the best incumbent. In contrast, Least Cost Branch & Bound uses Best-First Search with a min-heap priority queue, always expanding the unvisited state with the smallest lower bound regardless of depth. LCBB usually explores significantly fewer nodes on dense graphs at the expense of higher memory (storing matrices in the heap).'
    },
    {
      q: '3. Why does Held-Karp contain a 2ⁿ factor?',
      a: 'In the Bellman-Held-Karp dynamic programming formulation, a state is defined as dp[S][j], where S is the subset of cities visited so far, and j is the ending city. For a graph of n cities, there are 2ⁿ possible subsets of vertices. For each subset S, there are at most n candidate ending cities, leading to O(n · 2ⁿ) distinct states and O(n² · 2ⁿ) total transition operations.'
    },
    {
      q: '4. Which algorithm is fastest and when?',
      a: 'There is no universal winner because performance depends on n and graph structure: for very small n (≤ 12), Held-Karp is completely predictable and very fast because it avoids recursive tree overhead; for graphs where edge weights have wide variance, LCBB prunes aggressively and can terminate far quicker than Held-Karp; Backtracking has O(n) space complexity and is ideal when memory is heavily constrained.'
    },
    {
      q: '5. Why is TSP NP-hard?',
      a: 'The decision version of TSP ("Does there exist a tour of length ≤ k?") is NP-complete by polynomial-time reduction from the Hamiltonian Cycle problem. Given an unweighted graph G, we assign edge weights of 1 for existing edges and 2 (or ∞) for non-edges; a TSP tour of cost n exists if and only if G contains a Hamiltonian cycle. Because solving the TSP optimization problem immediately answers the decision problem, TSP optimization is NP-hard.'
    }
  ]

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="viva-drawer bg-white text-slate-900 border-l border-slate-200 p-6 shadow-2xl overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
          <div>
            <p className="eyebrow">TY IT • DAA FACULTY VIVA PREPARATION</p>
            <h2 className="text-xl font-bold text-slate-900 m-0">Faculty Viva & Theory Mode</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400 hover:text-slate-900"
            aria-label="Close Viva Mode"
            onClick={onClose}
          >
            <X size={18} />
          </Button>
        </div>

        {/* Course Outcomes Mapping */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
          <span className="font-bold text-blue-900 block mb-1">
            DAA Course Outcome (CO) Alignment
          </span>
          <ul className="space-y-1 text-blue-800 list-disc list-inside">
            <li><strong>CO3:</strong> Dynamic Programming — Held-Karp Bellman Recurrence</li>
            <li><strong>CO4:</strong> Backtracking — DFS Permutation Search with Incumbent Pruning</li>
            <li><strong>CO5:</strong> Branch and Bound — Matrix Reduction LCBB & Priority Queue</li>
            <li><strong>CO6:</strong> Complexity Theory — NP-Hardness, Reductions & Approximation</li>
          </ul>
        </div>

        {/* 5 Primary Viva Questions */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <HelpCircle size={15} className="text-blue-600" /> Five Core Viva Questions & Answers
          </h3>

          {vivaQuestions.map(({ q, a }, idx) => (
            <details
              key={idx}
              className="group border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50 open:bg-white"
            >
              <summary className="p-3 text-xs font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between group-hover:text-blue-600">
                <span>{q}</span>
                <span className="text-slate-400 font-mono text-sm group-open:rotate-180 transition-transform">
                  ▾
                </span>
              </summary>
              <p className="p-3 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-white">
                {a}
              </p>
            </details>
          ))}
        </div>

        {/* NP-Hardness In-Depth Explanation */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
            <BookOpen size={14} className="text-blue-600" /> NP-Hardness & Computational Complexity
          </h3>
          <p className="text-slate-600 leading-relaxed">
            <strong>1. Decision vs Optimization:</strong> Decision TSP is in NP because a proposed tour permutation can be verified in linear O(n) time by summing edge weights and checking that all vertices are visited once. Optimization TSP is NP-hard as it is at least as hard as the decision problem.
          </p>
          <p className="text-slate-600 leading-relaxed">
            <strong>2. Hamiltonian Cycle Reduction:</strong> Hamiltonian Cycle (known NP-complete) reduces to TSP in polynomial time. Thus, if a polynomial-time algorithm existed for TSP, P would equal NP.
          </p>
          <p className="text-slate-600 leading-relaxed">
            <strong>3. Why Exact Solvers Matter for Small Inputs:</strong> While asymptotic factorial growth (n−1)!/2 makes n=50 intractable for exact solvers, engineering exact solvers for n ≤ 20 is essential in local delivery routing, VLSI circuit hole drilling, and robotics wayfinding.
          </p>
        </div>
      </aside>
    </div>
  )
}
