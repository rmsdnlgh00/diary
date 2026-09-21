import type { DiaryCharacterData, WorldDefinition } from '@/types'
import { isWalkable, type Point } from './worldSystem'

export type SpawnPoint = Point

/** 같은 날짜는 같은 자리에 서도록 날짜 문자열에서 고정 난수를 만든다. */
function seededRandom(seed: string): () => number {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507)
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909)
    return ((hash ^= hash >>> 16) >>> 0) / 4294967296
  }
}

/** 16:9 월드에서 y는 세로 방향이라, 거리 비교 전에 가로 기준으로 환산한다. */
const Y_TO_X = 9 / 16
const CHARACTER_RADIUS = 0.02

/** 이미 무언가 서 있는 자리. radius는 월드 가로 대비 반지름. */
export interface Occupant extends Point {
  radius: number
}

const overlaps = (point: Point, occupant: Occupant): boolean =>
  Math.hypot(point.x - occupant.x, (point.y - occupant.y) * Y_TO_X) <
  CHARACTER_RADIUS + occupant.radius

/**
 * Walkable Area 안에서만, Blocked Area와 다른 오브젝트를 피해 자리를 고른다.
 * 그래서 캐릭터가 연못 위나 건물 안, 화면 밖에 생기지 않는다.
 */
export function pickSpawnPoint(
  world: WorldDefinition,
  seed: string,
  occupied: readonly Occupant[] = [],
): SpawnPoint {
  const areas = world.walkableAreas
  const random = seededRandom(seed)
  let fallback: SpawnPoint | null = null

  for (let attempt = 0; attempt < 48; attempt += 1) {
    const area = areas[Math.floor(random() * areas.length)] ?? areas[0]
    const candidate = {
      x: area.x[0] + (area.x[1] - area.x[0]) * random(),
      y: area.y[0] + (area.y[1] - area.y[0]) * random(),
    }
    if (!isWalkable(world, candidate)) continue

    fallback ??= candidate
    if (!occupied.some((occupant) => overlaps(candidate, occupant))) return candidate
  }

  return fallback ?? { x: 0.5, y: 0.85 }
}

export { CHARACTER_RADIUS }

export const characterIdForDate = (date: string): string => `char-${date}`

export const findCharacterByDate = (
  characters: readonly DiaryCharacterData[],
  date: string,
): DiaryCharacterData | undefined => characters.find((character) => character.diaryDate === date)
