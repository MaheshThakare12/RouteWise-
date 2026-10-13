import { fourCityTestMatrix, seededMatrix, validateMatrix, validRoute } from './matrix-utils'
import { solveBacktracking } from './backtracking'
import { solveLCBB } from './lcbb'
import { solveHeldKarp } from './held-karp'
import { solveBruteForce } from './brute-force'
import { Matrix } from './types'

export interface TestResultItem {
  id: number
  description: string
  passed: boolean
  details: string
  executionTimeMs?: number
}

export interface FourCityVerification {
  passed: boolean
  rowReduction: number
  colReduction: number
  rootBound: number
  backtrackingCost: number
  lcbbCost: number
  heldKarpCost: number
  optimalRoute: string
  errors: string[]
}

export function runFourCityTest(): FourCityVerification {
  const errors: string[] = []
  const matrix = fourCityTestMatrix

  const btRes = solveBacktracking(matrix, 0)
  const lcbbRes = solveLCBB(matrix, 0)
  const hkRes = solveHeldKarp(matrix, 0)

  const rowRed = lcbbRes.rootRowReduction ?? 0
  const colRed = lcbbRes.rootColReduction ?? 0
  const rootBound = lcbbRes.rootBound ?? 0

  if (rowRed !== 55) errors.push(`Expected row reduction 55, got ${rowRed}`)
  if (colRed !== 15) errors.push(`Expected col reduction 15, got ${colRed}`)
  if (rootBound !== 70) errors.push(`Expected root bound 70, got ${rootBound}`)
  if (btRes.cost !== 80) errors.push(`Backtracking cost expected 80, got ${btRes.cost}`)
  if (lcbbRes.cost !== 80) errors.push(`LCBB cost expected 80, got ${lcbbRes.cost}`)
  if (hkRes.cost !== 80) errors.push(`Held-Karp cost expected 80, got ${hkRes.cost}`)

  if (!validRoute(btRes.route, 4, 0)) errors.push(`Backtracking route invalid: ${btRes.route}`)
  if (!validRoute(lcbbRes.route, 4, 0)) errors.push(`LCBB route invalid: ${lcbbRes.route}`)
  if (!validRoute(hkRes.route, 4, 0)) errors.push(`Held-Karp route invalid: ${hkRes.route}`)

  return {
    passed: errors.length === 0,
    rowReduction: rowRed,
    colReduction: colRed,
    rootBound,
    backtrackingCost: btRes.cost,
    lcbbCost: lcbbRes.cost,
    heldKarpCost: hkRes.cost,
    optimalRoute: lcbbRes.route.map(c => `City ${String.fromCharCode(65 + c)}`).join(' → '),
    errors
  }
}

export interface RandomTestSuiteSummary {
  total: number
  passed: number
  failed: number
  results: TestResultItem[]
  durationMs: number
}

