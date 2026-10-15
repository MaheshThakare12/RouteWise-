'use client'

import React, { useState } from 'react'
import {
  BookOpen,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Layers,
  Code2,
  AlertOctagon,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TestSuiteTab } from '@/components/test-suite-tab'
import { BACKTRACKING_PSEUDOCODE } from '@/lib/algorithms/backtracking'

export default function VivaPage() {
  const [activeSubTab, setActiveSubTab] = useState<'viva' | 'tests' | 'code'>('viva')

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
    <div className="workspace">
      {/* Workspace Header */}
      <div className="workspace-head border-b border-slate-200 pb-4 mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-blue-700 font-bold">
            ACADEMIC CURRICULUM & VERIFICATION
          </p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Viva Preparation & Correctness Verification
          </h2>
          <p className="muted text-slate-600 text-xs mt-0.5">
            Theory concepts for DAA faculty viva examinations and live automated verification against ground truth.
          </p>
        </div>

        {/* Sub-tab Navigation Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSubTab('viva')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'viva'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle size={13} /> Viva Questions & Answers
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('tests')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'tests'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={13} /> Automated Test Suite
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('code')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'code'
                ? 'bg-white text-blue-700 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 size={13} /> Algorithm Pseudocode
          </button>
        </div>
      </div>

      {/* Subtab 1: Viva Questions & Theory Mode */}
      {activeSubTab === 'viva' && (
        <div className="space-y-5">
          {/* Course Outcome Mapping Card */}
          <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-xs space-y-2">
            <span className="font-bold text-blue-900 block text-sm">
              DAA Course Outcome (CO) Alignment
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 bg-white border border-blue-100 rounded-lg">
                <strong className="text-blue-900 block text-xs">CO4: Backtracking Search Strategy</strong>
                <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                  Demonstrates depth-first exploration of permutation state spaces with bounding conditions to solve combinatorial optimization problems.
                </p>
              </div>
              <div className="p-2.5 bg-white border border-blue-100 rounded-lg">
                <strong className="text-blue-900 block text-xs">CO6: Complexity Theory & Intractability</strong>
                <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">
                  Analyzes NP-hardness of TSP, reduction from Hamiltonian Cycle, and contrasts $O(n!)$ time complexity with $O(n)$ linear auxiliary stack space.
                </p>
              </div>
            </div>
          </div>

          {/* 5 Core Viva Questions */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle size={15} className="text-blue-600" /> Five Core Viva Questions & Answers
            </h3>

            {vivaQuestions.map(({ q, a }, idx) => (
              <details
                key={idx}
                className="group border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs open:ring-1 open:ring-blue-400"
                open={idx === 0 || idx === 1}
              >
                <summary className="p-3.5 text-xs font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between group-hover:text-blue-600 transition-colors bg-slate-50/50">
                  <span className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-mono text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    {q}
                  </span>
                  <span className="text-slate-400 font-mono text-sm group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <div className="p-4 pt-3 text-xs text-slate-700 leading-relaxed border-t border-slate-100 bg-white">
                  {a}
                </div>
              </details>
            ))}
          </div>

          {/* NP-Hardness In-Depth Explanation */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <BookOpen size={14} className="text-blue-600" /> NP-Hardness & Computational Complexity Details
            </h3>
            <p className="text-slate-600 leading-relaxed">
              <strong>1. Decision vs Optimization:</strong> The decision problem ("Does there exist a tour of length $\le k$?") is in NP because a certificate (a proposed sequence of cities) can be verified in linear $O(n)$ time by summing edge weights. The optimization problem (finding the absolute minimum cost) is NP-hard.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>2. Reduction from Hamiltonian Cycle:</strong> Hamiltonian Cycle is a classic NP-complete problem. By assigning weight 1 to original edges and weight 2 (or $\infty$) to absent edges, a TSP tour of length $n$ exists if and only if the original graph possesses a Hamiltonian Cycle. Thus, TSP is at least as hard as any problem in NP.
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>3. Asymptotic Practicality:</strong> While factorial growth $(n-1)!$ makes exact solutions for $n \ge 25$ intractable without supercomputers, exact Backtracking solvers for $n \le 12$ are highly practical and provide mathematically guaranteed ground truths.
            </p>
          </div>
        </div>
      )}

      {/* Subtab 2: Automated Test Suite Tab */}
      {activeSubTab === 'tests' && (
        <div className="space-y-4">
          <TestSuiteTab />
        </div>
      )}

      {/* Subtab 3: Backtracking Pseudocode & Theoretical Walkthrough */}
      {activeSubTab === 'code' && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Code2 size={15} className="text-blue-600" /> Canonical Backtracking TSP Pseudocode
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recursive Depth-First Permutation Search with Branch Pruning
                </p>
              </div>
              <span className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                O(n) Space • O((n-1)!) Time
              </span>
            </div>

            <pre className="text-xs font-mono leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-800 overflow-x-auto">
              {BACKTRACKING_PSEUDOCODE.map((line, idx) => (
                <div key={idx} className="py-0.5">
                  <span className="inline-block w-6 text-slate-400 select-none text-[11px]">
                    {idx + 1}
                  </span>
                  {line}
                </div>
              ))}
            </pre>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-2 text-blue-900">
            <h4 className="font-bold flex items-center gap-1.5 text-blue-950">
              <Terminal size={14} className="text-blue-600" /> Key Algorithmic Invariants
            </h4>
            <ul className="list-disc list-inside space-y-1 text-blue-800 leading-relaxed">
              <li><strong>Base Case:</strong> When <code className="font-mono font-bold">path.length == n</code>, add the return edge back to the start city (<code className="font-mono">dist[u][start]</code>). If total cost is less than <code className="font-mono">best_cost</code>, update the incumbent best solution.</li>
              <li><strong>Pruning Bounding Step:</strong> For any candidate next vertex <code className="font-mono">v</code>, evaluate <code className="font-mono">current_cost + dist[u][v] &gt;= best_cost</code>. If true, prune this branch immediately without recursing.</li>
              <li><strong>Backtracking Step:</strong> After recursing on candidate <code className="font-mono">v</code>, pop <code className="font-mono">v</code> from the path and restore the visited state so other permutations can be explored.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
