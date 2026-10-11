import type { WorldDefinition } from '@/types'
import { furthestWalkablePoint, isWalkable, type Point } from './worldSystem'

/**
 * 장애물을 돌아가는 길찾기.
 *
 * 월드를 정사각형 칸으로 나눠 걸을 수 있는 칸을 표시하고 A* 로 길을 찾는다.
 * 그다음 직선으로 갈 수 있는 구간은 합쳐서, 모서리에서만 방향을 트는
 * 몇 개의 경유지로 줄인다. 직선으로 바로 갈 수 있으면 길찾기를 하지 않는다.
 */

/** 칸 한 변의 길이 (월드 가로 대비). 3D 마을에서는 약 0.2 단위. */
const CELL = 0.012
const Y_TO_X = 9 / 16

interface Grid {
  nx: number
  ny: number
  /** 칸 세로 길이 (월드 세로 0~1 기준) */
  cellY: number
  walkable: Uint8Array
}

// 월드 객체가 바뀔 때(장식물 배치 등)만 다시 만든다.
const grids = new WeakMap<WorldDefinition, Grid>()

function gridOf(world: WorldDefinition): Grid {
  const cached = grids.get(world)
  if (cached) return cached
  const ratio = world.groundDepthRatio ?? Y_TO_X
  const nx = Math.ceil(1 / CELL)
  const ny = Math.ceil(ratio / CELL)
  const cellY = 1 / ny
  const walkable = new Uint8Array(nx * ny)
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      walkable[j * nx + i] = isWalkable(world, { x: (i + 0.5) / nx, y: (j + 0.5) * cellY }) ? 1 : 0
    }
  }
  const grid = { nx, ny, cellY, walkable }
  grids.set(world, grid)
  return grid
}

const centre = (grid: Grid, index: number): Point =>
  ({ x: ((index % grid.nx) + 0.5) / grid.nx, y: (Math.floor(index / grid.nx) + 0.5) * grid.cellY })

function cellOf(grid: Grid, point: Point): number {
  const i = Math.min(grid.nx - 1, Math.max(0, Math.floor(point.x * grid.nx)))
  const j = Math.min(grid.ny - 1, Math.max(0, Math.floor(point.y / grid.cellY)))
  return j * grid.nx + i
}

/** 가장 가까운 걸을 수 있는 칸. 없으면 -1. */
function nearestWalkableCell(grid: Grid, point: Point): number {
  const start = cellOf(grid, point)
  if (grid.walkable[start]) return start
  let best = -1
  let bestDistance = Infinity
  for (let index = 0; index < grid.walkable.length; index += 1) {
    if (!grid.walkable[index]) continue
    const c = centre(grid, index)
    const distance = Math.hypot(c.x - point.x, (c.y - point.y) * grid.ny / grid.nx)
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  }
  return best
}

/** 직선 a→b 가 끝까지 걸을 수 있는지. */
const clearLine = (world: WorldDefinition, a: Point, b: Point) => {
  const reached = furthestWalkablePoint(world, a, b)
  return !!reached && reached.x === b.x && reached.y === b.y
}

const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const

function aStar(grid: Grid, start: number, goal: number): number[] | null {
  const { nx, ny, walkable } = grid
  const g = new Float64Array(nx * ny).fill(Infinity)
  const from = new Int32Array(nx * ny).fill(-1)
  const closed = new Uint8Array(nx * ny)
  const gx = goal % nx
  const gy = Math.floor(goal / nx)
  const heuristic = (index: number) => {
    const dx = Math.abs((index % nx) - gx)
    const dy = Math.abs(Math.floor(index / nx) - gy)
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy)
  }
  // 칸 수가 수천 개라 단순 이진 힙이면 충분하다.
  const heap: [number, number][] = []
  const push = (f: number, index: number) => {
    heap.push([f, index])
    let k = heap.length - 1
    while (k > 0) {
      const parent = (k - 1) >> 1
      if (heap[parent][0] <= heap[k][0]) break
      ;[heap[parent], heap[k]] = [heap[k], heap[parent]]
      k = parent
    }
  }
  const pop = () => {
    const top = heap[0]
    const last = heap.pop()!
    if (heap.length) {
      heap[0] = last
      let k = 0
      for (;;) {
        const l = 2 * k + 1
        const r = l + 1
        let m = k
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r
        if (m === k) break
        ;[heap[m], heap[k]] = [heap[k], heap[m]]
        k = m
      }
    }
    return top
  }
  g[start] = 0
  push(heuristic(start), start)
  while (heap.length) {
    const [, current] = pop()
    if (current === goal) {
      const path = [current]
      while (from[path[0]] !== -1) path.unshift(from[path[0]])
      return path
    }
    if (closed[current]) continue
    closed[current] = 1
    const cx = current % nx
    const cy = Math.floor(current / nx)
    for (const [dx, dy] of NEIGHBOURS) {
      const x = cx + dx
      const y = cy + dy
      if (x < 0 || y < 0 || x >= nx || y >= ny) continue
      const next = y * nx + x
      if (!walkable[next] || closed[next]) continue
      // 대각선은 양옆 두 칸이 모두 열려 있을 때만. 모서리를 스치며 파고들지 않게.
      if (dx && dy && (!walkable[cy * nx + x] || !walkable[y * nx + cx])) continue
      const cost = g[current] + (dx && dy ? Math.SQRT2 : 1)
      if (cost >= g[next]) continue
      g[next] = cost
      from[next] = current
      push(cost + heuristic(next), next)
    }
  }
  return null
}

/**
 * from 에서 to 까지 걸어갈 경유지 목록 (from 은 빼고, 마지막이 도착점).
 * to 가 걸을 수 없는 곳이면 가장 가까운 걸을 수 있는 자리로 간다.
 * 이어진 길이 없으면 null.
 */
export function findPath(world: WorldDefinition, from: Point, to: Point): Point[] | null {
  if (isWalkable(world, to) && clearLine(world, from, to)) return [to]
  const grid = gridOf(world)
  const start = nearestWalkableCell(grid, from)
  const goal = nearestWalkableCell(grid, to)
  if (start < 0 || goal < 0) return null
  const cells = aStar(grid, start, goal)
  if (!cells) return null
  const points = cells.map((index) => centre(grid, index))
  points[points.length - 1] = isWalkable(world, to) ? to : points[points.length - 1]
  // 직선으로 이어지는 구간은 건너뛰고 꺾이는 곳만 남긴다.
  const waypoints: Point[] = []
  let anchor = from
  let k = 0
  while (k < points.length) {
    // 앞으로 늘려 가다가 막히는 칸 직전까지 한 번에 간다.
    let far = k
    while (far + 1 < points.length && clearLine(world, anchor, points[far + 1])) far += 1
    waypoints.push(points[far])
    anchor = points[far]
    k = far + 1
  }
  return waypoints
}
