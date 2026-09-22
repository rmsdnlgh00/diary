/**
 * 게임 속 오늘. 9월 월드만 만들어 둔 상태라 실제 날짜 대신 고정값을 쓴다.
 * 월드가 여러 개가 되면 toDateKey(new Date()) 로 바꾼다.
 */
export const TODAY = '2026-09-21'

/** YYYY-MM-DD → "9월 21일" */
export function formatKoreanDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${Number(month)}월 ${Number(day)}일`
}

/** Date → YYYY-MM-DD (로컬 기준) */
export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** YYYY-MM-DD → YYYY-MM */
export const toMonthKey = (date: string): string => date.slice(0, 7)
