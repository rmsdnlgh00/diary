import { getItem } from '@/data/items'
import type { AreaRect, GameItem, PlacedDecoration, WorldDefinition } from '@/types'
import { isInsideAnyArea, isWalkable, type Point } from './worldSystem'

/** 배경 그림에 포함된 시설. 기존 walkable/blocked 영역에 추가하는 배치 전용 제한. */
export const PLACEMENT_BLOCKED_AREAS: AreaRect[] = [
  { id: 'shop', x: [0.57, 0.94], y: [0.02, 0.36] },
  { id: 'bridge', x: [0.83, 1], y: [0.22, 0.42] },
  { id: 'bottom-ui', x: [0, 1], y: [0.79, 1] },
]

/** 장식물의 바닥 면적까지 확인하여 물가·울타리 경계에 걸치지 않게 한다. */
export function canPlaceDecoration(
  world: WorldDefinition,
  item: GameItem,
  point: Point,
  placed: readonly PlacedDecoration[],
  movingId?: string,
): boolean {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return false
  const radius = (item.worldWidth ?? 0.04) / 2
  const yRadius = radius * 0.6
  const samples = [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => ({
    x: point.x + dx * radius, y: point.y + dy * yRadius,
  })))
  if (samples.some((p) => !isWalkable(world, p) || isInsideAnyArea(p, PLACEMENT_BLOCKED_AREAS))) return false
  return !placed.some((other) => {
    if (other.id === movingId) return false
    const otherRadius = (getItem(other.itemId)?.worldWidth ?? 0.04) / 2
    return Math.abs(point.x - other.x) < radius + otherRadius &&
      Math.abs(point.y - other.y) < yRadius + otherRadius * 0.6
  })
}
