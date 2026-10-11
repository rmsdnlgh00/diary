import * as THREE from 'three'
import type { AreaRect, WorldDefinition } from '@/types'
import { isInsideAnyArea, type Point } from './worldSystem'

/*
 * V4 village: the 3D remake of the legacy painted village
 * (Blender scene "Diary Village V4 | Legacy View"). Blender Z-up → glTF Y-up,
 * so Blender (x, y, z) becomes (x, z, -y).
 *
 * World coordinates 0–1 span the painted lawn (18 × 22.5 units). The lawn's
 * irregular shape is covered by touching rectangles, measured in Blender on a
 * 0.5-unit grid: inside the lawn, 0.6 units clear of the pond, trees, reeds,
 * fences and bushes, and on screen above the bottom menu (≈ 285 m²).
 */
export const VILLAGE_WIDTH = 18
export const VILLAGE_DEPTH = 22.5
export const VILLAGE_CENTER = { x: 0, z: -4.25 }
export const VILLAGE_CHARACTER_HEIGHT = 1.7

export const VILLAGE_WALKABLE_AREAS: AreaRect[] = [
  { id: 'lawn-centre', x: [0.25, 0.9444], y: [0.3778, 0.9556] },
  { id: 'lawn-back', x: [0.1389, 0.5833], y: [0.0444, 0.3778] },
  { id: 'lawn-front-strip', x: [0, 0.8889], y: [0.9556, 1] },
  { id: 'lawn-front-left', x: [0, 0.25], y: [0.8444, 0.9556] },
  { id: 'lawn-right-edge', x: [0.9444, 1], y: [0.4222, 0.8667] },
  { id: 'lawn-back-right', x: [0.5833, 0.6667], y: [0.0667, 0.2444] },
  { id: 'lawn-by-bench', x: [0.5833, 0.8333], y: [0.3333, 0.3778] },
  { id: 'lawn-by-pond', x: [0.1944, 0.25], y: [0.6889, 0.8444] },
  { id: 'lawn-stone-path', x: [0.3056, 0.5], y: [0, 0.0444] },
  // Freed when the painted bench became the "긴 벤치" decoration.
  { id: 'lawn-old-bench', x: [0.7222, 0.8056], y: [0.2222, 0.3333] },
  { id: 'lawn-old-bench-back', x: [0.6667, 0.7222], y: [0.1333, 0.2444] },
  { id: 'lawn-pond-corner', x: [0.1667, 0.25], y: [0.3778, 0.4444] },
]

/**
 * Same view as the legacy village: 28° pitch, 20° vertical FOV, 16:9, and the
 * character is about 8% of the frame height. Values come from the Blender camera
 * "V4 Camera | Legacy View".
 */
export const VILLAGE_CAMERA = {
  fov: 20,
  position: new THREE.Vector3(-0.953, 25.353, 43.877),
  target: new THREE.Vector3(-0.953, 0, -3.804),
}
/** Camera distance per view, as a fraction of the legacy-view distance. Same angle for all. */
export const VILLAGE_VIEW_DISTANCE = { whole: 1, basic: 0.62, follow: 0.45 } as const

export function villageGround(x: number, y: number): THREE.Vector3 {
  return new THREE.Vector3(
    VILLAGE_CENTER.x + (x - 0.5) * VILLAGE_WIDTH,
    0,
    VILLAGE_CENTER.z + (y - 0.5) * VILLAGE_DEPTH,
  )
}

export function villagePoint(point: THREE.Vector3) {
  return {
    x: (point.x - VILLAGE_CENTER.x) / VILLAGE_WIDTH + 0.5,
    y: (point.z - VILLAGE_CENTER.z) / VILLAGE_DEPTH + 0.5,
  }
}

/** Ground footprint radius of each decoration model, in units (≈ metres). */
export const DECORATION_RADIUS: Record<string, number> = {
  flower_pot: 0.45, picnic_mat: 1.35, small_lamp: 0.35, flower_bed: 1.1, chair: 0.5, sign: 0.6, plant: 1.0, bench: 1.25,
}
const decorationRadius = (itemId: string) => DECORATION_RADIUS[itemId] ?? 0.6

/** Stepping stones on the lawn (three.js x, z, radius), measured in Blender. Walkable, but not for decorations. */
export const VILLAGE_STEPPING_STONES: readonly [number, number, number][] = [
  [-6.6, -12.55, 0.53], [-4.87, -9.84, 0.53], [-3.61, -7.48, 0.54],
  [-2.59, -5.37, 0.58], [0.28, 3.27, 0.63], [1.72, 5.56, 0.58],
]

export interface VillageDecoration extends Point {
  id: string
  itemId: string
}

/** Distance in units between two village points. */
const unitsBetween = (a: Point, b: Point) =>
  Math.hypot((a.x - b.x) * VILLAGE_WIDTH, (a.y - b.y) * VILLAGE_DEPTH)

