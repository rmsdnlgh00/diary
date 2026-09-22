import happySide from '@/assets/character/expressions/happy_side.png'
import sadSide from '@/assets/character/expressions/sad_side.png'
import angrySide from '@/assets/character/expressions/angry_side.png'
import { EMOTION_EXPRESSION } from './expressions'
import type { EmotionId, WalkDirection } from '@/types'

interface SideExpression {
  src: string
  width: number
  height: number
  /** 원본의 머리~목 영역 (px). 원본 파일을 자르지 않고 렌더링할 때만 사용한다. */
  head: { x: number; y: number; w: number; h: number }
  neckX: number
}

const SIDE_EXPRESSIONS: Record<'happy' | 'sad' | 'angry', SideExpression> = {
  happy: { src: happySide, width: 1024, height: 1536,
    head: { x: 126, y: 92, w: 776, h: 646 }, neckX: 534.5 },
  sad: { src: sadSide, width: 1024, height: 1536,
    head: { x: 106, y: 138, w: 818, h: 658 }, neckX: 519 },
  angry: { src: angrySide, width: 1024, height: 1536,
    head: { x: 83, y: 54, w: 865, h: 718 }, neckX: 534.5 },
}

/**
 * 기존 walk/{left,right}/01~08.png의 목 중심. 현재 512px 높이 셀 기준.
 * 프레임마다 원본의 위치가 달라 머리 중심 대신 목끼리 맞춘다.
 * 걷기 원본이나 pack-sprites의 셀 크기를 바꾸면 이 실측값도 갱신한다.
 */
export const SIDE_NECK_ANCHORS = {
  left: [
    { x: 177, y: 242 }, { x: 167, y: 249 }, { x: 170, y: 254 }, { x: 174, y: 244 },
    { x: 169, y: 254 }, { x: 169, y: 235 }, { x: 169, y: 254 }, { x: 167, y: 244 },
  ],
  right: [
    { x: 215, y: 246 }, { x: 212, y: 246 }, { x: 208, y: 251 }, { x: 211, y: 245 },
    { x: 210, y: 245 }, { x: 212, y: 245 }, { x: 213, y: 257 }, { x: 209, y: 248 },
  ],
}

export function sideExpressionFor(emotion: EmotionId, direction: WalkDirection): SideExpression | null {
  if (direction !== 'left' && direction !== 'right') return null
  const expression = EMOTION_EXPRESSION[emotion]
  // 기본 감정은 기존 좌우 걷기 그림에 포함된 표정을 그대로 사용한다.
  return expression === 'neutral' ? null : SIDE_EXPRESSIONS[expression]
}
