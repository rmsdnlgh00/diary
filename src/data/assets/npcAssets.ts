import type { AssetMeta, NpcType } from '@/types'

export const npcAssets: Record<NpcType, AssetMeta> = {
  DOG: {
    id: 'npc.dog',
    type: 'DOG',
    src: '/assets/npcs/dog/dog.webp',
    anchorX: 0.5,
    anchorY: 0.94,
    defaultScale: 1,
    worldWidth: 0.045,
    layer: 'npc',
  },
}
