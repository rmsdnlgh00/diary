import type { Facing, WalkDirection } from '@/types'

export const WALK_CONFIG = {
  /**
   * 초당 이동 거리 (월드 가로 길이 대비).
   *
   * 속도와 fps 가 따로 놀면 발이 땅에서 미끄러진다.
   * 8프레임이 한 사이클(두 걸음)이므로 fps 8이면 초당 두 걸음이고,
   * 화면 높이의 8%인 캐릭터의 한 걸음은 화면 가로로 약 0.016 이다.
   * 그래서 fps 8 에 맞는 속도는 약 0.032 다.
   *
   *   미끄러지지 않는 속도 ≈ fps / 8 * 0.032
   *
   * 더 빠르게 걷게 하려면 fps 도 같이 올려야 한다. (예: 속도 0.048 ↔ fps 12)
   */
  speed: 0.032,
  /** 걷기 프레임 재생 속도 */
  fps: 8,
  /** 이 거리 안이면 도착으로 본다 */
  arriveEpsilon: 0.004,
  /**
   * 대각선에서 방향이 떨리지 않게 하는 여유값.
   * 지금 방향을 유지하려는 축이 다른 축보다 이 배수 이상 작아져야 방향이 바뀐다.
   */
  facingHysteresis: 1.35,
}

/** 16:9라 y 1만큼은 x 9/16만큼의 실제 거리다. */
const Y_TO_X = 9 / 16

export const worldDistance = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number => Math.hypot(bx - ax, (by - ay) * Y_TO_X)

/**
 * 이동 벡터에서 바라볼 방향을 고른다.
 * 대각선에서는 더 큰 축을 따르되, 현재 방향에 가산점을 줘서
 * 경계에서 방향이 계속 뒤집히지 않게 한다.
 */
export function pickFacing(dx: number, dy: number, current: Facing): Facing {
  const horizontal = Math.abs(dx)
  const vertical = Math.abs(dy) * Y_TO_X
  if (horizontal === 0 && vertical === 0) return current

  const currentIsHorizontal = current === 'left' || current === 'right'
  const bias = WALK_CONFIG.facingHysteresis
  const preferHorizontal = currentIsHorizontal
    ? horizontal * bias >= vertical
    : horizontal >= vertical * bias

  if (preferHorizontal) return dx >= 0 ? 'right' : 'left'
  return dy >= 0 ? 'down' : 'up'
}

export const directionOf = (facing: Facing): WalkDirection => {
  if (facing === 'down') return 'front'
  if (facing === 'up') return 'back'
  return facing === 'left' ? 'left' : 'right'
}

/** 걷기 시작 후 흐른 시간으로 프레임 번호를 구한다. */
export const frameAt = (elapsedSeconds: number, frameCount: number, fps: number): number =>
  Math.floor(elapsedSeconds * fps) % frameCount
