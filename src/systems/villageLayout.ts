import * as THREE from 'three'
import type { WorldDefinition } from '@/types'

/*
 * V4 village: the 3D remake of the legacy painted village
 * (Blender scene "Diary Village V4 | Legacy View"). Blender Z-up → glTF Y-up,
 * so Blender (x, y, z) becomes (x, z, -y).
 *
 * The walk rectangle is the largest clear rectangle on the painted lawn, away
 * from the pond, bench, bushes and trees (11 × 13 units ≈ 143 m² for 30 people).
 */
export const VILLAGE_WIDTH = 11
export const VILLAGE_DEPTH = 13
export const VILLAGE_CENTER = { x: 1.5, z: 0.5 }
export const VILLAGE_CHARACTER_HEIGHT = 1.7

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
    walkableAreas: [{ id: 'village-clear-lawn', x: [0.06, 0.94], y: [0.06, 0.94] }],
    blockedAreas: [],
  }
}
