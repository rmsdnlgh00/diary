import { getDecorationAsset } from '@/data/assets'
import type { DepthConfig } from '@/systems/depthSystem'
import type { DecorationData } from '@/types'
import { DecorationPlaceholder } from './placeholders/DecorationPlaceholder'
import { Sprite } from './Sprite'
import { WorldObject } from './WorldObject'

interface Props {
  decoration: DecorationData
  depthConfig: DepthConfig
}

/** 사용자가 배치하는 장식물. 이번 단계에서는 월드 데이터에 미리 놓인 것만 그린다. */
export function PlaceableObject({ decoration, depthConfig }: Props) {
  const asset = getDecorationAsset(decoration.type)

  return (
    <WorldObject
      x={decoration.x}
      y={decoration.y}
      width={asset.worldWidth}
      anchorX={asset.anchorX}
      anchorY={asset.anchorY}
      scale={decoration.scale * asset.defaultScale}
      rotation={decoration.rotation}
      depthConfig={depthConfig}
      shadow
    >
      <Sprite asset={asset} placeholder={<DecorationPlaceholder type={decoration.type} />} />
    </WorldObject>
  )
}
