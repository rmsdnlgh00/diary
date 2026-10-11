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
 * 0.5-unit grid: inside the lawn, 0.6 units clear of the pond, trees, bushes,
 * fences and bench, and on screen above the bottom menu (≈ 277 m²).
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

export function villageWorld(world: WorldDefinition): WorldDefinition {
  return {
    ...world,
    horizonY: 0,
    groundDepthRatio: VILLAGE_DEPTH / VILLAGE_WIDTH,
    walkableAreas: VILLAGE_WALKABLE_AREAS,
    blockedAreas: [],
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
