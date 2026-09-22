import type { DirectionSheet, EmotionId, WalkDirection } from '@/types'

/**
 * 걷기 시트의 프레임별 보정값.
 *
 * 이 파일은 `npm run pack-sprites` 가 만든다. 직접 고치면 다음 실행 때 덮어쓰인다.
 * 원본은 src/assets/character/walk/{방향}/NN.png 이다.
 *
 *  footX/footY : 셀 안에서 캐릭터가 땅을 딛는 지점 (px)
 *  scale       : 프레임 간 크기 편차 보정 (기준 높이 / 이 프레임 높이)
 *  offsetX/Y   : 눈으로 보고 미세 조정할 때 쓰는 값 (기본 0)
 *  faceX/faceY/faceW : 표정 에셋을 붙일 자리
 *  sequence    : 실제로 재생할 프레임 번호와 순서
 */

export const WALK_SHEETS: Record<WalkDirection, DirectionSheet> = {
  front: {
    src: '/assets/character/walk-front.webp',
    cols: 4,
    rows: 1,
    cellW: 384,
    cellH: 512,
    refHeight: 415,
    // 눈·입이 그림에 이미 그려져 있어 눈 레이어는 얹지 않는다
    eyes: 'none',
    sequence: [0, 1, 2, 3],
    frames: [
      /* 0 */ { footX: 189, footY: 464, scale: 1.0349, offsetX: 0, offsetY: 0, faceX: 189, faceY: 200, faceW: 137, headX: 75, headY: 64, headW: 228 },
      /* 1 */ { footX: 189, footY: 477, scale: 0.9905, offsetX: 0, offsetY: 0, faceX: 189, faceY: 201, faceW: 137, headX: 75, headY: 59, headW: 229 },
      /* 2 */ { footX: 192, footY: 473, scale: 1.0048, offsetX: 0, offsetY: 0, faceX: 192, faceY: 201, faceW: 141, headX: 75, headY: 61, headW: 235 },
      /* 3 */ { footX: 191, footY: 476, scale: 0.9742, offsetX: 0, offsetY: 0, faceX: 191, faceY: 196, faceW: 136, headX: 78, headY: 51, headW: 226 },
    ],
  },
  back: {
    src: '/assets/character/walk-back.webp',
    cols: 4,
    rows: 2,
    cellW: 341,
    cellH: 512,
    refHeight: 411,
    // 눈·입이 그림에 이미 그려져 있어 눈 레이어는 얹지 않는다
    eyes: 'none',
    sequence: [7, 2],
    frames: [
      /* 0 */ { footX: 171, footY: 460, scale: 1.0512, offsetX: 0, offsetY: 0, faceX: 171, faceY: 203, faceW: 128, headX: 64, headY: 70, headW: 214 },
      /* 1 */ { footX: 170, footY: 474, scale: 0.9558, offsetX: 0, offsetY: 0, faceX: 170, faceY: 191, faceW: 139, headX: 55, headY: 45, headW: 231 },
      /* 2 */ { footX: 172, footY: 459, scale: 1.0148, offsetX: 0, offsetY: 0, faceX: 172, faceY: 193, faceW: 131, headX: 63, headY: 55, headW: 219 },
      /* 3 */ { footX: 170, footY: 459, scale: 1.0148, offsetX: 0, offsetY: 0, faceX: 170, faceY: 193, faceW: 128, headX: 63, headY: 55, headW: 214 },
      /* 4 */ { footX: 169, footY: 475, scale: 0.9320, offsetX: 0, offsetY: 0, faceX: 169, faceY: 185, faceW: 142, headX: 51, headY: 35, headW: 237 },
      /* 5 */ { footX: 174, footY: 462, scale: 1.0275, offsetX: 0, offsetY: 0, faceX: 174, faceY: 199, faceW: 130, headX: 66, headY: 63, headW: 217 },
      /* 6 */ { footX: 173, footY: 459, scale: 0.9928, offsetX: 0, offsetY: 0, faceX: 173, faceY: 187, faceW: 133, headX: 62, headY: 46, headW: 222 },
      /* 7 */ { footX: 171, footY: 456, scale: 1.0199, offsetX: 0, offsetY: 0, faceX: 171, faceY: 191, faceW: 126, headX: 66, headY: 54, headW: 210 },
    ],
  },
  left: {
    src: '/assets/character/walk-left.webp',
    cols: 4,
    rows: 2,
    cellW: 341,
    cellH: 512,
    refHeight: 421,
    // 눈·입이 그림에 이미 그려져 있어 눈 레이어는 얹지 않는다
    eyes: 'none',
    sequence: [6, 0],
    frames: [
      /* 0 */ { footX: 183, footY: 447, scale: 1.0631, offsetX: 0, offsetY: 0, faceX: 148, faceY: 195, faceW: 88, headX: 73, headY: 52, headW: 220 },
      /* 1 */ { footX: 174, footY: 474, scale: 0.9814, offsetX: 0, offsetY: 0, faceX: 136, faceY: 200, faceW: 96, headX: 55, headY: 46, headW: 239 },
      /* 2 */ { footX: 176, footY: 473, scale: 0.9859, offsetX: 0, offsetY: 0, faceX: 137, faceY: 201, faceW: 98, headX: 54, headY: 47, headW: 245 },
      /* 3 */ { footX: 178, footY: 472, scale: 0.9678, offsetX: 0, offsetY: 0, faceX: 139, faceY: 195, faceW: 97, headX: 57, headY: 38, headW: 242 },
      /* 4 */ { footX: 175, footY: 469, scale: 1.0024, offsetX: 0, offsetY: 0, faceX: 137, faceY: 201, faceW: 94, headX: 57, headY: 50, headW: 236 },
      /* 5 */ { footX: 174, footY: 471, scale: 0.9525, offsetX: 0, offsetY: 0, faceX: 136, faceY: 189, faceW: 95, headX: 56, headY: 30, headW: 237 },
      /* 6 */ { footX: 174, footY: 458, scale: 1.0631, offsetX: 0, offsetY: 0, faceX: 138, faceY: 206, faceW: 90, headX: 62, headY: 63, headW: 225 },
      /* 7 */ { footX: 175, footY: 466, scale: 0.9953, offsetX: 0, offsetY: 0, faceX: 137, faceY: 196, faceW: 95, headX: 57, headY: 44, headW: 237 },
    ],
  },
  right: {
    src: '/assets/character/walk-right.webp',
    cols: 4,
    rows: 2,
    cellW: 410,
    cellH: 512,
    refHeight: 422,
    // 눈·입이 그림에 이미 그려져 있어 눈 레이어는 얹지 않는다
    eyes: 'none',
    sequence: [0, 5],
    frames: [
      /* 0 */ { footX: 208, footY: 464, scale: 0.9883, offsetX: 0, offsetY: 0, faceX: 248, faceY: 192, faceW: 101, headX: 82, headY: 38, headW: 253 },
      /* 1 */ { footX: 207, footY: 461, scale: 1.0000, offsetX: 0, offsetY: 0, faceX: 247, faceY: 192, faceW: 101, headX: 81, headY: 40, headW: 252 },
      /* 2 */ { footX: 206, footY: 463, scale: 1.0048, offsetX: 0, offsetY: 0, faceX: 246, faceY: 195, faceW: 100, headX: 81, headY: 44, headW: 251 },
      /* 3 */ { footX: 204, footY: 465, scale: 0.9929, offsetX: 0, offsetY: 0, faceX: 244, faceY: 194, faceW: 100, headX: 79, headY: 41, headW: 251 },
      /* 4 */ { footX: 205, footY: 461, scale: 1.0072, offsetX: 0, offsetY: 0, faceX: 245, faceY: 194, faceW: 99, headX: 82, headY: 43, headW: 247 },
      /* 5 */ { footX: 206, footY: 464, scale: 0.9883, offsetX: 0, offsetY: 0, faceX: 247, faceY: 192, faceW: 102, headX: 79, headY: 38, headW: 255 },
      /* 6 */ { footX: 213, footY: 464, scale: 1.0218, offsetX: 0, offsetY: 0, faceX: 254, faceY: 201, faceW: 102, headX: 86, headY: 52, headW: 254 },
      /* 7 */ { footX: 208, footY: 462, scale: 1.0048, offsetX: 0, offsetY: 0, faceX: 248, faceY: 194, faceW: 101, headX: 82, headY: 43, headW: 252 },
    ],
  },
}

/** 표정 오버레이용 시트. 지금은 data/expressions.ts 를 쓰므로 비어 있다. */
export const EYES_SHEET = {
  src: '/assets/character/eyes.webp',
  cols: 3,
  rows: 2,
  cellW: 360,
  cellH: 205,
}

export const EMOTION_EYE_ORDER: EmotionId[] = ['NORMAL', 'HAPPY', 'JOYFUL', 'SAD', 'ANGRY', 'ANNOYED']

export const SIDE_EYES_SHEET: typeof EYES_SHEET | null = null

/** 멈춰 있을 때 보여줄 프레임. 각 방향 sequence 의 첫 장을 쓴다. */
export const IDLE_FRAME: Record<WalkDirection, number> = {
  front: 0,
  back: 7,
  left: 6,
  right: 0,
}
