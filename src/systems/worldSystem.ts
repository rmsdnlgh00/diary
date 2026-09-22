import type { AreaRect, WorldDefinition } from '@/types'

export interface Point {
  x: number
  y: number
}

export const isInsideArea = (point: Point, area: AreaRect): boolean =>
  point.x >= area.x[0] && point.x <= area.x[1] && point.y >= area.y[0] && point.y <= area.y[1]

export const isInsideAnyArea = (point: Point, areas: readonly AreaRect[]): boolean =>
  areas.some((area) => isInsideArea(point, area))

/**
 * 캐릭터가 설 수 있는 자리인지 판단한다.
 * 복잡한 물리 충돌 대신 사각 영역 데이터만으로 처리한다.
 */
export const isWalkable = (world: WorldDefinition, point: Point): boolean =>
  isInsideAnyArea(point, world.walkableAreas) && !isInsideAnyArea(point, world.blockedAreas)

/** 경로를 이 간격(월드 가로 대비)으로 잘라서 검사한다. */
const PATH_STEP = 0.008
const Y_TO_X = 9 / 16

/**
 * from 에서 to 로 직선으로 갈 때 실제로 갈 수 있는 가장 먼 지점.
 * 도착지뿐 아니라 지나가는 길도 확인하므로 연못이나 건물을 통과하지 않는다.
 * 길이 처음부터 막혀 있으면 null.
 */
export function furthestWalkablePoint(
  world: WorldDefinition,
  from: Point,
  to: Point,
): Point | null {
  if (!isWalkable(world, from)) return isWalkable(world, to) ? to : null

  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.hypot(dx, dy * Y_TO_X)
  const steps = Math.max(1, Math.ceil(distance / PATH_STEP))

  let last: Point | null = null
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps
    const point = { x: from.x + dx * t, y: from.y + dy * t }
    if (!isWalkable(world, point)) break
    last = point
  }
  return last
}
