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

export const expressionFor = (emotion: EmotionId): string =>
  EXPRESSIONS[EMOTION_EXPRESSION[emotion]]
