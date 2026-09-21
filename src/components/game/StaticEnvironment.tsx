import { resolveAsset } from '@/systems/assetSystem'
import type { DepthConfig } from '@/systems/depthSystem'
import type { WorldDefinition } from '@/types'
import { EnvSprite } from './EnvSprite'
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
        const image = resolveAsset(object.asset ?? null)
        return (
          <WorldObject
            key={object.id}
            x={object.x}
            y={object.y}
            width={object.width}
            flat={object.flat}
            flipX={object.flipX}
            depthConfig={depthConfig}
            shadow={!object.flat}
          >
            {image ? (
              <img className="env-sprite" src={image} alt="" />
            ) : (
              <EnvSprite kind={object.kind} />
            )}
          </WorldObject>
        )
      })}
    </>
  )
}
