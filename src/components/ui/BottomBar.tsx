import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import type { PanelId } from '@/types'
import { Icon, type IconName } from './Icons'

const MORE: Array<{ id: PanelId; label: string; icon: IconName }> = [
  { id: 'CHARACTER', label: '옷장', icon: 'wardrobe' },
  { id: 'DECORATE', label: '마을 꾸미기', icon: 'village' },
]

/** Above the menu while today's diary is still unwritten (and nothing else is open). */
function TodayPrompt() {
  const written = useGameStore((state) => state.characters.some((c) => c.diaryDate === state.today))
  const activePanel = useGameStore((state) => state.activePanel)
  const togglePanel = useGameStore((state) => state.togglePanel)
  if (written || activePanel) return null
  return (
    <button type="button" className="today-prompt" onClick={() => togglePanel('DIARY')}>
      <Icon name="pencil" />
      오늘 일기 쓰기
    </button>
  )
}

/** Bottom left: the arrow that unfolds the wardrobe and village decorating to its right. */
function MoreMenu() {
  const activePanel = useGameStore((state) => state.activePanel)
  const togglePanel = useGameStore((state) => state.togglePanel)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])
  return (
    <div className={`more-menu${open ? ' more-menu--open' : ''}`} ref={ref}>
      <button type="button" className="corner-button more-menu__toggle" aria-expanded={open}
        aria-label={open ? '메뉴 접기' : '옷장·마을 꾸미기 열기'} onClick={() => setOpen((v) => !v)}>
        <svg className="more-menu__arrow" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M4.5 3 7.5 6 4.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="more-menu__list">
          {MORE.map((item) => (
            <button key={item.id} type="button" className="more-menu__item" data-panel={item.id}
              aria-pressed={activePanel === item.id}
              onClick={() => { setOpen(false); if (activePanel !== item.id) togglePanel(item.id) }}>
              <Icon name={item.icon} className="more-menu__icon" />
              <span className="more-menu__label">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function BottomBar() {
  const activePanel = useGameStore((state) => state.activePanel)
  const togglePanel = useGameStore((state) => state.togglePanel)

  return (
    <>
      <TodayPrompt />
      <MoreMenu />
      <button type="button" className="corner-button journal-button" aria-pressed={activePanel === 'JOURNAL'}
        onClick={() => togglePanel('JOURNAL')}>
        <Icon name="journal" className="corner-button__icon" />
        <span className="corner-button__label">일기장</span>
      </button>
    </>
  )
}
