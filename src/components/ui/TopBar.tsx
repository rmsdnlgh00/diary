import { useEffect, useRef, useState } from 'react'
import { getWorld } from '@/data/worlds'
import { useGameStore } from '@/store/gameStore'
import { useSettingsStore } from '@/store/settingsStore'
import { toMonthKey } from '@/utils/date'
import { Icon } from './Icons'

const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`

/** 65만, 1.2만, 9,800 */
export function formatCoins(coins: number): string {
  if (coins >= 10_000) {
    const man = coins / 10_000
    return `${man >= 100 ? Math.floor(man) : Math.floor(man * 10) / 10}만`
  }
  return coins.toLocaleString('ko-KR')
}

export function CoinIcon() {
  return (
    <svg className="coin-icon" viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8.2" fill="#ffc768" stroke="#d9913a" strokeWidth="1.6" />
      <circle cx="10" cy="10" r="4.6" fill="none" stroke="#e8a64c" strokeWidth="1.4" />
    </svg>
  )
}

export function TopBar() {
  const worldId = useGameStore((state) => state.worldId)
  const coins = useGameStore((state) => state.coins)
  const characters = useGameStore((state) => state.characters)
  const today = useGameStore((state) => state.today)
  const setWorld = useGameStore((state) => state.setWorld)
  const shopOpen = useGameStore((state) => state.activePanel === 'SHOP')
  const togglePanel = useGameStore((state) => state.togglePanel)
  const settingsOpen = useSettingsStore((state) => state.open)
  const setSettingsOpen = useSettingsStore((state) => state.setOpen)
  const [open, setOpen] = useState(false)
  const world = getWorld(worldId)
  const [year, setYear] = useState(world.year)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) setYear(world.year) }, [open, world.year])
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  const thisMonth = toMonthKey(today)
  const people = (key: string) => characters.filter((c) => toMonthKey(c.diaryDate) === key).length
  const shift = (delta: number) => {
    const date = new Date(world.year, world.month - 1 + delta, 1)
    setWorld(monthKey(date.getFullYear(), date.getMonth() + 1))
  }
  const count = people(worldId)
  // The village only goes up to this month: no peeking into future months or years.
  const nextKey = (() => { const d = new Date(world.year, world.month, 1); return monthKey(d.getFullYear(), d.getMonth() + 1) })()
  const thisYear = Number(thisMonth.slice(0, 4))

  return (
    <div className="topbar">
      <div className="month-picker" ref={pickerRef}>
        <button type="button" className="top-hit" aria-expanded={open} aria-haspopup="dialog"
          onClick={() => setOpen((v) => !v)}>
          <span className="top-chip top-chip--month">
            {world.label}
          <svg className="top-chip__caret" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
        {open && (
          <div className="month-panel" role="dialog" aria-label="달 고르기">
            <div className="month-panel__head">
              <button type="button" className="month-arrow" onClick={() => shift(-1)} aria-label="이전 달">‹</button>
              <strong>{world.label}</strong>
              <button type="button" className="month-arrow" onClick={() => shift(1)} aria-label="다음 달" disabled={nextKey > thisMonth}>›</button>
            </div>
            <p className="month-panel__count">{count === 0 ? '아직 아무도 없어요' : `${count}명이 마을에 있어요`}</p>
            <div className="month-panel__year">
              <button type="button" onClick={() => setYear(year - 1)} aria-label="이전 해">‹</button>
              <span>{year}년</span>
              <button type="button" onClick={() => setYear(year + 1)} aria-label="다음 해" disabled={year >= thisYear}>›</button>
            </div>
            <div className="month-panel__grid">
              {Array.from({ length: 12 }, (_, i) => {
                const key = monthKey(year, i + 1)
                return (
                  <button key={key} type="button" aria-pressed={key === worldId} disabled={key > thisMonth}
                    className={`month-panel__month${key === thisMonth ? ' is-today' : ''}${people(key) ? ' has-people' : ''}`}
                    onClick={() => { setWorld(key); setOpen(false) }}>
                    {i + 1}월
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="top-right">
        <div className="top-right__row">
          <div className="top-chip top-chip--coin" aria-label={`코인 ${coins.toLocaleString('ko-KR')}개`}>
            <CoinIcon />
            {formatCoins(coins)}
          </div>
          <button type="button" className="settings-button" aria-label="설정" aria-haspopup="dialog"
            aria-expanded={settingsOpen} onClick={() => setSettingsOpen(true)}>
            <span className="top-chip top-chip--icon"><Icon name="settings" /></span>
          </button>
        </div>
        <button type="button" className="shop-button" aria-pressed={shopOpen} onClick={() => togglePanel('SHOP')}>
          <span className="top-chip top-chip--shop">
            <Icon name="shop" />
            상점
          </span>
        </button>
      </div>
    </div>
  )
}
