import * as THREE from 'three'
import type { AreaRect, WorldDefinition } from '@/types'
import { isInsideAnyArea, type Point } from './worldSystem'

/*
 * V4 village: the 3D remake of the legacy painted village
 * (Blender scene "Diary Village V4 | Legacy View"). Blender Z-up → glTF Y-up,
 * so Blender (x, y, z) becomes (x, z, -y).
 *
 * The map was widened 1.35× around the lawn in Blender (trees, shop, house, pond and
 * fences pushed outwards; river, paths and island scaled), so characters have about
 * twice the room. Three landmark trees and three flower islands decorate the lawn,
 * leaving an open gathering space in the middle. World coordinates 0–1 span the lawn
 * (25.5 × 32 units). Its irregular shape is covered by touching rectangles, measured
 * in Blender on a 0.5-unit grid:
 * inside the lawn, 0.6 units clear of ground-level obstacles (pond, reeds, bushes,
 * fences, trunks, the lawn trees and flower islands) and on screen in the whole-village
 * view (≈ 475 m² in twenty rectangles).
 */
export const VILLAGE_WIDTH = 25.5
export const VILLAGE_DEPTH = 32
export const VILLAGE_CENTER = { x: 0.25, z: -3 }
export const VILLAGE_CHARACTER_HEIGHT = 1.7

export const VILLAGE_WALKABLE_AREAS: AreaRect[] = [
  { id: 'lawn-01', x: [0.1765, 0.5294], y: [0.0312, 0.4219] },
  { id: 'lawn-02', x: [0.4314, 0.6078], y: [0.4688, 1] },
  { id: 'lawn-03', x: [0.0784, 0.3725], y: [0.7656, 1] },
  { id: 'lawn-04', x: [0.8235, 0.9608], y: [0.375, 0.8125] },
  { id: 'lawn-05', x: [0.7059, 0.8235], y: [0.2344, 0.5312] },
  { id: 'lawn-06', x: [0.6078, 0.8235], y: [0.5938, 0.7188] },
  { id: 'lawn-07', x: [0.6078, 0.8627], y: [0.8438, 0.9375] },
  { id: 'lawn-08', x: [0.3137, 0.4314], y: [0.4219, 0.5938] },
  { id: 'lawn-09', x: [0.5294, 0.6667], y: [0.0781, 0.2188] },
  { id: 'lawn-10', x: [0.1569, 0.4314], y: [0.7188, 0.7656] },
  { id: 'lawn-11', x: [0.6078, 0.7059], y: [0.4688, 0.5938] },
  { id: 'lawn-12', x: [0.9608, 1], y: [0.5156, 0.7656] },
  { id: 'lawn-13', x: [0.1176, 0.1765], y: [0.0469, 0.2031] },
  { id: 'lawn-14', x: [0.2745, 0.549], y: [0, 0.0312] },
  { id: 'lawn-15', x: [0, 0.0784], y: [0.7969, 0.9062] },
  { id: 'lawn-16', x: [0.5294, 0.5882], y: [0.2188, 0.3438] },
  { id: 'lawn-17', x: [0.2353, 0.3137], y: [0.5, 0.5938] },
  { id: 'lawn-18', x: [0.6078, 0.7255], y: [0.9375, 1] },
  { id: 'lawn-19', x: [0.3725, 0.4314], y: [0.8906, 1] },
  { id: 'lawn-20', x: [0.6667, 0.7451], y: [0.1562, 0.2344] },
]

/**
 * Same angle as the legacy village: 28° pitch, 20° vertical FOV, 16:9. After widening
 * the map the camera sits 1.3× further back so the whole village still fits; the
 * character is about 6% of the frame height. Values come from the Blender camera
 * "V4 Camera | Legacy View".
 */
export const VILLAGE_CAMERA = {
  fov: 20,
  position: new THREE.Vector3(-0.953, 32.958, 58.181),
  target: new THREE.Vector3(-0.953, 0, -3.804),
}
/**
 * Camera distance per view, as a fraction of the whole-village distance. Same angle
 * for all; basic and follow keep the close-ups they had before the map was widened.
 */
export const VILLAGE_VIEW_DISTANCE = { whole: 1, basic: 0.48, follow: 0.35 } as const

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
  [-8.91, -15.46, 0.53], [-6.57, -11.8, 0.53], [-4.88, -8.61, 0.54],
  [-3.5, -5.77, 0.58], [0.38, 5.9, 0.63], [2.33, 8.99, 0.58],
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
    // The lawn is wide: wander about 5 units from home, and now and then stroll anywhere.
    wanderRadius: 0.2,
    roamChance: 0.3,
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
