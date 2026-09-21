import { getBackgroundAsset } from '@/data/assets'
import { useAssetSrc } from '@/hooks/useAssetReady'
import type { WorldDefinition } from '@/types'

interface Props {
  world: WorldDefinition
}

/** 하늘 / 원경 / 지면. 배치 가능한 물체는 절대 여기에 포함하지 않는다. */
export function Background({ world }: Props) {
  const asset = getBackgroundAsset(world.id)
  const src = useAssetSrc(asset?.src ?? null)
  const { palette, horizonY } = world

  if (src) {
    return (
      <div className="layer layer--background">
        <img className="bg-image" src={src} alt="" draggable={false} />
      </div>
    )
  }

  return (
    <div className="layer layer--background">
      <div
        className="bg-sky"
        style={{ background: `linear-gradient(180deg, ${palette.skyTop} 0%, ${palette.skyBottom} 100%)` }}
      />

      <div className="bg-cloud bg-cloud--a" />
      <div className="bg-cloud bg-cloud--b" />
      <div className="bg-cloud bg-cloud--c" />

      <svg
        className="bg-hills"
        /* 지면과 0.6% 겹쳐서 서브픽셀 반올림으로 생기는 하늘 틈을 막는다. */
        style={{ bottom: `${(1 - horizonY) * 100 - 0.6}%` }}
        viewBox="0 0 160 30"
        preserveAspectRatio="none"
        role="presentation"
      >
        <path d="M0 30 Q22 4 44 30 Z" fill={palette.hillFar} />
        <path d="M30 30 Q60 0 92 30 Z" fill={palette.hillFar} />
        <path d="M78 30 Q104 8 130 30 Z" fill={palette.hillNear} />
        <path d="M118 30 Q142 6 168 30 Z" fill={palette.hillFar} />
      </svg>

      <div
        className="bg-ground"
        style={{
          top: `${horizonY * 100}%`,
          background: `linear-gradient(180deg, ${palette.groundBack} 0%, ${palette.groundFront} 100%)`,
        }}
      />
    </div>
  )
}
