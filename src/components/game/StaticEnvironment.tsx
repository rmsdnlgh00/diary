import { getEnvironmentAsset } from '@/data/assets'
import type { DepthConfig } from '@/systems/depthSystem'
import type { WorldDefinition } from '@/types'
import { EnvironmentPlaceholder } from './placeholders/EnvironmentPlaceholder'
import { Sprite } from './Sprite'
import { WorldObject } from './WorldObject'

interface Props {
  world: WorldDefinition
  /** flat: 바닥에 깔리는 것(길, 연못) / standing: 세워지는 것(상점, 나무) */
  variant: 'flat' | 'standing'
  depthConfig: DepthConfig
}

/** 사용자가 옮길 수 없는 고정 지형지물. */
export function StaticEnvironment({ world, variant, depthConfig }: Props) {
  const objects = world.environment.filter((object) =>
    variant === 'flat' ? object.flat === true : object.flat !== true,
  )

  return (
    <>
      {objects.map((object) => {
        const asset = getEnvironmentAsset(world.id, object.kind)
        return (
          <WorldObject
            key={object.id}
            x={object.x}
            y={object.y}
            width={object.width ?? asset?.worldWidth ?? 0.1}
            anchorX={asset?.anchorX}
            anchorY={object.flat ? 0.5 : asset?.anchorY}
            scale={object.scale ?? asset?.defaultScale}
            flat={object.flat}
            flipX={object.flipX}
            depthConfig={depthConfig}
            shadow={!object.flat}
          >
            <Sprite asset={asset} placeholder={<EnvironmentPlaceholder kind={object.kind} />} />
          </WorldObject>
        )
      })}
    </>
  )
}
