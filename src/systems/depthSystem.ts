export interface DepthConfig {
  /** 이 y 위쪽은 원경. 가장 작게 보인다. */
  horizonY: number
  /** 화면 맨 앞. 가장 크게 보인다. */
  frontY: number
  minScale: number
  maxScale: number
}

export const DEFAULT_DEPTH_CONFIG: DepthConfig = {
  horizonY: 0.46,
  frontY: 1,
  minScale: 0.72,
  maxScale: 1.18,
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

/** y를 0(가장 뒤) ~ 1(가장 앞) 비율로 변환한다. */
export function getDepthRatio(y: number, config: DepthConfig = DEFAULT_DEPTH_CONFIG): number {
  const span = config.frontY - config.horizonY
  if (span <= 0) return 0
  return clamp01((y - config.horizonY) / span)
}

/** y가 앞쪽일수록 커진다. */
export function getDepthScale(y: number, config: DepthConfig = DEFAULT_DEPTH_CONFIG): number {
  const ratio = getDepthRatio(y, config)
  return config.minScale + (config.maxScale - config.minScale) * ratio
}

/** y가 앞쪽일수록 큰 값 → 그대로 z-index로 쓴다. */
export function getRenderOrder(y: number): number {
  return Math.round(clamp01(y) * 10000)
}

export function sortByDepth<T extends { y: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.y - b.y)
}