/**
 * Whether a decoration fits at `point` (village coordinates): its whole footprint on the
 * lawn, clear of stepping stones, other decorations and the characters standing there.
 * Points stay where `fromLegacyPoint(toLegacyPoint(p))` returns them unchanged.
 */
export function canPlaceInVillage(
  itemId: string,
  point: Point,
  decorations: readonly VillageDecoration[],
  occupants: readonly Point[] = [],
  movingId?: string,
): boolean {
  if (point.x < 0.1 || point.x > 0.9 || point.y < 0.08 || point.y > 0.92) return false
  const radius = decorationRadius(itemId)
  for (let i = 0; i <= 8; i += 1) {
    const angle = i * Math.PI / 4
    const r = i === 8 ? 0 : radius
    const sample = {
      x: point.x + Math.cos(angle) * r / VILLAGE_WIDTH,
      y: point.y + Math.sin(angle) * r / VILLAGE_DEPTH,
    }
    if (!isInsideAnyArea(sample, VILLAGE_WALKABLE_AREAS)) return false
  }
  const ground = villageGround(point.x, point.y)
  if (VILLAGE_STEPPING_STONES.some(([x, z, r]) => Math.hypot(ground.x - x, ground.z - z) < radius + r + 0.1)) return false
  if (decorations.some((d) => d.id !== movingId && unitsBetween(point, d) < radius + decorationRadius(d.itemId))) return false
  return !occupants.some((o) => unitsBetween(point, o) < radius + 0.45)
}

/** Placed decorations become blocked squares, so characters walk around them. */
export function villageWorld(world: WorldDefinition, decorations: readonly VillageDecoration[] = []): WorldDefinition {
  return {
    ...world,
    horizonY: 0,
    groundDepthRatio: VILLAGE_DEPTH / VILLAGE_WIDTH,
    walkableAreas: VILLAGE_WALKABLE_AREAS,
    blockedAreas: decorations.map((d) => {
      const r = decorationRadius(d.itemId)
      return { id: `decoration-${d.id}`, x: [d.x - r / VILLAGE_WIDTH, d.x + r / VILLAGE_WIDTH],
        y: [d.y - r / VILLAGE_DEPTH, d.y + r / VILLAGE_DEPTH] }
    }),
  }
}

/** Keeps points a little inside a rectangle, so nobody stands exactly on its edge. */
const EDGE = 0.01

/** The closest point on the lawn. Points already on the lawn are returned unchanged. */
export function nearestLawnPoint(point: Point): Point {
  if (isInsideAnyArea(point, VILLAGE_WALKABLE_AREAS)) return point
  let best = point
  let bestDistance = Infinity
  for (const area of VILLAGE_WALKABLE_AREAS) {
    const x = Math.min(area.x[1] - EDGE, Math.max(area.x[0] + EDGE, point.x))
    const y = Math.min(area.y[1] - EDGE, Math.max(area.y[0] + EDGE, point.y))
    const distance = Math.hypot((x - point.x) * VILLAGE_WIDTH, (y - point.y) * VILLAGE_DEPTH)
    if (distance < bestDistance) {
      bestDistance = distance
      best = { x, y }
    }
  }
  return best
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

/**
 * Saves keep the legacy painted-village coordinates. This maps them onto the 3D lawn
 * (characters and decorations use the same mapping); `toLegacyPoint` is its inverse.
 */
export function fromLegacyPoint(point: Point): Point {
  return nearestLawnPoint({
    x: clamp(0.1 + (point.x - 0.3) / 0.5 * 0.8, 0.1, 0.9),
    y: clamp(0.08 + (point.y - 0.36) / 0.42 * 0.84, 0.08, 0.92),
  })
}

export function toLegacyPoint(point: Point): Point {
  return { x: 0.3 + (point.x - 0.1) * 0.5 / 0.8, y: 0.36 + (point.y - 0.08) * 0.42 / 0.84 }
}

/** `count` evenly spread spots on the lawn, as far apart as the lawn allows. */
export function lawnSpots(count: number): Point[] {
  for (let spacing = 3; spacing > 0.6; spacing -= 0.1) {
    const spots: Point[] = []
    for (let z = spacing / 2; z < VILLAGE_DEPTH; z += spacing) {
      for (let x = spacing / 2; x < VILLAGE_WIDTH; x += spacing) {
        const spot = { x: x / VILLAGE_WIDTH, y: z / VILLAGE_DEPTH }
        if (isInsideAnyArea(spot, VILLAGE_WALKABLE_AREAS)) spots.push(spot)
      }
    }
    if (spots.length >= count) {
      return Array.from({ length: count }, (_, i) => spots[Math.floor(i * spots.length / count)])
    }
  }
  return Array.from({ length: count }, () => nearestLawnPoint({ x: 0.5, y: 0.5 }))
}
