// 이 파일은 `npm run pack-male` 이 만든다. 직접 고치면 다음 실행 때 덮어쓰인다.
// 원본은 src/assets/character/male/walk/{방향}/*.png 이다.

import type { WalkDirection } from '@/types'

export interface MaleWalkSheet {
  src: string
  cols: number
  rows: number
  cellW: number
  cellH: number
  /** 셀 안에서 발이 땅에 닿는 지점 (px) */
  footX: number
  footY: number
  /** 셀 안에서 캐릭터 키 (px). 화면 표시 크기 환산에 쓴다. */
  bodyH: number
  /** 두 발이 가장 모인 프레임. 서 있을 때 이 자세로 멈춘다. */
  idleFrame: number
}

export const MALE_WALK_FRAME_COUNT = 32

/**
 * 보폭을 키로 나눈 값. 측면에서 잰 것이 실제 보폭이다.
 * 정면·후면은 발이 화면 안쪽으로 움직여 보폭이 작게 측정된다.
 *
 * 이동 속도를 이 값에 맞춰야 발이 미끄러지지 않는다.
 * walkSystem 의 WALK_CONFIG.speed 가 이 값에서 계산된다.
 */
export const MALE_WALK_STRIDE_RATIO = 0.4641

/** 한 걸음에 쓰이는 프레임 수. 한 사이클은 두 걸음이다. */
export const MALE_WALK_FRAMES_PER_STEP = 16

export const MALE_WALK_SHEETS: Record<WalkDirection, MaleWalkSheet> = {
  front: {
    src: '/assets/characters/male/walk-front.webp',
    cols: 8,
    rows: 4,
    cellW: 123,
    cellH: 256,
    footX: 65.1,
    footY: 251.9,
    bodyH: 243.2,
    idleFrame: 26,
  },
  back: {
    src: '/assets/characters/male/walk-back.webp',
    cols: 8,
    rows: 4,
    cellW: 123,
    cellH: 256,
    footX: 61.5,
    footY: 250.5,
    bodyH: 246.4,
    idleFrame: 23,
  },
  left: {
    src: '/assets/characters/male/walk-left.webp',
    cols: 8,
    rows: 4,
    cellW: 123,
    cellH: 256,
    footX: 62.3,
    footY: 248.2,
    bodyH: 240.5,
    idleFrame: 16,
  },
  right: {
    src: '/assets/characters/male/walk-right.webp',
    cols: 8,
    rows: 4,
    cellW: 123,
    cellH: 256,
    footX: 65.5,
    footY: 247.8,
    bodyH: 244.1,
    idleFrame: 16,
  },
}
