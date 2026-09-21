import type { EmotionDefinition, EmotionId } from '@/types'

/**
 * 게임 연출용 감정 표현이며, 실제 정신건강 상태를 진단하지 않는다.
 */
export const EMOTIONS: Record<EmotionId, EmotionDefinition> = {
  HAPPY: {
    id: 'HAPPY',
    label: '행복',
    description: '기분 좋게 웃는 하루',
    color: '#ffc861',
    asset: null,
  },
  JOYFUL: {
    id: 'JOYFUL',
    label: '즐거움',
    description: '신나고 들뜬 하루',
    color: '#ff9ec4',
    asset: null,
  },
  NORMAL: {
    id: 'NORMAL',
    label: '보통',
    description: '평범하게 흘러간 하루',
    color: '#b9c7d6',
    asset: null,
  },
  SAD: {
    id: 'SAD',
    label: '우울',
    description: '조금 가라앉은 하루',
    color: '#8fb8e8',
    asset: null,
  },
  ANGRY: {
    id: 'ANGRY',
    label: '화남',
    description: '속상하고 화가 난 하루',
    color: '#ff8a7a',
    asset: null,
  },
  ANNOYED: {
    id: 'ANNOYED',
    label: '짜증',
    description: '자꾸 거슬렸던 하루',
    color: '#c7a6e8',
    asset: null,
  },
}

export const EMOTION_IDS = Object.keys(EMOTIONS) as EmotionId[]

export const getEmotion = (id: EmotionId): EmotionDefinition => EMOTIONS[id]
