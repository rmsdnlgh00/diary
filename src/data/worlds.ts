import type { WorldDefinition } from '@/types'

/**
 * 월드 하나 = 한 달.
 * 새로운 달을 추가하려면 이 파일에 WorldDefinition을 하나 더 만들고
 * WORLDS에 등록하면 된다. 게임 로직은 수정할 필요가 없다.
 */
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
  environment: [
    { id: 'path-main', kind: 'PATH', x: 0.48, y: 0.82, width: 0.84, flat: true },
    { id: 'pond-right', kind: 'POND', x: 0.85, y: 0.62, width: 0.18, flat: true },
    { id: 'shop-left', kind: 'SHOP', x: 0.19, y: 0.62 },
    { id: 'bridge-right', kind: 'BRIDGE', x: 0.85, y: 0.6, width: 0.13 },
    { id: 'tree-left', kind: 'BIG_TREE', x: 0.04, y: 0.6, width: 0.13 },
    { id: 'tree-back-right', kind: 'BIG_TREE', x: 0.71, y: 0.545, width: 0.1, flipX: true },
    { id: 'tree-front-right', kind: 'BIG_TREE', x: 0.96, y: 1.0, width: 0.19 },
    { id: 'bush-a', kind: 'BUSH', x: 0.36, y: 0.545 },
    { id: 'bush-b', kind: 'BUSH', x: 0.58, y: 0.535, width: 0.055 },
    { id: 'bush-c', kind: 'BUSH', x: 0.09, y: 0.88, width: 0.08 },
    { id: 'fence-a', kind: 'FENCE', x: 0.27, y: 0.515 },
    { id: 'fence-b', kind: 'FENCE', x: 0.44, y: 0.51 },
    { id: 'fence-c', kind: 'FENCE', x: 0.61, y: 0.505 },
  ],
  decorations: [
    { id: 'deco-tree-1', type: 'TREE', x: 0.32, y: 0.65, scale: 1, rotation: 0, createdAt: 0 },
    { id: 'deco-picnic-1', type: 'PICNIC_MAT', x: 0.44, y: 0.7, scale: 1, rotation: 0, createdAt: 0 },
    { id: 'deco-lamp-1', type: 'LAMP', x: 0.57, y: 0.69, scale: 1, rotation: 0, createdAt: 0 },
    { id: 'deco-bench-1', type: 'BENCH', x: 0.67, y: 0.77, scale: 1, rotation: 0, createdAt: 0 },
    { id: 'deco-bicycle-1', type: 'BICYCLE', x: 0.24, y: 0.78, scale: 1, rotation: 0, createdAt: 0 },
    { id: 'deco-flower-1', type: 'FLOWER', x: 0.13, y: 0.85, scale: 1, rotation: 0, createdAt: 0 },
    { id: 'deco-flower-2', type: 'FLOWER', x: 0.82, y: 0.86, scale: 1, rotation: 0, createdAt: 0 },
  ],
  npcs: [{ id: 'npc-dog-1', type: 'DOG', x: 0.29, y: 0.7, scale: 1 }],
  // 하단 UI에 캐릭터가 가리지 않도록 y는 0.85까지만 쓴다.
  walkableAreas: [
    { id: 'lawn-back', x: [0.32, 0.68], y: [0.56, 0.66] },
    { id: 'lawn-mid', x: [0.12, 0.72], y: [0.66, 0.76] },
    { id: 'lawn-front', x: [0.1, 0.82], y: [0.76, 0.85] },
  ],
  blockedAreas: [
    { id: 'pond', x: [0.72, 0.98], y: [0.5, 0.74] },
    { id: 'shop', x: [0.06, 0.32], y: [0.44, 0.66] },
    { id: 'tree-front-right', x: [0.84, 1.0], y: [0.72, 1.0] },
    { id: 'tree-left', x: [0.0, 0.12], y: [0.48, 0.64] },
  ],
}

export const WORLDS: Record<string, WorldDefinition> = {
  [WORLD_2026_09.id]: WORLD_2026_09,
}

export const DEFAULT_WORLD_ID = WORLD_2026_09.id

export const getWorld = (id: string): WorldDefinition => WORLDS[id] ?? WORLD_2026_09
