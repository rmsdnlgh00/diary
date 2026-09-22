import { DiaryEditor } from '@/components/diary/DiaryEditor'
import { useGameStore } from '@/store/gameStore'
import type { PanelId } from '@/types'
import { ShopPanel } from './ShopPanel'
import { CharacterPanel } from './CharacterPanel'
import { DecoratePanel } from './DecoratePanel'

const TITLES: Record<Exclude<PanelId, 'DIARY'>, string> = {
  SHOP: '상점', CHARACTER: '캐릭터 꾸미기', DECORATE: '공간 꾸미기',
}

export function PanelSheet() {
  const activePanel = useGameStore((state) => state.activePanel)
  const closePanel = useGameStore((state) => state.closePanel)
  const feedback = useGameStore((state) => state.feedback)
  const today = useGameStore((state) => state.today)

  if (!activePanel) return null
  if (activePanel === 'DIARY') return <DiaryEditor date={today} />

  return (
    <section className={`sheet commerce-sheet${activePanel === 'DECORATE' ? ' commerce-sheet--decorate' : ''}`}
      aria-label={TITLES[activePanel]}>
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
      </div>
      <p className="panel-feedback" role="status">{feedback}</p>
    </section>
  )
}
