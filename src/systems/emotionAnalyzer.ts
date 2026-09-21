import type { EmotionId, EmotionResult } from '@/types'

/**
 * 일기 텍스트 → 감정.
 *
 * 나중에 AI API로 통째로 교체할 수 있도록 UI와 직접 연결하지 않고
 * 이 시그니처(analyzeDiary)만 유지한다.
 *
 *   const analyze: DiaryAnalyzer = createAiAnalyzer(apiKey)
 *
 * 현재는 규칙 기반 프로토타입이며 실제 심리 상태를 판단하지 않는다.
 */
export type DiaryAnalyzer = (text: string) => EmotionResult

const KEYWORDS: Record<Exclude<EmotionId, 'NORMAL'>, string[]> = {
  JOYFUL: ['신나', '재미있', '재밌', '놀았', '즐거', '설레', '최고', '웃겼', '파티', '여행'],
  HAPPY: ['행복', '좋았', '기뻐', '기쁘', '감사', '뿌듯', '사랑', '따뜻', '편안', '만족'],
  SAD: ['우울', '슬프', '슬펐', '눈물', '외로', '허전', '힘들', '지쳤', '울었', '그리워'],
  ANGRY: ['화가', '화났', '분노', '억울', '싸웠', '최악', '열받', '미치겠', '싫어'],
  ANNOYED: ['짜증', '귀찮', '거슬', '답답', '스트레스', '피곤', '불편', '지겹'],
}

const NORMAL_RESULT: EmotionResult = { emotion: 'NORMAL', confidence: 0.4 }

export const analyzeDiary: DiaryAnalyzer = (text) => {
  const normalized = text.trim()
  if (normalized.length === 0) return NORMAL_RESULT

  let best: EmotionId = 'NORMAL'
  let bestHits = 0

  for (const [emotion, keywords] of Object.entries(KEYWORDS)) {
    const hits = keywords.reduce((count, word) => (normalized.includes(word) ? count + 1 : count), 0)
    if (hits > bestHits) {
      bestHits = hits
      best = emotion as EmotionId
    }
  }

  if (bestHits === 0) return NORMAL_RESULT

  return { emotion: best, confidence: Math.min(0.95, 0.55 + bestHits * 0.15) }
}
