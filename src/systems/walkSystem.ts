import type { Facing } from '@/types'

/** 걷기 사이클 32프레임 = 두 걸음이므로 한 걸음은 16프레임이다. */
const MALE_WALK_FRAMES_PER_STEP = 16
/** 보폭 ÷ 캐릭터 키. 예전 렌더 원본에서 실측한 값이다. */
const MALE_WALK_STRIDE_RATIO = 0.4641

/**
 * 3D 렌더 걷기의 재생 속도.
 *
 * 32 프레임이 두 걸음이므로 한 걸음은 16 프레임이다. 24fps 면 한 걸음이
 * 0.67 초로 사람이 걷는 속도에 가깝다. 아래 speed 가 이 값에서 계산되므로
 * 여기만 바꾸면 걸음과 이동이 함께 맞춰진다.
 */
export const MALE_WALK_FPS = 24

/** 화면에서 캐릭터 키가 마을 전체 높이의 몇 %인지. ThreeStage 와 같은 값. */
const CHARACTER_HEIGHT_FRACTION = 0.08
/** 16:9 이므로 세로 비율을 가로 단위로 환산한다. 월드 좌표는 가로 기준이다. */
const HEIGHT_TO_WIDTH_UNITS = 9 / 16

/** 한 걸음에 나아가는 거리 (월드 가로 길이 대비). */
export const MALE_WALK_STRIDE =
  CHARACTER_HEIGHT_FRACTION * HEIGHT_TO_WIDTH_UNITS * MALE_WALK_STRIDE_RATIO

export const WALK_CONFIG = {
  /**
   * 초당 이동 거리 (월드 가로 길이 대비).
   *
   * 보폭 × 초당 걸음 수. 이렇게 맞춰야 발이 땅을 잡고 걷는 것으로 보인다.
   * 둘이 어긋나면 걸음보다 몸이 빨라져 발이 미끄러진다.
   */
  speed: MALE_WALK_STRIDE * (MALE_WALK_FPS / MALE_WALK_FRAMES_PER_STEP),
  /*
   * 출발·도착의 완급.
   *
   * 프레임이 걸은 거리에서 나오므로 몸이 느려지면 다리도 같이 느려진다.
   * 그래서 감속 구간이 길면 슬로우모션처럼 보인다. 사람은 걷다가 멈출 때
   * 보속을 절반으로 떨어뜨리지 않고 마지막 한 걸음에 발을 디뎌 선다.
   * 그 느낌이 나도록 감속 구간을 한 걸음 안쪽(0.021)으로 줄이고
   * 하한 속도를 올려, 느려지는 구간이 0.3 초 안에 끝나게 했다.
   */
  /** 출발할 때 이 시간에 걸쳐 제 속도까지 올린다(초) */
  accelSeconds: 0.15,
  /** 목적지가 이 거리 안에 들어오면 속도를 줄이기 시작한다 */
  decelDistance: 0.014,
  /** 아무리 줄여도 이 비율 아래로는 안 내려간다. 0 이 되면 영영 도착하지 못한다. */
  minSpeedRatio: 0.6,
  /** 이 거리 안이면 도착으로 본다. 너무 작으면 마지막을 기어가듯 좁힌다. */
  arriveEpsilon: 0.006,
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
  groundDepthRatio: number = Y_TO_X,
): number => Math.hypot(bx - ax, (by - ay) * groundDepthRatio)

/**
 * 이동 벡터에서 바라볼 방향을 고른다.
 * 대각선에서는 더 큰 축을 따르되, 현재 방향에 가산점을 줘서
 * 경계에서 방향이 계속 뒤집히지 않게 한다.
 */
export function pickFacing(dx: number, dy: number, current: Facing, groundDepthRatio: number = Y_TO_X): Facing {
  const horizontal = Math.abs(dx)
  const vertical = Math.abs(dy) * groundDepthRatio
  if (horizontal === 0 && vertical === 0) return current

  const currentIsHorizontal = current === 'left' || current === 'right'
  const bias = WALK_CONFIG.facingHysteresis
  const preferHorizontal = currentIsHorizontal
    ? horizontal * bias >= vertical
    : horizontal >= vertical * bias

  if (preferHorizontal) return dx >= 0 ? 'right' : 'left'
  return dy >= 0 ? 'down' : 'up'
}

/** 0~1 을 양 끝이 완만한 곡선으로 바꾼다 */
const smoothstep = (t: number): number => {
  const clamped = Math.min(1, Math.max(0, t))
  return clamped * clamped * (3 - 2 * clamped)
}

/**
 * 출발·도착에서의 속도 배율.
 * 등속으로 움직이면 툭 튀어나가고 툭 멈춰서 기계처럼 보인다.
 */
export function speedRatio(elapsedSeconds: number, remainingDistance: number): number {
  const accelerating = smoothstep(elapsedSeconds / WALK_CONFIG.accelSeconds)
  const decelerating = smoothstep(remainingDistance / WALK_CONFIG.decelDistance)
  return Math.max(WALK_CONFIG.minSpeedRatio, accelerating * decelerating)
}
