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
}

export const MALE_WALK_FRAME_COUNT = 32

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
  },
}
