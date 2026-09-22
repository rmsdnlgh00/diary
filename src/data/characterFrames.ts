import type { DirectionSheet, EmotionId, WalkDirection } from '@/types'

/**
 * 걷기 시트의 프레임별 보정값.
 *
 * AI로 만든 초안이라 프레임마다 머리 위치·크기·발 높이가 어긋난다.
 * 아래 값은 각 셀의 알파 바운딩 박스를 실제로 측정해서 만든 것이고,
 * 그림을 다시 그리면 scripts 없이 여기 숫자만 고치면 된다.
 *
 *  footX/footY : 셀 안에서 캐릭터가 땅을 딛는 지점 (px)
 *  scale       : 프레임 간 크기 편차 보정 (기준 높이 / 이 프레임 높이)
 *  offsetX/Y   : 눈으로 보고 미세 조정할 때 쓰는 값 (기본 0)
 *  faceX/faceY : 눈 에셋을 붙일 얼굴 기준점 (px)
 *  faceW       : 얼굴(눈) 폭 (px)
 */

export const WALK_SHEETS: Record<WalkDirection, DirectionSheet> = {
  front: {
    src: '/assets/character/walk-front.png',
    cols: 4,
    rows: 2,
    cellW: 384,
    cellH: 512,
    refHeight: 477,
    eyes: 'both',
    frames: [
    /* 0 */ { footX: 205, footY: 500, scale: 0.9958, offsetX: 0, offsetY: 0, faceX: 205, faceY: 190, faceW: 159 },
    /* 1 */ { footX: 192, footY: 497, scale: 1, offsetX: 0, offsetY: 0, faceX: 192, faceY: 188, faceW: 157 },
    /* 2 */ { footX: 185, footY: 503, scale: 0.9876, offsetX: 0, offsetY: 0, faceX: 185, faceY: 190, faceW: 159 },
    /* 3 */ { footX: 175, footY: 503, scale: 0.9876, offsetX: 0, offsetY: 0, faceX: 175, faceY: 190, faceW: 159 },
    /* 4 */ { footX: 205, footY: 484, scale: 1.0085, offsetX: 0, offsetY: 0, faceX: 205, faceY: 178, faceW: 159 },
    /* 5 */ { footX: 193, footY: 482, scale: 1.0106, offsetX: 0, offsetY: 0, faceX: 193, faceY: 176, faceW: 159 },
    /* 6 */ { footX: 185, footY: 483, scale: 1.0106, offsetX: 0, offsetY: 0, faceX: 185, faceY: 177, faceW: 160 },
    /* 7 */ { footX: 176, footY: 483, scale: 1.0085, offsetX: 0, offsetY: 0, faceX: 176, faceY: 177, faceW: 161 },
    ],
  },
  side: {
    src: '/assets/character/walk-side.png',
    cols: 4,
    rows: 2,
    cellW: 384,
    cellH: 512,
    refHeight: 476,
    eyes: 'single',
    frames: [
    /* 0 */ { footX: 206, footY: 498, scale: 1.0042, offsetX: 0, offsetY: 0, faceX: 276, faceY: 207, faceW: 103 },
    /* 1 */ { footX: 194, footY: 500, scale: 0.9958, offsetX: 0, offsetY: 0, faceX: 264, faceY: 207, faceW: 102 },
    /* 2 */ { footX: 184, footY: 500, scale: 0.9937, offsetX: 0, offsetY: 0, faceX: 254, faceY: 206, faceW: 103 },
    /* 3 */ { footX: 185, footY: 497, scale: 1.0063, offsetX: 0, offsetY: 0, faceX: 255, faceY: 207, faceW: 103 },
    /* 4 */ { footX: 202, footY: 488, scale: 1.0063, offsetX: 0, offsetY: 0, faceX: 272, faceY: 198, faceW: 103 },
    /* 5 */ { footX: 193, footY: 493, scale: 0.9958, offsetX: 0, offsetY: 0, faceX: 263, faceY: 200, faceW: 102 },
    /* 6 */ { footX: 185, footY: 493, scale: 0.9958, offsetX: 0, offsetY: 0, faceX: 255, faceY: 200, faceW: 103 },
    /* 7 */ { footX: 187, footY: 488, scale: 1.0063, offsetX: 0, offsetY: 0, faceX: 257, faceY: 198, faceW: 103 },
    ],
  },
  back: {
    src: '/assets/character/walk-back.png',
    cols: 4,
    rows: 2,
    cellW: 384,
    cellH: 512,
    refHeight: 469,
    eyes: 'none',
    frames: [
    /* 0 */ { footX: 211, footY: 497, scale: 0.9915, offsetX: 0, offsetY: 0, faceX: 211, faceY: 191, faceW: 160 },
    /* 1 */ { footX: 193, footY: 491, scale: 1.0021, offsetX: 0, offsetY: 0, faceX: 193, faceY: 188, faceW: 159 },
    /* 2 */ { footX: 189, footY: 498, scale: 0.9874, offsetX: 0, offsetY: 0, faceX: 189, faceY: 190, faceW: 159 },
    /* 3 */ { footX: 174, footY: 490, scale: 1.0021, offsetX: 0, offsetY: 0, faceX: 174, faceY: 187, faceW: 160 },
    /* 4 */ { footX: 213, footY: 489, scale: 0.9958, offsetX: 0, offsetY: 0, faceX: 213, faceY: 184, faceW: 161 },
    /* 5 */ { footX: 193, footY: 486, scale: 1.0043, offsetX: 0, offsetY: 0, faceX: 193, faceY: 183, faceW: 160 },
    /* 6 */ { footX: 190, footY: 487, scale: 1, offsetX: 0, offsetY: 0, faceX: 190, faceY: 183, faceW: 161 },
    /* 7 */ { footX: 174, footY: 480, scale: 1.0174, offsetX: 0, offsetY: 0, faceX: 174, faceY: 181, faceW: 161 },
    ],
  },
}

/** 눈 시트: 3열 x 2행. 순서는 EMOTION_EYE_ORDER 를 따른다. */
export const EYES_SHEET = {
  src: '/assets/character/eyes.png',
  cols: 3,
  rows: 2,
  cellW: 360,
  cellH: 205,
}

/** 눈 시트 칸 순서. 3열 x 2행을 왼쪽 위부터 읽는다. */
export const EMOTION_EYE_ORDER: EmotionId[] = [
  'NORMAL',
  'HAPPY',
  'JOYFUL',
  'SAD',
  'ANGRY',
  'ANNOYED',
]

/**
 * 측면 전용 눈 에셋이 생기면 여기에 경로만 넣으면 된다.
 * 없는 동안에는 정면 눈의 한쪽만 잘라서 쓴다.
 */
export const SIDE_EYES_SHEET: typeof EYES_SHEET | null = null

/** 멈춰 있을 때 보여줄 프레임. 서 있는 그림이 따로 생기면 바꾼다. */
export const IDLE_FRAME: Record<WalkDirection, number> = {
  front: 0,
  side: 0,
  back: 0,
}
