import * as THREE from 'three'
import { getItem } from '@/data/items'
import type { AreaRect, WorldDefinition } from '@/types'
import { isInsideAnyArea, type Point } from './worldSystem'

/*
 * V4 village: the 3D remake of the legacy painted village
 * (Blender scene "Diary Village V4 | Legacy View"). Blender Z-up → glTF Y-up,
 * so Blender (x, y, z) becomes (x, z, -y).
 *
 * The map was widened 1.35× around the lawn in Blender and tidied into one rounded
 * island: the surroundings (trees, shop, house, pond, fences, river) frame an open lawn
 * that is left free for the decorations players place. World coordinates 0–1 span the
 * lawn (25.5 × 32 units). The free ground is covered by touching rectangles, measured
 * in Blender on a 0.5-unit grid: 3 units inside the coast, 0.6 units clear of
 * ground-level obstacles and on screen in the whole-village view (≈ 650 m²).
 */
export const VILLAGE_WIDTH = 25.5
export const VILLAGE_DEPTH = 32
export const VILLAGE_CENTER = { x: 0.25, z: -3 }
export const VILLAGE_CHARACTER_HEIGHT = 1.7

export const VILLAGE_WALKABLE_AREAS: AreaRect[] = [
  { id: 'lawn-main', x: [0.2353, 0.8235], y: [0.0625, 0.9375] },
  { id: 'lawn-right', x: [0.8235, 0.9804], y: [0.3281, 0.875] },
  { id: 'lawn-back-left', x: [0.0588, 0.2353], y: [0.0312, 0.3594] },
  { id: 'lawn-left', x: [0.1176, 0.2353], y: [0.5938, 1] },
  { id: 'lawn-front', x: [0.2353, 0.7255], y: [0.9375, 1] },
  { id: 'lawn-back', x: [0.2353, 0.7255], y: [0.0156, 0.0625] },
  { id: 'lawn-front-left', x: [0.0196, 0.1176], y: [0.75, 0.9688] },
  { id: 'lawn-back-right', x: [0.8235, 0.9804], y: [0.125, 0.2344] },
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
// `follow` is the close-up on a character whose diary is open.
export const VILLAGE_VIEW_DISTANCE = { whole: 1, basic: 0.48, follow: 0.22 } as const

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
  fountain: 1.35, bicycle: 0.95, floor_tile: 1,
}
const decorationRadius = (itemId: string) => DECORATION_RADIUS[itemId] ?? 0.6

/** Centre of the pond in three.js units (the duck swims around it). */
export const VILLAGE_POND = { x: -15.57, z: -4.17 }

export interface VillageDecoration extends Point {
  id: string
  itemId: string
}

/** Distance in units between two village points. */
const unitsBetween = (a: Point, b: Point) =>
  Math.hypot((a.x - b.x) * VILLAGE_WIDTH, (a.y - b.y) * VILLAGE_DEPTH)

/** Floor tiles are 2 × 2 units and snap to a grid around the lawn centre. */
export const FLOOR_TILE_SIZE = 2
export const isFloorDecoration = (itemId: string) => !!getItem(itemId)?.floor

/** Snaps floor items to the tile grid so neighbouring tiles line up; other items stay put. */
export function snapDecoration(itemId: string, point: Point): Point {
  if (!isFloorDecoration(itemId)) return point
  const ground = villageGround(point.x, point.y)
  const snap = (value: number, origin: number) => origin + Math.round((value - origin) / FLOOR_TILE_SIZE) * FLOOR_TILE_SIZE
  return villagePoint(new THREE.Vector3(snap(ground.x, VILLAGE_CENTER.x), 0, snap(ground.z, VILLAGE_CENTER.z)))
}

/**
 * Whether a decoration fits at `point` (village coordinates): its whole footprint on the
 * lawn, clear of other decorations and the characters standing there.
 * Floor items (tiles) are their own layer: they only avoid other tiles, may sit under
 * other decorations and under characters, and must cover lawn with their whole square.
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
  const floor = isFloorDecoration(itemId)
  const radius = decorationRadius(itemId)
  const half = FLOOR_TILE_SIZE / 2 - 0.02
  const offsets = floor
    ? [-1, 0, 1].flatMap((i) => [-1, 0, 1].map((j) => [i * half, j * half]))
    : Array.from({ length: 9 }, (_, i) => i === 8 ? [0, 0] : [Math.cos(i * Math.PI / 4) * radius, Math.sin(i * Math.PI / 4) * radius])
  for (const [dx, dz] of offsets) {
    if (!isInsideAnyArea({ x: point.x + dx / VILLAGE_WIDTH, y: point.y + dz / VILLAGE_DEPTH }, VILLAGE_WALKABLE_AREAS)) return false
  }
  const others = decorations.filter((d) => d.id !== movingId && isFloorDecoration(d.itemId) === floor)
  if (floor) {
    return !others.some((d) => Math.abs(point.x - d.x) * VILLAGE_WIDTH < FLOOR_TILE_SIZE - 0.01 &&
      Math.abs(point.y - d.y) * VILLAGE_DEPTH < FLOOR_TILE_SIZE - 0.01)
  }
  if (others.some((d) => unitsBetween(point, d) < radius + decorationRadius(d.itemId))) return false
  return !occupants.some((o) => unitsBetween(point, o) < radius + 0.45)
}

/** Placed decorations become blocked squares, so characters walk around them (floor tiles excepted). */
export function villageWorld(world: WorldDefinition, decorations: readonly VillageDecoration[] = []): WorldDefinition {
  return {
    ...world,
    horizonY: 0,
    groundDepthRatio: VILLAGE_DEPTH / VILLAGE_WIDTH,
    // The lawn is wide: wander about 5 units from home, and now and then stroll anywhere.
    wanderRadius: 0.2,
    roamChance: 0.3,
    walkableAreas: VILLAGE_WALKABLE_AREAS,
    blockedAreas: decorations.filter((d) => !isFloorDecoration(d.itemId)).map((d) => {
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
