import type { DirectionSheet, EmotionId, WalkDirection } from '@/types'

/**
 * 걷기 시트의 프레임별 보정값.
 *
 * src/assets/character/walk 의 낱장 PNG 32장을 방향별 4x2 시트로 묶으면서
 * 각 칸의 알파 바운딩 박스를 실측해 만든 값이다.
 * 방향마다 원본 캔버스가 달라(정면·우측 1122x1402 / 후면·좌측 1024x1536)
 * 셀 크기도 다르지만, refHeight 로 각자 정규화하므로 화면에서는 같은 키로 보인다.
 *
 *  footX/footY : 셀 안에서 캐릭터가 땅을 딛는 지점 (px)
 *  scale       : 프레임 간 크기 편차 보정 (기준 높이 / 이 프레임 높이)
 *  offsetX/Y   : 눈으로 보고 미세 조정할 때 쓰는 값 (기본 0)
 *  faceX/faceY/faceW : 표정 에셋을 붙일 자리. 지금은 얼굴이 그림에 포함돼 있어 미사용.
 *
 * src 의 /assets/... 는 public/assets 를 가리킨다 (브라우저가 받는 파일).
 */

export const WALK_SHEETS: Record<WalkDirection, DirectionSheet> = {
  front: {
    src: '/assets/character/walk-front.webp',
    cols: 4,
    rows: 2,
    cellW: 410,
    cellH: 512,
    refHeight: 433,
    // 눈·입이 그림에 이미 그려져 있어 따로 얹지 않는다
    eyes: 'none',
    frames: [
    /* 0 */ { footX: 201, footY: 484, scale: 0.9644, offsetX: 0, offsetY: 0, faceX: 201, faceY: 189, faceW: 153 },
    /* 1 */ { footX: 203, footY: 468, scale: 1.0236, offsetX: 0, offsetY: 0, faceX: 203, faceY: 190, faceW: 148 },
    /* 2 */ { footX: 200, footY: 475, scale: 0.9886, offsetX: 0, offsetY: 0, faceX: 200, faceY: 187, faceW: 148 },
    /* 3 */ { footX: 200, footY: 473, scale: 1.0000, offsetX: 0, offsetY: 0, faceX: 200, faceY: 188, faceW: 148 },
    /* 4 */ { footX: 205, footY: 481, scale: 0.9863, offsetX: 0, offsetY: 0, faceX: 205, faceY: 192, faceW: 150 },
    /* 5 */ { footX: 202, footY: 471, scale: 1.0188, offsetX: 0, offsetY: 0, faceX: 202, faceY: 192, faceW: 147 },
    /* 6 */ { footX: 199, footY: 473, scale: 1.0000, offsetX: 0, offsetY: 0, faceX: 199, faceY: 188, faceW: 151 },
    /* 7 */ { footX: 199, footY: 464, scale: 1.0164, offsetX: 0, offsetY: 0, faceX: 199, faceY: 184, faceW: 148 },
    ],
  },
  back: {
    src: '/assets/character/walk-back.webp',
    cols: 4,
    rows: 2,
    cellW: 341,
    cellH: 512,
    refHeight: 411,
    // 눈·입이 그림에 이미 그려져 있어 따로 얹지 않는다
    eyes: 'none',
    frames: [
    /* 0 */ { footX: 171, footY: 460, scale: 1.0512, offsetX: 0, offsetY: 0, faceX: 171, faceY: 203, faceW: 128 },
    /* 1 */ { footX: 170, footY: 474, scale: 0.9558, offsetX: 0, offsetY: 0, faceX: 170, faceY: 191, faceW: 139 },
    /* 2 */ { footX: 172, footY: 459, scale: 1.0148, offsetX: 0, offsetY: 0, faceX: 172, faceY: 193, faceW: 131 },
    /* 3 */ { footX: 170, footY: 459, scale: 1.0148, offsetX: 0, offsetY: 0, faceX: 170, faceY: 193, faceW: 128 },
    /* 4 */ { footX: 169, footY: 475, scale: 0.9320, offsetX: 0, offsetY: 0, faceX: 169, faceY: 185, faceW: 142 },
    /* 5 */ { footX: 174, footY: 462, scale: 1.0275, offsetX: 0, offsetY: 0, faceX: 174, faceY: 199, faceW: 130 },
    /* 6 */ { footX: 173, footY: 459, scale: 0.9928, offsetX: 0, offsetY: 0, faceX: 173, faceY: 187, faceW: 133 },
    /* 7 */ { footX: 171, footY: 456, scale: 1.0199, offsetX: 0, offsetY: 0, faceX: 171, faceY: 191, faceW: 126 },
    ],
  },
  left: {
    src: '/assets/character/walk-left.webp',
    cols: 4,
    rows: 2,
    cellW: 341,
    cellH: 512,
    refHeight: 421,
    // 눈·입이 그림에 이미 그려져 있어 따로 얹지 않는다
    eyes: 'none',
    frames: [
    /* 0 */ { footX: 183, footY: 447, scale: 1.0631, offsetX: 0, offsetY: 0, faceX: 148, faceY: 195, faceW: 88 },
    /* 1 */ { footX: 174, footY: 474, scale: 0.9814, offsetX: 0, offsetY: 0, faceX: 136, faceY: 200, faceW: 96 },
    /* 2 */ { footX: 176, footY: 473, scale: 0.9859, offsetX: 0, offsetY: 0, faceX: 137, faceY: 201, faceW: 98 },
    /* 3 */ { footX: 178, footY: 472, scale: 0.9678, offsetX: 0, offsetY: 0, faceX: 139, faceY: 195, faceW: 97 },
    /* 4 */ { footX: 175, footY: 469, scale: 1.0024, offsetX: 0, offsetY: 0, faceX: 137, faceY: 201, faceW: 94 },
    /* 5 */ { footX: 174, footY: 471, scale: 0.9525, offsetX: 0, offsetY: 0, faceX: 136, faceY: 189, faceW: 95 },
    /* 6 */ { footX: 174, footY: 458, scale: 1.0631, offsetX: 0, offsetY: 0, faceX: 138, faceY: 206, faceW: 90 },
    /* 7 */ { footX: 175, footY: 466, scale: 0.9953, offsetX: 0, offsetY: 0, faceX: 137, faceY: 196, faceW: 95 },
    ],
  },
  right: {
    src: '/assets/character/walk-right.webp',
    cols: 4,
    rows: 2,
    cellW: 410,
    cellH: 512,
    refHeight: 422,
    // 눈·입이 그림에 이미 그려져 있어 따로 얹지 않는다
    eyes: 'none',
    frames: [
    /* 0 */ { footX: 208, footY: 464, scale: 0.9883, offsetX: 0, offsetY: 0, faceX: 248, faceY: 192, faceW: 101 },
    /* 1 */ { footX: 207, footY: 461, scale: 1.0000, offsetX: 0, offsetY: 0, faceX: 247, faceY: 192, faceW: 101 },
    /* 2 */ { footX: 206, footY: 463, scale: 1.0048, offsetX: 0, offsetY: 0, faceX: 246, faceY: 195, faceW: 100 },
    /* 3 */ { footX: 204, footY: 465, scale: 0.9929, offsetX: 0, offsetY: 0, faceX: 244, faceY: 194, faceW: 100 },
    /* 4 */ { footX: 205, footY: 461, scale: 1.0072, offsetX: 0, offsetY: 0, faceX: 245, faceY: 194, faceW: 99 },
    /* 5 */ { footX: 206, footY: 464, scale: 0.9883, offsetX: 0, offsetY: 0, faceX: 247, faceY: 192, faceW: 102 },
    /* 6 */ { footX: 213, footY: 464, scale: 1.0218, offsetX: 0, offsetY: 0, faceX: 254, faceY: 201, faceW: 102 },
    /* 7 */ { footX: 208, footY: 462, scale: 1.0048, offsetX: 0, offsetY: 0, faceX: 248, faceY: 194, faceW: 101 },
    ],
  },
}

/** 표정 오버레이용 시트. expressions/ 에셋이 준비되면 여기를 채운다. */
export const EYES_SHEET = {
  src: '/assets/character/eyes.webp',
  cols: 3,
  rows: 2,
  cellW: 360,
  cellH: 205,
}

export const EMOTION_EYE_ORDER: EmotionId[] = ['NORMAL','HAPPY','JOYFUL','SAD','ANGRY','ANNOYED']

export const SIDE_EYES_SHEET: typeof EYES_SHEET | null = null

/** 멈춰 있을 때 보여줄 프레임. idle 그림을 시트에 넣으면 그쪽으로 바꾼다. */
export const IDLE_FRAME: Record<WalkDirection, number> = { front: 0, back: 0, left: 0, right: 0 }
