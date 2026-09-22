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

/** 실행 중 날짜 변경은 gameStore.syncCalendar에서 반영한다. */
export const TODAY = toDateKey(new Date())