export function runSingleRandomTest(index: number): TestResultItem {
  const started = performance.now()
  // Sizes distributed across 4 to 9
  // 4: 35 tests, 5: 45 tests, 6: 45 tests, 7: 35 tests, 8: 25 tests, 9: 15 tests
  const sizes = [
    4, 4, 4, 4, 4, 5, 5, 5, 5, 5,
    6, 6, 6, 6, 6, 7, 7, 7, 8, 9
  ]
  const n = sizes[index % sizes.length]
  const seed = 1000 + index * 17
  const startCity = index % n

  // Special cases:
  // index 0: 4-city textbook
  // index 50: constant distance matrix
  // index 100: invalid matrix validation check
  if (index === 0) {
    const res = runFourCityTest()
    return {
      id: 0,
      description: 'Test 0: Known 4-City Textbook LCBB & Exact Optimum',
      passed: res.passed,
      details: res.passed
        ? `Row red: ${res.rowReduction}, Col red: ${res.colReduction}, Root bound: ${res.rootBound}, Cost: 80`
        : `Errors: ${res.errors.join('; ')}`,
      executionTimeMs: performance.now() - started
    }
  }

  if (index === 50) {
    // Constant distance matrix: all distances = 15
    const constMatrix: Matrix = Array.from({ length: 5 }, (_, i) =>
      Array.from({ length: 5 }, (_, j) => (i === j ? 0 : 15))
    )
    const bt = solveBacktracking(constMatrix, 0)
    const lcbb = solveLCBB(constMatrix, 0)
    const hk = solveHeldKarp(constMatrix, 0)
    const bf = solveBruteForce(constMatrix, 0)
    const expected = 5 * 15 // 75
    const ok = bt.cost === expected && lcbb.cost === expected && hk.cost === expected && bf.cost === expected
    return {
      id: index,
      description: `Test ${index}: Constant Distance Matrix (n=5, d=15)`,
      passed: ok,
      details: ok
        ? `All algorithms returned exact cost ${expected}`
        : `Mismatch: BT=${bt.cost}, LCBB=${lcbb.cost}, HK=${hk.cost}, BF=${bf.cost}`,
      executionTimeMs: performance.now() - started
    }
  }

  if (index === 100) {
    // Validation test: negative distance and asymmetric matrix
    const negMatrix: Matrix = [[0, -5], [-5, 0]]
    const asymMatrix: Matrix = [[0, 5], [10, 0]]
    const v1 = validateMatrix(negMatrix)
    const v2 = validateMatrix(asymMatrix)
    const ok = !v1.valid && !v2.valid
    return {
      id: index,
      description: `Test ${index}: Matrix Input Validation (Negative & Asymmetric Rejection)`,
      passed: ok,
      details: ok
        ? `Correctly rejected invalid matrices: "${v1.error}" and "${v2.error}"`
        : 'Failed to reject invalid matrices',
      executionTimeMs: performance.now() - started
    }
  }

  const matrix = seededMatrix(n, seed)
  const bf = solveBruteForce(matrix, startCity)
  const bt = solveBacktracking(matrix, startCity)
  const lcbb = solveLCBB(matrix, startCity)
  const hk = solveHeldKarp(matrix, startCity)

  const costMatch = bt.cost === bf.cost && lcbb.cost === bf.cost && hk.cost === bf.cost
  const btRouteOk = validRoute(bt.route, n, startCity)
  const lcbbRouteOk = validRoute(lcbb.route, n, startCity)
  const hkRouteOk = validRoute(hk.route, n, startCity)
  const boundValid = (lcbb.rootBound ?? 0) <= bf.cost

  const passed = costMatch && btRouteOk && lcbbRouteOk && hkRouteOk && boundValid
  let details = `n=${n}, start=C${startCity + 1}, optimum=${bf.cost}.`
  if (!costMatch) {
    details += ` Cost mismatch: BF=${bf.cost}, BT=${bt.cost}, LCBB=${lcbb.cost}, HK=${hk.cost}.`
  }
  if (!btRouteOk) details += ' Invalid BT route.'
  if (!lcbbRouteOk) details += ' Invalid LCBB route.'
  if (!hkRouteOk) details += ' Invalid HK route.'
  if (!boundValid) details += ` Invalid root bound ${lcbb.rootBound} > ${bf.cost}.`

  return {
    id: index,
    description: `Test ${index}: Random Seeded Matrix (n=${n}, seed=${seed}, start=C${startCity + 1})`,
    passed,
    details,
    executionTimeMs: performance.now() - started
  }
}

export function runAllRandomTests(count = 200, onProgress?: (completed: number, result: TestResultItem) => void): RandomTestSuiteSummary {
  const started = performance.now()
  const results: TestResultItem[] = []
  let passed = 0
  let failed = 0

  for (let i = 0; i < count; i++) {
    const item = runSingleRandomTest(i)
    results.push(item)
    if (item.passed) passed++
    else failed++
    if (onProgress) onProgress(i + 1, item)
  }

  return {
    total: count,
    passed,
    failed,
    results,
    durationMs: performance.now() - started
  }
}
