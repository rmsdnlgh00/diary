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
  // 쿼터뷰 배경이라 지평선이 위쪽에 있다. 깊이 스케일 계산 기준.
  horizonY: 0.25,
  palette: {
    skyTop: '#a9e2ff',
    skyBottom: '#e7f6ff',
    hillFar: '#c4e4ae',
    hillNear: '#a7d88b',
    groundBack: '#a3d97f',
    groundFront: '#8fcd6a',
  },
  // 상점 · 연못 · 다리 · 벤치 · 가로등은 배경 그림에 이미 들어 있다.
  // 사용자가 새로 놓는 물체만 별도 오브젝트로 올린다.
  environment: [],
  decorations: [],
  npcs: [],
  // 배경 그림의 잔디밭에 맞춘 영역. 하단 UI에 가리지 않도록 y는 0.78까지만 쓴다.
  walkableAreas: [
    { id: 'lawn-upper', x: [0.37, 0.58], y: [0.36, 0.46] },
    { id: 'lawn-mid', x: [0.33, 0.78], y: [0.46, 0.62] },
    { id: 'lawn-lower', x: [0.3, 0.8], y: [0.62, 0.78] },
  ],
  blockedAreas: [
    { id: 'pond', x: [0.0, 0.39], y: [0.28, 0.7] },
    { id: 'bench', x: [0.57, 0.73], y: [0.28, 0.44] },
    { id: 'right-edge', x: [0.8, 1.0], y: [0.36, 1.0] },
    { id: 'front-left-trees', x: [0.0, 0.29], y: [0.7, 1.0] },
  ],
}

export const WORLDS: Record<string, WorldDefinition> = {
  [WORLD_2026_09.id]: WORLD_2026_09,
}

export const DEFAULT_WORLD_ID = WORLD_2026_09.id

export const getWorld = (id: string): WorldDefinition => WORLDS[id] ?? WORLD_2026_09
