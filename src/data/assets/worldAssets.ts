import type { AssetMeta, EnvironmentKind } from '@/types'

export interface WorldAssetSet {
  background: AssetMeta
  environment: Partial<Record<EnvironmentKind, AssetMeta>>
}

const root = (worldId: string) => `/assets/worlds/${worldId}`

function environmentAsset(
  worldId: string,
  kind: EnvironmentKind,
  file: string,
  worldWidth: number,
  anchorY: number,
): AssetMeta {
  return {
    id: `env.${worldId}.${kind.toLowerCase()}`,
    type: kind,
    src: `${root(worldId)}/environment/${file}`,
    anchorX: 0.5,
    anchorY,
    defaultScale: 1,
    worldWidth,
    layer: 'environment',
  }
}

/** 월을 추가하려면 이 객체에 키 하나만 더 넣으면 된다. */
export const worldAssets: Record<string, WorldAssetSet> = {
  '2026-09': {
    background: {
      id: 'world.2026-09.background',
      type: 'BACKGROUND',
      src: `${root('2026-09')}/background.webp`,
      anchorX: 0.5,
      anchorY: 0.5,
      defaultScale: 1,
      worldWidth: 1,
      layer: 'background',
    },
    environment: {
      SHOP: environmentAsset('2026-09', 'SHOP', 'shop.webp', 0.2, 0.97),
      POND: environmentAsset('2026-09', 'POND', 'pond.webp', 0.2, 0.5),
      BRIDGE: environmentAsset('2026-09', 'BRIDGE', 'bridge.webp', 0.14, 0.92),
      PATH: environmentAsset('2026-09', 'PATH', 'path.webp', 0.84, 0.5),
      FENCE: environmentAsset('2026-09', 'FENCE', 'fence.webp', 0.1, 0.95),
      BIG_TREE: environmentAsset('2026-09', 'BIG_TREE', 'tree.webp', 0.14, 0.97),
      BUSH: environmentAsset('2026-09', 'BUSH', 'bush.webp', 0.07, 0.92),
    },
  },
}
