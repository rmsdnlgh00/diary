import type { EmotionId } from '@/types'

/**
 * 캐릭터끼리 마주쳤을 때 띄우는 짧은 말.
 * 그날의 감정에 맞는 것 중에서 고른다.
 */
export const CHAT_LINES: Record<EmotionId, string[]> = {
  HAPPY: ['오늘 좋았어!', '기분 좋은 날이야', '너도 잘 지냈어?', '따뜻한 하루였어'],
  JOYFUL: ['진짜 재밌었어!', '완전 신났어!', '또 놀러 가자', '오늘 최고였어!'],
  NORMAL: ['그냥 그런 하루', '별일 없었어', '뭐 하고 있어?', '조용한 날이네'],
  SAD: ['좀 울적해...', '오늘은 힘들었어', '그냥 조금 외로워', '괜찮아질까'],
  ANGRY: ['아 진짜 속상해', '오늘 좀 그랬어', '말도 마...', '화가 났었어'],
  ANNOYED: ['피곤하다...', '좀 귀찮았어', '아 답답해', '오늘 왜 이러지'],
}

/** 같은 캐릭터는 늘 비슷한 말을 하도록 날짜로 고정해서 고른다. */
export function chatLineFor(emotion: EmotionId, seed: string): string {
  const lines = CHAT_LINES[emotion]
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return lines[hash % lines.length]
}
