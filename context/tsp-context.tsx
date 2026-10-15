'use client'

import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react'
import {
  AlgorithmEvent,
  AlgorithmResult,
  Matrix,
  puneMatrix,
  fourCityTestMatrix,
  solveBacktracking,
  cloneMatrix,
  getCityNames,
  expandOrResizeMatrix,
  seededMatrix
} from '@/lib/algorithms'

interface TspContextType {
  cityCount: number
  customCountInput: string
  setCustomCountInput: (val: string) => void
  inputError: string | null
  setInputError: (err: string | null) => void
  hasCustomEdits: boolean
  setHasCustomEdits: (val: boolean) => void
  enableLargeAnimation: boolean
  setEnableLargeAnimation: (val: boolean) => void
  startCity: number
  setStartCity: (city: number) => void
  matrix: Matrix
  currentMatrix: Matrix
  names: string[]
  cursor: number
  setCursor: React.Dispatch<React.SetStateAction<number>>
  isPlaying: boolean
  setIsPlaying: (val: boolean) => void
  customMapPath: number[] | null
  setCustomMapPath: (path: number[] | null) => void
  customPrunedEdges: Array<[number, number]> | null
  setCustomPrunedEdges: (edges: Array<[number, number]> | null) => void
  selectedResult: AlgorithmResult
  activeEvent: AlgorithmEvent
  activePrunedEdges: Array<[number, number]>
  currentIncumbentCost: string | number
  currentIncumbentRoute: number[] | null
  // Actions
  applyCityCountChange: (newCount: number) => boolean
  handleReset: () => void
  handleLoadFourCity: () => void
  handleRandomizeMatrix: () => void
  updateMatrix: (newMat: Matrix) => void
  handleStepChange: (nextStep: number | ((prev: number) => number)) => void
}

const TspContext = createContext<TspContextType | null>(null)

export function TspProvider({ children }: { children: React.ReactNode }) {
  const [cityCount, setCityCount] = useState<number>(8)
  const [customCountInput, setCustomCountInput] = useState<string>('8')
  const [inputError, setInputError] = useState<string | null>(null)
  const [hasCustomEdits, setHasCustomEdits] = useState<boolean>(false)
  const [enableLargeAnimation, setEnableLargeAnimation] = useState<boolean>(false)
  const [startCity, setStartCityState] = useState<number>(0)
  const [matrix, setMatrix] = useState<Matrix>(() => cloneMatrix(puneMatrix))
  const [cursor, setCursor] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
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

  // Keep cursor safely bounded if result events length changed
  useEffect(() => {
    if (selectedResult.events.length > 0 && cursor >= selectedResult.events.length) {
      setCursor(selectedResult.events.length - 1)
    }
  }, [selectedResult.events.length, cursor])

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

  // Current incumbent best cost and route at this playback step
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

  const setStartCity = useCallback((newStart: number) => {
    setStartCityState(newStart)
    setCursor(0)
    setIsPlaying(false)
    setCustomMapPath(null)
    setCustomPrunedEdges(null)
  }, [])

  const applyCityCountChange = useCallback((newCount: number): boolean => {
    if (isNaN(newCount) || newCount < 4 || newCount > 12) {
      setInputError('Please enter a valid city count between 4 and 12.')
      return false
    }
    if (hasCustomEdits) {
      const ok = typeof window !== 'undefined'
        ? window.confirm('You have unsaved edits to the distance matrix. Changing the city count will resize the matrix. Do you want to proceed?')
        : true
      if (!ok) return false
      setHasCustomEdits(false)
    }
    setInputError(null)
    setCityCount(newCount)
    setCustomCountInput(String(newCount))
    setMatrix(prev => expandOrResizeMatrix(prev, newCount))
    if (startCity >= newCount) {
      setStartCityState(0)
    }
    setCursor(0)
    setIsPlaying(false)
    setCustomMapPath(null)
    setCustomPrunedEdges(null)
    return true
  }, [hasCustomEdits, startCity])

  const handleReset = useCallback(() => {
    setMatrix(cloneMatrix(puneMatrix))
    setCityCount(8)
    setCustomCountInput('8')
    setInputError(null)
    setHasCustomEdits(false)
    setStartCityState(0)
    setCursor(0)
    setIsPlaying(false)
    setCustomMapPath(null)
    setCustomPrunedEdges(null)
  }, [])

  const handleLoadFourCity = useCallback(() => {
    setMatrix(cloneMatrix(fourCityTestMatrix))
    setCityCount(4)
    setCustomCountInput('4')
    setInputError(null)
    setHasCustomEdits(false)
    setStartCityState(0)
    setCursor(0)
    setIsPlaying(false)
    setCustomMapPath(null)
    setCustomPrunedEdges(null)
  }, [])

  const handleRandomizeMatrix = useCallback(() => {
    const rand = seededMatrix(cityCount, Math.floor(Math.random() * 100000))
    const full = matrix.map(r => [...r])
    for (let i = 0; i < cityCount; i++) {
      for (let j = 0; j < cityCount; j++) {
        full[i][j] = rand[i][j]
      }
    }
    setMatrix(full)
    setHasCustomEdits(true)
    setCursor(0)
    setIsPlaying(false)
    setCustomMapPath(null)
    setCustomPrunedEdges(null)
  }, [cityCount, matrix])

  const updateMatrix = useCallback((newMat: Matrix) => {
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
  }, [cityCount, matrix])

  const handleStepChange = useCallback((nextStep: number | ((prev: number) => number)) => {
    setCursor(nextStep)
    setCustomMapPath(null)
    setCustomPrunedEdges(null)
  }, [])

  const value = useMemo(() => ({
    cityCount,
    customCountInput,
    setCustomCountInput,
    inputError,
    setInputError,
    hasCustomEdits,
    setHasCustomEdits,
    enableLargeAnimation,
    setEnableLargeAnimation,
    startCity,
    setStartCity,
    matrix,
    currentMatrix,
    names,
    cursor,
    setCursor,
    isPlaying,
    setIsPlaying,
    customMapPath,
    setCustomMapPath,
    customPrunedEdges,
    setCustomPrunedEdges,
    selectedResult,
    activeEvent,
    activePrunedEdges,
    currentIncumbentCost,
    currentIncumbentRoute,
    applyCityCountChange,
    handleReset,
    handleLoadFourCity,
    handleRandomizeMatrix,
    updateMatrix,
    handleStepChange
  }), [
    cityCount,
    customCountInput,
    inputError,
    hasCustomEdits,
    enableLargeAnimation,
    startCity,
    setStartCity,
    matrix,
    currentMatrix,
    names,
    cursor,
    isPlaying,
    customMapPath,
    customPrunedEdges,
    selectedResult,
    activeEvent,
    activePrunedEdges,
    currentIncumbentCost,
    currentIncumbentRoute,
    applyCityCountChange,
    handleReset,
    handleLoadFourCity,
    handleRandomizeMatrix,
    updateMatrix,
    handleStepChange
  ])

  return (
    <TspContext.Provider value={value}>
      {children}
    </TspContext.Provider>
  )
}

export function useTsp() {
  const ctx = useContext(TspContext)
  if (!ctx) {
    throw new Error('useTsp must be used within a TspProvider')
  }
  return ctx
}
