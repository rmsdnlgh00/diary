import type { CSSProperties, ReactNode } from 'react'
import { type DepthConfig, getDepthScale, getRenderOrder } from '@/systems/depthSystem'

interface Props {
  x: number
  y: number
  /** 월드 가로 길이 대비 비율 */
  width: number
  depthConfig?: DepthConfig
  scale?: number
  rotation?: number
  flipX?: boolean
  /** 바닥에 깔리는 오브젝트(길, 연못, 매트)는 기준점이 중앙이고 깊이 정렬에서 빠진다. */
  flat?: boolean
  shadow?: boolean
  onClick?: () => void
  label?: string
  className?: string
  children: ReactNode
}

/**
 * 월드 좌표(0~1)를 화면 위치로 바꾸고 y에 따른 크기/렌더 순서를 적용한다.
 * 캐릭터, 장식물, 정적 오브젝트가 모두 이 컴포넌트를 통해 배치된다.
 */
export function WorldObject({
  x,
  y,
  width,
  depthConfig,
  scale = 1,
  rotation = 0,
  flipX = false,
  flat = false,
  shadow = false,
  onClick,
  label,
  className = '',
  children,
}: Props) {
  const depthScale = getDepthScale(y, depthConfig)
  const transforms = [
    `translate(-50%, ${flat ? '-50%' : '-100%'})`,
    `scale(${depthScale * scale})`,
    rotation ? `rotate(${rotation}deg)` : '',
    flipX ? 'scaleX(-1)' : '',
  ].filter(Boolean)

  const style: CSSProperties = {
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: `${width * 100}%`,
    transform: transforms.join(' '),
    transformOrigin: flat ? 'center' : 'bottom center',
    zIndex: flat ? undefined : getRenderOrder(y),
  }

  const classes = [
    'world-object',
    flat ? 'world-object--flat' : '',
    shadow ? 'world-object--shadow' : '',
    onClick ? 'world-object--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (onClick) {
    return (
      <button type="button" className={classes} style={style} onClick={onClick} aria-label={label}>
        {children}
      </button>
    )
  }

  return (
    <div className={classes} style={style}>
      {children}
    </div>
  )
}
