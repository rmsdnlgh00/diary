import type { CSSProperties, ReactNode } from 'react'
import { type DepthConfig, getDepthScale, getRenderOrder } from '@/systems/depthSystem'

interface Props {
  x: number
  y: number
  /** 월드 가로 길이 대비 비율 */
  width: number
  /** 이미지 안에서 바닥에 닿는 지점. (x, y)가 이 점에 오도록 배치한다. */
  anchorX?: number
  anchorY?: number
  depthConfig?: DepthConfig
  scale?: number
  rotation?: number
  flipX?: boolean
  /** 바닥에 깔리는 오브젝트(길, 연못)는 깊이 정렬에서 빠진다. */
  flat?: boolean
  /** y 기반 자동 계산 대신 직접 지정 */
  zIndex?: number
  shadow?: boolean
  /** 몸이 떠오른 정도(0~1). 그림자를 그만큼 줄이고 옅게 한다. */
  shadowLift?: number
  onClick?: () => void
  label?: string
  className?: string
  children: ReactNode
}

/**
 * 월드 좌표(0~1)를 화면 위치로 바꾸고 y에 따른 크기/렌더 순서를 적용한다.
 * 캐릭터, 장식물, NPC, 정적 오브젝트가 모두 이 컴포넌트를 통해 배치된다.
 */
export function WorldObject({
  x,
  y,
  width,
  anchorX = 0.5,
  anchorY = 1,
  depthConfig,
  scale = 1,
  rotation = 0,
  flipX = false,
  flat = false,
  zIndex,
  shadow = false,
  shadowLift = 0,
  onClick,
  label,
  className = '',
  children,
}: Props) {
  const depthScale = getDepthScale(y, depthConfig)
  const transforms = [
    `translate(${-anchorX * 100}%, ${-anchorY * 100}%)`,
    `scale(${depthScale * scale})`,
    rotation ? `rotate(${rotation}deg)` : '',
    flipX ? 'scaleX(-1)' : '',
  ].filter(Boolean)

  const style: CSSProperties = {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: `${width * 100}%`,
    transform: transforms.join(' '),
    transformOrigin: `${anchorX * 100}% ${anchorY * 100}%`,
    zIndex: flat ? undefined : (zIndex ?? getRenderOrder(y)),
  }

  const classes = ['world-object', onClick ? 'world-object--interactive' : '', className]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {shadow && (
        <span
          className="world-object__shadow"
          style={
            {
              left: `${anchorX * 100}%`,
              top: `${anchorY * 100}%`,
              '--shadow-lift': shadowLift,
            } as CSSProperties
          }
        />
      )}
      {children}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={classes} style={style} onClick={onClick} aria-label={label}>
        {content}
      </button>
    )
  }

  return (
    <div className={classes} style={style}>
      {content}
    </div>
  )
}
