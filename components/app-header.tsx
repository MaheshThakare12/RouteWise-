'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  GitBranch,
  RotateCcw,
  Sparkles,
  Compass,
  Grid3X3,
  BarChart3,
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTsp } from '@/context/tsp-context'

const navLinks = [
  { href: '/', label: 'Overview', icon: Compass },
  { href: '/visualizer', label: 'Visualizer', icon: GitBranch },
  { href: '/matrix', label: 'Distance Matrix', icon: Grid3X3 },
  { href: '/results', label: 'Results & Analysis', icon: BarChart3 },
  { href: '/viva', label: 'Viva & Tests', icon: BookOpen }
]

export function AppHeader() {
  const pathname = usePathname()
  const { handleReset } = useTsp()

  return (
    <>
      {/* Top Brand Header */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <GitBranch size={16} />
          </div>
          <div>
            <h1>
              ROUTEWISE <span>SMART TOUR ROUTE OPTIMIZER</span>
            </h1>
            <p>Travelling Salesperson Problem — Backtracking (TY IT • DAA CO4).</p>
          </div>
        </div>

        <div className="header-actions">
          <span className="local">
            <i /> LOCAL COMPUTATION
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-slate-600 hover:text-slate-900 text-xs"
          >
            <RotateCcw size={13} className="mr-1" /> Reset
          </Button>
        </div>
      </header>

      {/* Persistent Horizontal Navigation Bar */}
      <nav
        className="sidebar border-b border-slate-200 bg-white"
        aria-label="Main Navigation"
      >
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={14} />
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Synthetic Benchmark Notice */}
      <div className="px-6 pt-3 pb-0 max-w-[1600px] mx-auto w-full">
        <div className="notice flex items-center justify-between text-xs py-1.5 px-3 bg-blue-50/60 border border-blue-200 rounded-lg text-slate-700">
          <span className="flex items-center gap-1.5 font-bold text-blue-800 text-[11px] whitespace-nowrap">
            <Sparkles size={13} className="text-blue-600" /> SYNTHETIC DEMONSTRATION DATA
          </span>
          <p className="m-0 text-slate-600 text-[11px] truncate pl-2">
            Distances and coordinates are illustrative benchmarks based on Pune landmarks. No live map APIs or API keys required.
          </p>
        </div>
      </div>
    </>
  )
}
