import { getNpcAsset } from '@/data/assets'
import type { DepthConfig } from '@/systems/depthSystem'
import type { NpcData } from '@/types'
import { NpcPlaceholder } from './placeholders/NpcPlaceholder'
import { Sprite } from './Sprite'
import { WorldObject } from './WorldObject'

interface Props {
  npc: NpcData
  depthConfig: DepthConfig
}

/** 이번 단계에서는 위치/크기/깊이/anchor만 다룬다. 행동 로직은 다음 단계. */
export function NPC({ npc, depthConfig }: Props) {
  const asset = getNpcAsset(npc.type)

  return (
    <WorldObject
      x={npc.x}
      y={npc.y}
      width={asset.worldWidth}
      anchorX={asset.anchorX}
      anchorY={asset.anchorY}
      scale={npc.scale * asset.defaultScale}
      depthConfig={depthConfig}
      shadow
    >
      <Sprite asset={asset} placeholder={<NpcPlaceholder type={npc.type} />} />
    </WorldObject>
  )
}
