import type { DiaryCharacterData, SpawnZone, WorldDefinition } from '@/types'

export interface SpawnPoint {
  x: number
  y: number
}

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

const pickInRange = (range: [number, number], random: () => number): number =>
  range[0] + (range[1] - range[0]) * random()

/** 16:9 월드에서 y는 세로 방향이라, 거리 비교 전에 가로 기준으로 환산한다. */
const MIN_GAP = 0.05
const Y_TO_X = 9 / 16

const isTooClose = (a: SpawnPoint, b: SpawnPoint): boolean => {
  const dx = a.x - b.x
  const dy = (a.y - b.y) * Y_TO_X
  return Math.hypot(dx, dy) < MIN_GAP
}

/**
 * 호수 위나 건물 안에 캐릭터가 서지 않도록
 * 미리 정의된 안전 구역(spawnZones) 안에서만 위치를 고른다.
 * 이미 서 있는 캐릭터와 겹치면 다른 자리를 다시 고른다.
 */
export function pickSpawnPoint(
  world: WorldDefinition,
  seed: string,
  occupied: readonly SpawnPoint[] = [],
): SpawnPoint {
  const zones: SpawnZone[] = world.spawnZones
  const random = seededRandom(seed)
  let fallback: SpawnPoint | null = null

  for (let attempt = 0; attempt < 32; attempt += 1) {
    const zone = zones[Math.floor(random() * zones.length)] ?? zones[0]
    const candidate = {
      x: pickInRange(zone.xRange, random),
      y: pickInRange(zone.yRange, random),
    }
    fallback ??= candidate
    if (!occupied.some((point) => isTooClose(candidate, point))) return candidate
  }

  return fallback as SpawnPoint
}

export const characterIdForDate = (date: string): string => `char-${date}`

export const findCharacterByDate = (
  characters: readonly DiaryCharacterData[],
  date: string,
): DiaryCharacterData | undefined => characters.find((character) => character.diaryDate === date)
