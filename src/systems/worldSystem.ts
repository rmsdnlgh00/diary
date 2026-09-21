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
