import type { WorldDefinition } from '@/types'

export const WORLD_2026_09: WorldDefinition = {
  id: '2026-09',
  year: 2026,
  month: 9,
  label: '2026년 9월',
  horizonY: 0.46,
  palette: {
    skyTop: '#a9e2ff',
    skyBottom: '#e7f6ff',
    hillFar: '#c4e4ae',
    hillNear: '#a7d88b',
    groundBack: '#a3d97f',
    groundFront: '#8fcd6a',
  },
  backgroundAsset: null,
  environment: [
    { id: 'path-main', kind: 'PATH', x: 0.48, y: 0.8, width: 0.82, flat: true },
    { id: 'pond-right', kind: 'POND', x: 0.82, y: 0.66, width: 0.26, flat: true },
    { id: 'shop-left', kind: 'SHOP', x: 0.23, y: 0.63, width: 0.22 },
    { id: 'bridge-right', kind: 'BRIDGE', x: 0.82, y: 0.64, width: 0.18 },
    { id: 'tree-far-left', kind: 'BIG_TREE', x: 0.05, y: 0.58, width: 0.14 },
    { id: 'tree-far-right', kind: 'BIG_TREE', x: 0.96, y: 0.55, width: 0.12, flipX: true },
    { id: 'tree-front-right', kind: 'BIG_TREE', x: 0.93, y: 0.95, width: 0.2 },
    { id: 'bush-a', kind: 'BUSH', x: 0.42, y: 0.55, width: 0.07 },
    { id: 'bush-b', kind: 'BUSH', x: 0.62, y: 0.54, width: 0.06 },
    { id: 'bush-c', kind: 'BUSH', x: 0.12, y: 0.86, width: 0.09 },
    { id: 'fence-a', kind: 'FENCE', x: 0.34, y: 0.53, width: 0.1 },
    { id: 'fence-b', kind: 'FENCE', x: 0.5, y: 0.525, width: 0.1 },
    { id: 'fence-c', kind: 'FENCE', x: 0.66, y: 0.52, width: 0.1 },
  ],
  spawnZones: [
    { id: 'lawn-center', xRange: [0.32, 0.64], yRange: [0.58, 0.68] },
    { id: 'lawn-front', xRange: [0.2, 0.68], yRange: [0.84, 0.94] },
    { id: 'shop-front', xRange: [0.12, 0.32], yRange: [0.71, 0.79] },
    { id: 'pond-side', xRange: [0.6, 0.76], yRange: [0.86, 0.94] },
  ],
}

export const WORLDS: Record<string, WorldDefinition> = {
  [WORLD_2026_09.id]: WORLD_2026_09,
}

export const DEFAULT_WORLD_ID = WORLD_2026_09.id

export const getWorld = (id: string): WorldDefinition => WORLDS[id] ?? WORLD_2026_09
