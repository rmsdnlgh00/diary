import type { EmotionId } from '@/types'

export type ExpressionId = 'neutral' | 'happy' | 'sad' | 'angry'

export const EXPRESSIONS: Record<ExpressionId, string> = {
  neutral: '/assets/character/expressions/neutral.webp',
  happy: '/assets/character/expressions/happy.webp',
  sad: '/assets/character/expressions/sad.webp',
  angry: '/assets/character/expressions/angry.webp',
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

/**
 * front 걷기 시트의 프레임별 머리 박스 (셀 px, cellW 410 · cellH 512 기준).
 * 표정을 이 자리에 정확히 겹치게 올려서 원래 얼굴을 덮는다.
 *
 * 정면에서만 쓴다. 표정 그림이 정면 얼굴이라 옆·뒤에 올리면 얼굴이 반대로 붙는다.
 */
export const FRONT_HEAD_BOX: Array<{ x: number; y: number; w: number }> = [
  { x: 74, y: 36, w: 255 },
  { x: 80, y: 46, w: 246 },
  { x: 77, y: 38, w: 246 },
  { x: 77, y: 41, w: 246 },
  { x: 80, y: 43, w: 250 },
  { x: 80, y: 47, w: 245 },
  { x: 74, y: 41, w: 251 },
  { x: 76, y: 39, w: 246 },
]

export const expressionFor = (emotion: EmotionId): string =>
  EXPRESSIONS[EMOTION_EXPRESSION[emotion]]
