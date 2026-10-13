import { Matrix } from './types'

export const puneCities = [
  'Shaniwar Wada',
  'Aga Khan Palace',
  'Dagdusheth Ganpati',
  'Sinhagad Fort',
  'Phoenix Mall Viman Nagar',
  'Okayama Garden',
  'Katraj Snake Park',
  'Khadakwasla Dam',
  'Saras Baug',
  'Pataleshwar Caves',
  'Chaturshringi Temple',
  'Osho Garden'
]

// Synthetic 2D coordinates for visual network mapping (viewBox 0 0 100 100)
// Supporting 4 up to 12 cities with non-overlapping layout
export const defaultPositions: [number, number][] = [
  [48, 16], // 1 — Shaniwar Wada
  [82, 28], // 2 — Aga Khan Palace
  [76, 68], // 3 — Dagdusheth Ganpati
  [50, 86], // 4 — Sinhagad Fort
  [22, 74], // 5 — Phoenix Mall Viman Nagar
  [14, 40], // 6 — Okayama Garden
  [26, 18], // 7 — Katraj Snake Park
  [50, 52], // 8 — Khadakwasla Dam
  [36, 34], // 9 — Custom City 9
  [66, 36], // 10 — Custom City 10
  [62, 58], // 11 — Custom City 11
  [34, 68]  // 12 — Custom City 12
]

export function getCityName(index: number): string {
  if (index < 8 && puneCities[index]) {
    return puneCities[index]
  }
  return `Custom City ${index + 1}`
}

export function getCityNames(count: number): string[] {
  return Array.from({ length: count }, (_, i) => getCityName(i))
}

export function cloneMatrix(matrix: Matrix): Matrix {
  return matrix.map(row => [...row])
}

export function routeCost(route: number[], matrix: Matrix): number {
  if (route.length < 2) return 0
  let total = 0
  for (let i = 0; i < route.length - 1; i++) {
    total += matrix[route[i]][route[i + 1]]
  }
  return total
}

export function validRoute(route: number[], n: number, start = 0): boolean {
  if (route.length !== n + 1) return false
  if (route[0] !== start || route[route.length - 1] !== start) return false
  const visited = new Set(route.slice(0, -1))
  return visited.size === n && visited.has(start)
}

export function formatRoute(route: number[], names: string[]): string {
  if (!route || route.length === 0) return 'None'
  return route.map(i => names[i]?.split(' ')[0] || `C${i + 1}`).join(' → ')
}

export function seededRandom(seed: number) {
  let value = seed >>> 0
  return function () {
    value = (1664525 * value + 1013904223) >>> 0
    return value / 4294967296
  }
}

export function seededMatrix(n: number, seed = 42): Matrix {
  const rand = seededRandom(seed)
  const matrix: Matrix = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = 10 + Math.floor(rand() * 45)
      matrix[i][j] = dist
      matrix[j][i] = dist
    }
  }
  return matrix
}

// Fixed 12-city Pune synthetic demonstration matrix
// (Top-left 8x8 block is preserved for identical backward compatibility)
export const puneMatrix: Matrix = [
  [0,  24, 18, 38, 29, 31, 20, 26, 14, 21, 25, 33],
  [24,  0, 22, 45, 12, 36, 33, 39, 28, 19, 31, 42],
  [18, 22,  0, 28, 25, 15, 19, 21, 16, 24, 29, 22],
  [38, 45, 28,  0, 48, 23, 27, 16, 32, 41, 46, 20],
  [29, 12, 25, 48,  0, 39, 41, 44, 34, 23, 36, 47],
  [31, 36, 15, 23, 39,  0, 18, 17, 19, 26, 30, 24],
  [20, 33, 19, 27, 41, 18,  0, 15, 22, 35, 27, 29],
  [26, 39, 21, 16, 44, 17, 15,  0, 27, 33, 38, 18],
  [14, 28, 16, 32, 34, 19, 22, 27,  0, 18, 24, 26],
  [21, 19, 24, 41, 23, 26, 35, 33, 18,  0, 17, 35],
  [25, 31, 29, 46, 36, 30, 27, 38, 24, 17,  0, 39],
  [33, 42, 22, 20, 47, 24, 29, 18, 26, 35, 39,  0]
]

// Known 4-city textbook test matrix:
// A-B = 10, A-C = 15, A-D = 20, B-C = 35, B-D = 25, C-D = 30
// Expected: Row reduction = 55, Col reduction = 15, Root bound = 70, Optimal tour = 80 (e.g. A-B-D-C-A)
export const fourCityTestMatrix: Matrix = [
  [0,  10, 15, 20],
  [10,  0, 35, 25],
  [15, 35,  0, 30],
  [20, 25, 30,  0]
]

export const fourCityNames = ['City A', 'City B', 'City C', 'City D']

export function validateMatrix(matrix: Matrix): { valid: boolean; error?: string } {
  const n = matrix.length
  if (n < 2) return { valid: false, error: 'Matrix must have at least 2 cities' }
  for (let i = 0; i < n; i++) {
    if (matrix[i].length !== n) return { valid: false, error: 'Matrix must be square' }
    if (matrix[i][i] !== 0) return { valid: false, error: `Diagonal entry (${i},${i}) must be 0` }
    for (let j = 0; j < n; j++) {
      if (matrix[i][j] < 0) return { valid: false, error: `Negative distance at (${i},${j})` }
      if (matrix[i][j] !== matrix[j][i]) return { valid: false, error: `Matrix is asymmetric at (${i},${j})` }
    }
  }
  return { valid: true }
}

export function expandOrResizeMatrix(current: Matrix, newSize: number, seed = 42): Matrix {
  const result: Matrix = Array.from({ length: newSize }, () => new Array(newSize).fill(0))
  const rand = seededRandom(seed)

  for (let i = 0; i < newSize; i++) {
    for (let j = 0; j < newSize; j++) {
      if (i === j) {
        result[i][j] = 0
      } else if (i < current.length && j < current[i].length && current[i][j] !== undefined) {
        result[i][j] = current[i][j]
      } else if (i < puneMatrix.length && j < puneMatrix[i].length) {
        result[i][j] = puneMatrix[i][j]
      } else {
        if (i < j) {
          const dist = 12 + Math.floor(rand() * 45)
          result[i][j] = dist
          result[j][i] = dist
        }
      }
    }
  }
  return result
}

