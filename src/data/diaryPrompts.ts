/** Gentle questions that help start the day's entry. One per day, the player can ask for another. */
export const DIARY_PROMPTS = [
  '오늘 가장 기억에 남는 순간은 언제였나요?',
  '오늘 나를 웃게 만든 건 무엇이었나요?',
  '오늘 고마웠던 사람이나 일이 있었나요?',
  '오늘 먹은 것 중에 제일 맛있었던 건?',
  '오늘 조금 힘들었던 일이 있었다면 적어 볼까요?',
  '오늘의 나에게 한마디 해 준다면?',
  '오늘 새로 알게 된 것이 있나요?',
  '오늘 하늘이나 날씨는 어땠나요?',
  '오늘 가장 오래 머문 곳은 어디였나요?',
  '내일의 나에게 바라는 것이 있나요?',
  '오늘 들었던 노래나 본 것 중에 좋았던 건?',
  '오늘 하루를 세 단어로 표현한다면?',
]

/** The day's question: the same date always starts with the same one. */
export function promptIndexFor(date: string): number {
  let hash = 0
  for (const char of date) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash % DIARY_PROMPTS.length
}
