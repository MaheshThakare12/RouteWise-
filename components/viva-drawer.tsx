'use client'

import React from 'react'
import { X, BookOpen, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VivaDrawerProps {
  open: boolean
  onClose: () => void
}

export function VivaDrawer({ open, onClose }: VivaDrawerProps) {
  if (!open) return null

  const vivaQuestions = [
    {
      q: '1. How does the Backtracking algorithm solve the Travelling Salesperson Problem?',
      a: 'Backtracking models TSP as finding a Hamiltonian cycle permutation of minimum cost. It performs Depth-First Search (DFS) over the state-space tree of permutations, maintaining the current tour path and running cost. At each recursive step, it explores an unvisited city, advances deeper into the tree, and backtracks upon reaching a leaf or when bounding conditions are triggered.'
    },
    {
      q: '2. What is the bounding condition used for pruning in Backtracking TSP?',
      a: 'If the accumulated path cost plus the distance to the next candidate city is greater than or equal to the best complete tour cost found so far (currentCost + edgeWeight >= bestCost), the candidate branch is pruned immediately. Because edge weights are non-negative, any further extension of this partial path is guaranteed to cost at least bestCost and cannot yield an optimal solution.'
    },
    {
      q: '3. What are the time and space complexities of Backtracking TSP?',
      a: 'Time complexity: In the worst case, Backtracking explores all (n - 1)! possible permutations, yielding O((n - 1)!) time (equivalent to exhaustive search). However, branch pruning drastically cuts down the search space in practice. Space complexity: O(n) auxiliary space is required for the recursion call stack and the visited array, making Backtracking extremely memory-efficient.'
    },
    {
      q: '4. How does edge ordering and early incumbent discovery affect pruning efficiency?',
      a: 'The sooner a high-quality incumbent (low-cost complete tour) is found, the lower the pruning threshold becomes. When candidates are ordered heuristically (e.g. exploring nearest neighbors first), DFS discovers near-optimal tours early, allowing the bounding condition to prune large subtrees near the top of the search space.'
    },
    {
      q: '5. Why is the Travelling Salesperson Problem NP-hard?',
      a: 'The decision version of TSP ("Does there exist a tour of length <= k?") is NP-complete by polynomial-time reduction from the Hamiltonian Cycle problem. Given an unweighted graph G, we assign edge weights of 1 for existing edges and 2 (or infinity) for non-edges; a TSP tour of cost n exists if and only if G contains a Hamiltonian cycle. Because solving the TSP optimization problem immediately answers the decision problem, TSP optimization is NP-hard.'
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
            <li><strong>CO4:</strong> Backtracking — DFS Permutation State-Space Tree with Incumbent Pruning</li>
            <li><strong>CO6:</strong> Complexity Theory — NP-Hardness, Factorial State Space O(n!), and O(n) Stack Space</li>
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
            <strong>3. Why Exact Solvers Matter for Small Inputs:</strong> While asymptotic factorial growth (n−1)!/2 makes n=50 intractable for exact solvers, engineering exact solvers for n ≤ 12 is essential in local delivery routing, VLSI circuit hole drilling, and robotics wayfinding.
          </p>
        </div>
      </aside>
    </div>
  )
}
