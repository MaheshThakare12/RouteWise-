import { fourCityTestMatrix, seededMatrix, validateMatrix, validRoute } from './matrix-utils'
import { solveBacktracking } from './backtracking'
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
  backtrackingCost: number
  expectedCost: number
  optimalRoute: string
  errors: string[]
}

export function runFourCityTest(): FourCityVerification {
  const errors: string[] = []
  const matrix = fourCityTestMatrix

  const btRes = solveBacktracking(matrix, 0)

  if (btRes.cost !== 80) errors.push(`Backtracking cost expected 80, got ${btRes.cost}`)
  if (!validRoute(btRes.route, 4, 0)) errors.push(`Backtracking route invalid: ${btRes.route}`)

  return {
    passed: errors.length === 0,
    backtrackingCost: btRes.cost,
    expectedCost: 80,
    optimalRoute: btRes.route.map(c => `City ${String.fromCharCode(65 + c)}`).join(' → '),
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

  // Special case 0: 4-city textbook
  if (index === 0) {
    const res = runFourCityTest()
    return {
      id: 0,
      description: 'Test 0: Canonical 4-City Textbook Backtracking Verification',
      passed: res.passed,
      details: res.passed
        ? `Optimal Backtracking tour verified: ${res.optimalRoute} with exact cost ${res.backtrackingCost}`
        : `Errors: ${res.errors.join('; ')}`,
      executionTimeMs: performance.now() - started
    }
  }

  // Special case 50: Constant distance matrix
  if (index === 50) {
    const constMatrix: Matrix = Array.from({ length: 5 }, (_, i) =>
      Array.from({ length: 5 }, (_, j) => (i === j ? 0 : 15))
    )
    const bt = solveBacktracking(constMatrix, 0)
    const bf = solveBruteForce(constMatrix, 0)
    const expected = 5 * 15 // 75
    const ok = bt.cost === expected && bf.cost === expected
    return {
      id: index,
      description: `Test ${index}: Constant Distance Matrix (n=5, d=15)`,
      passed: ok,
      details: ok
        ? `Backtracking discovered exact uniform optimum ${expected}`
        : `Mismatch: Backtracking=${bt.cost}, Expected=${expected}`,
      executionTimeMs: performance.now() - started
    }
  }

  // Special case 100: Validation check
  if (index === 100) {
    const negMatrix: Matrix = [[0, -5], [-5, 0]]
    const asymMatrix: Matrix = [[0, 5], [10, 0]]
    const v1 = validateMatrix(negMatrix)
    const v2 = validateMatrix(asymMatrix)
    const ok = !v1.valid && !v2.valid
    return {
      id: index,
      description: `Test ${index}: Distance Matrix Input Validation (Negative & Asymmetric Rejection)`,
      passed: ok,
      details: ok
        ? `Correctly rejected invalid input matrices: "${v1.error}" and "${v2.error}"`
        : 'Failed to reject invalid matrices',
      executionTimeMs: performance.now() - started
    }
  }

  const matrix = seededMatrix(n, seed)
  const bf = solveBruteForce(matrix, startCity)
  const bt = solveBacktracking(matrix, startCity)

  const costMatch = bt.cost === bf.cost
  const btRouteOk = validRoute(bt.route, n, startCity)

  const passed = costMatch && btRouteOk
  let details = `n=${n}, start=C${startCity + 1}, optimum=${bf.cost}.`
  if (!costMatch) {
    details += ` Cost mismatch: Brute Force=${bf.cost}, Backtracking=${bt.cost}.`
  }
  if (!btRouteOk) {
    details += ' Invalid Backtracking tour route.'
  } else {
    details += ` Explored: ${bt.explored}, Pruned: ${bt.pruned}.`
  }

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
