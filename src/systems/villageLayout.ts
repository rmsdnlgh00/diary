import * as THREE from 'three'
import type { WorldDefinition } from '@/types'

// Blender Z-up → glTF Y-up. The safe rectangle stays inside the trees and pond.
export const VILLAGE_WIDTH = 18
export const VILLAGE_DEPTH = 36
export const VILLAGE_CHARACTER_HEIGHT = 1.7
export const VILLAGE_BASIC_HEIGHT = 15.05
export const VILLAGE_OVERVIEW_HEIGHT = 74

export function villageGround(x: number, y: number): THREE.Vector3 {
  return new THREE.Vector3((x - 0.5) * VILLAGE_WIDTH, 0, (y - 0.5) * VILLAGE_DEPTH)
}

export function villagePoint(point: THREE.Vector3) {
  return { x: point.x / VILLAGE_WIDTH + 0.5, y: point.z / VILLAGE_DEPTH + 0.5 }
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
