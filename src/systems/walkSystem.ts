import type { Facing, WalkDirection } from '@/types'

export const WALK_CONFIG = {
  /**
   * 초당 이동 거리 (월드 가로 길이 대비).
   *
   * 원래는 보폭에 맞춰 속도를 정해야 발이 안 미끄러지는데,
   * 지금 그림에는 걸음 자체가 없어서(프레임 간 다리 벌어짐 차이가 2~10%p뿐,
   * 정상 걷기는 35%p) 맞출 보폭이 없다. 그래서 보기 좋은 값으로만 잡아 둔다.
   * 제대로 된 걷기 4프레임이 들어오면 그때 fps 와 함께 다시 맞춘다.
   */
  speed: 0.032,
  /**
   * 걷기 프레임 재생 속도.
   * 받은 그림이 제대로 된 걷기 사이클이 아니라 프레임마다 작화 편차만 있어서,
   * 8fps 로 전부 돌리면 걷는 게 아니라 떠는 것처럼 보인다.
   * 그래서 방향별 sequence 로 2장만 고르고 속도도 낮췄다.
   */
  fps: 3,
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

/** 걷기 시작 후 흐른 시간으로 재생할 프레임 번호를 구한다. */
export const frameAt = (elapsedSeconds: number, sequence: readonly number[], fps: number): number =>
  sequence[Math.floor(elapsedSeconds * fps) % sequence.length]
