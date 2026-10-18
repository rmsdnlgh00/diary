import type { EmotionId } from '@/types'

export type ExpressionId = 'neutral' | 'happy' | 'sad' | 'angry'

export const EXPRESSIONS: Record<ExpressionId, string> = {
  neutral: '/assets/characters/male/expressions/neutral.webp',
  happy: '/assets/characters/male/expressions/happy.webp',
  sad: '/assets/characters/male/expressions/sad.webp',
  angry: '/assets/characters/male/expressions/angry.webp',
}

/**
 * 감정 6종을 표정 4종에 묶는다.
 * JOYFUL 과 ANNOYED 전용 그림이 생기면 여기만 풀면 된다.
 */
export const EMOTION_EXPRESSION: Record<EmotionId, ExpressionId> = {
  NORMAL: 'neutral',
  HAPPY: 'happy',
  JOYFUL: 'happy',
  SAD: 'sad',
  ANGRY: 'angry',
  ANNOYED: 'angry',
}

/**
 * 표정 이미지(정사각) 안에서 머리가 차지하는 영역. 이미지 크기 대비 비율.
 * 네 장을 실측한 평균이며 서로 0.5% 안쪽으로 일치한다.
 */
export const EXPRESSION_HEAD_BOX = { x: 0.075, y: 0.0939, w: 0.8353 }

export const expressionFor = (emotion: EmotionId): string =>
  EXPRESSIONS[EMOTION_EXPRESSION[emotion]]

/**
 * Portraits of the 3D village character, one per mood, for the UI (diary editor, journal,
 * diary detail). Rendered in Blender (scripts/render-portrait-base.py) and given their faces
 * by scripts/make-portraits.py. The legacy 2D village keeps using EXPRESSIONS above.
 */
export const portraitFor = (emotion: EmotionId): string =>
  `/assets/characters/male/portraits/${emotion.toLowerCase()}.webp`
