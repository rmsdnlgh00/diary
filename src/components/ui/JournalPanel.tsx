import { useState } from 'react'
import { EMOTIONS, EMOTION_IDS } from '@/data/emotions'
import { portraitFor } from '@/data/expressions'
import { useGameStore } from '@/store/gameStore'
import type { DiaryEntry } from '@/types'
import { formatKoreanDate, koreanWeekday, toDateKey, toMonthKey } from '@/utils/date'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function shiftMonth(month: string, by: number): string {
  const [year, m] = month.split('-').map(Number)
  return toMonthKey(toDateKey(new Date(year, m - 1 + by, 1)))
}

/** Written on the day itself, not filled in afterwards. */
const writtenOnTheDay = (entry: DiaryEntry) => toDateKey(new Date(entry.createdAt)) === entry.date

/**
 * Days in a row written on the day itself, ending today (or yesterday while today is still
 * unwritten). Days filled in later don't count.
 */
function streakOf(diaries: readonly DiaryEntry[], today: string): number {
  const onTheDay = new Set(diaries.filter(writtenOnTheDay).map((d) => d.date))
  const [year, month, day] = today.split('-').map(Number)
  const cursor = new Date(year, month - 1, day)
  if (!onTheDay.has(today)) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (onTheDay.has(toDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

/**
 * Past diaries: a month calendar coloured by each day's mood, the month's moods at a glance,
 * and the chosen day's entry with a way to meet that day's character in the village.
 */
export function JournalPanel() {
  const diaries = useGameStore((s) => s.diaries)
  const today = useGameStore((s) => s.today)
  const worldId = useGameStore((s) => s.worldId)
  const openDiary = useGameStore((s) => s.openDiary)
  const closePanel = useGameStore((s) => s.closePanel)
  const setWorld = useGameStore((s) => s.setWorld)
  const selectCharacter = useGameStore((s) => s.selectCharacter)
  const thisMonth = toMonthKey(today)
  const [month, setMonth] = useState(worldId <= thisMonth ? worldId : thisMonth)
  const byDate = new Map(diaries.map((d) => [d.date, d]))
  const inMonth = diaries.filter((d) => toMonthKey(d.date) === month).sort((a, b) => a.date.localeCompare(b.date))
  const [chosen, setChosen] = useState<string | null>(null)
  const selected = chosen && toMonthKey(chosen) === month ? chosen
    : month === thisMonth ? today : inMonth.at(-1)?.date ?? `${month}-01`
  const entry = byDate.get(selected)

  const [year, m] = month.split('-').map(Number)
  const firstWeekday = new Date(year, m - 1, 1).getDay()
  const days = new Date(year, m, 0).getDate()
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: days }, (_, i) =>
    `${month}-${String(i + 1).padStart(2, '0')}`)]
  const counts = EMOTION_IDS.map((id) => ({ id, count: inMonth.filter((d) => d.emotion === id).length }))
    .filter((c) => c.count > 0)
  const streak = streakOf(diaries, today)

  const meet = (diary: DiaryEntry) => {
    const month = toMonthKey(diary.date)
    if (useGameStore.getState().worldId !== month) setWorld(month)
    closePanel()
    selectCharacter(diary.characterId)
  }

  return <>
    <div className="journal-month">
      <button type="button" aria-label="이전 달 일기" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
      <strong>{year}년 {m}월</strong>
      <button type="button" aria-label="다음 달 일기" disabled={month >= thisMonth}
        onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
    </div>

    <div className="journal-summary">
      <span><b>{inMonth.length}</b>일 기록</span>
      <span>🔥 <b>{streak}</b>일 연속</span>
      <div className="journal-moods" role="img" aria-label={counts.map((c) => `${EMOTIONS[c.id].label} ${c.count}일`).join(', ') || '기록 없음'}>
        {counts.map((c) => <span key={c.id} style={{ flex: c.count, background: EMOTIONS[c.id].color }} title={`${EMOTIONS[c.id].label} ${c.count}일`} />)}
      </div>
    </div>

    <div className="journal-calendar" role="grid" aria-label={`${year}년 ${m}월 일기`}>
      {WEEKDAYS.map((w) => <span key={w} className="journal-calendar__weekday" role="columnheader">{w}</span>)}
      {cells.map((date, i) => {
        if (!date) return <span key={`blank-${i}`} />
        const diary = byDate.get(date)
        return <button key={date} type="button" role="gridcell" className="journal-day" data-date={date}
          aria-selected={date === selected} data-today={date === today || undefined} data-future={date > today || undefined}
          style={diary ? { ['--mood' as string]: EMOTIONS[diary.emotion].color } : undefined}
          aria-label={`${formatKoreanDate(date)}${diary ? ` · ${EMOTIONS[diary.emotion].label}` : ''}`}
          disabled={date > today} onClick={() => setChosen(date)}>
          {Number(date.slice(8))}
          {diary && <span className="journal-day__dot" aria-hidden="true" />}
        </button>
      })}
    </div>

    <article className="journal-entry">
      <header>
        <strong>{formatKoreanDate(selected)} <small>{koreanWeekday(selected)}</small></strong>
        {entry && <span className="journal-entry__mood" style={{ ['--mood' as string]: EMOTIONS[entry.emotion].color }}>
          <span className="journal-entry__face" aria-hidden="true" style={{ backgroundImage: `url(${portraitFor(entry.emotion)})` }} />{EMOTIONS[entry.emotion].label}
        </span>}
      </header>
      {entry
        ? <>
          <p className="journal-entry__text">{entry.text}</p>
          <div className="journal-entry__actions">
            <button type="button" className="item-action" onClick={() => openDiary(entry.date)}>고쳐 쓰기</button>
            <button type="button" className="item-action journal-entry__meet" onClick={() => meet(entry)}>마을에서 만나기</button>
          </div>
        </>
        : <>
          {selected < today && <p className="panel-hint">이 날은 기록이 없어요. 지금이라도 남겨 볼까요?</p>}
          <button type="button" className="primary-button journal-entry__write" onClick={() => openDiary(selected)}>
            {selected === today ? '오늘 일기 쓰기' : '이 날 일기 쓰기'}
          </button>
        </>}
    </article>
  </>
}
