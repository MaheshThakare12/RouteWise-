import { AlgorithmResult, Matrix } from './types'

export function solveBruteForce(matrix: Matrix, start = 0): AlgorithmResult {
  const started = performance.now()
  const n = matrix.length
  let bestCost = Infinity
  let bestRoute: number[] = []
  let explored = 0

  const remaining: number[] = []
  for (let i = 0; i < n; i++) {
    if (i !== start) remaining.push(i)
  }

  function permute(currPerm: number[], left: number[]) {
    if (left.length === 0) {
      explored++
      const fullTour = [start, ...currPerm, start]
      let cost = 0
      for (let i = 0; i < fullTour.length - 1; i++) {
        cost += matrix[fullTour[i]][fullTour[i + 1]]
      }
      if (cost < bestCost) {
        bestCost = cost
        bestRoute = fullTour
      }
      return
    }

    for (let i = 0; i < left.length; i++) {
      const nextCity = left[i]
      const newLeft = left.slice(0, i).concat(left.slice(i + 1))
      permute([...currPerm, nextCity], newLeft)
    }
  }

  permute([], remaining)

  return {
    algorithm: 'backtracking',
    route: bestRoute,
    cost: bestCost,
    events: [],
    generated: explored,
    explored,
    pruned: 0,
    duration: performance.now() - started
  }
}
