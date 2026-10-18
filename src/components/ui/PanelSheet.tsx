import { createContext, useContext, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { DiaryEditor } from '@/components/diary/DiaryEditor'
import { useGameStore } from '@/store/gameStore'
import type { PanelId } from '@/types'
import { ShopPanel } from './ShopPanel'
import { CharacterPanel } from './CharacterPanel'
import { DecoratePanel } from './DecoratePanel'
import { JournalPanel } from './JournalPanel'

const TITLES: Record<Exclude<PanelId, 'DIARY'>, string> = {
  SHOP: '상점', CHARACTER: '옷장', DECORATE: '마을 꾸미기', JOURNAL: '지난 일기',
}

type SheetSize = 'compact' | 'expanded'
/** Lets panel content ask the phone sheet to grow (e.g. when the fitting room opens). */
const SheetContext = createContext<{ expand: () => void }>({ expand: () => {} })
export const useSheet = () => useContext(SheetContext)

/** How far (px) the handle must travel before a drag snaps to the other size. */
const SNAP = 36

export function PanelSheet() {
  const activePanel = useGameStore((state) => state.activePanel)
  const closePanel = useGameStore((state) => state.closePanel)
  const feedback = useGameStore((state) => state.feedback)
  const today = useGameStore((state) => state.today)
  const sheetRef = useRef<HTMLElement>(null)
  // Size is per panel: opening another panel starts compact again.
  const [sizing, setSizing] = useState<{ panel: PanelId | null; size: SheetSize }>({ panel: null, size: 'compact' })
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const drag = useRef<{ y: number; height: number; moved: boolean } | null>(null)

  if (!activePanel) return null
  if (activePanel === 'DIARY') return <DiaryEditor date={today} />
  const size = sizing.panel === activePanel ? sizing.size : 'compact'
  const setSize = (next: SheetSize) => setSizing({ panel: activePanel, size: next })

  // Phones in portrait: drag the handle up to enlarge the sheet, down to shrink it, or tap it.
  const down = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const height = sheetRef.current?.getBoundingClientRect().height ?? 0
    drag.current = { y: event.clientY, height, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    if (!d) return
    const dy = d.y - event.clientY
    if (Math.abs(dy) > 6) d.moved = true
    if (!d.moved) return
    const parent = sheetRef.current?.parentElement?.getBoundingClientRect().height ?? 800
    setDragHeight(Math.max(160, Math.min(parent - 150, d.height + dy)))
  }
  const up = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current
    drag.current = null
    setDragHeight(null)
    if (!d) return
    const dy = d.y - event.clientY
    if (!d.moved) setSize(size === 'expanded' ? 'compact' : 'expanded')
    else if (dy > SNAP) setSize('expanded')
    else if (dy < -SNAP) setSize('compact')
  }

  return (
    <SheetContext.Provider value={{ expand: () => setSize('expanded') }}>
      <section ref={sheetRef} className={`sheet commerce-sheet${activePanel === 'DECORATE' ? ' commerce-sheet--decorate' : ''}${
        activePanel === 'SHOP' ? ' commerce-sheet--shop' : ''}${activePanel === 'JOURNAL' ? ' commerce-sheet--journal' : ''}`} aria-label={TITLES[activePanel]}
        data-size={size} data-dragging={dragHeight !== null || undefined}
        style={dragHeight !== null ? { height: dragHeight } : undefined}>
        <button type="button" className="sheet-handle" aria-label={size === 'expanded' ? '패널 줄이기' : '패널 키우기'}
          aria-expanded={size === 'expanded'}
          // Keyboard "clicks" have detail 0; pointer taps are handled in `up`.
          onClick={(event) => { if (event.detail === 0) setSize(size === 'expanded' ? 'compact' : 'expanded') }}
          onPointerDown={down} onPointerMove={move} onPointerUp={up}
          onPointerCancel={() => { drag.current = null; setDragHeight(null) }}>
          <span aria-hidden="true" />
        </button>
        {activePanel === 'SHOP' && <div className="shop-awning" aria-hidden="true" />}
        <div className="sheet__header">
          <h2>{TITLES[activePanel]}</h2>
          <button type="button" className="icon-button" onClick={closePanel} aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="commerce-content" key={activePanel}>
          {activePanel === 'SHOP' && <ShopPanel />}
          {activePanel === 'CHARACTER' && <CharacterPanel />}
          {activePanel === 'DECORATE' && <DecoratePanel />}
          {activePanel === 'JOURNAL' && <JournalPanel />}
        </div>
        <p className="panel-feedback" role="status">{feedback}</p>
      </section>
    </SheetContext.Provider>
  )
}
