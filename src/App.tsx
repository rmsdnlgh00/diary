import { DiaryDetail } from '@/components/diary/DiaryDetail'
import { GameWorld } from '@/components/game/GameWorld'
import { BottomBar } from '@/components/ui/BottomBar'
import { PanelSheet } from '@/components/ui/PanelSheet'
import { TopBar } from '@/components/ui/TopBar'
import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'

export default function App() {
  const syncCalendar = useGameStore((s) => s.syncCalendar)
  const storageError = useGameStore((s) => s.storageError)
  const closePanel = useGameStore((s) => s.closePanel)
  useEffect(() => {
    syncCalendar()
    const timer = window.setInterval(syncCalendar, 30_000)
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closePanel() }
    window.addEventListener('focus', syncCalendar)
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', syncCalendar)
      window.removeEventListener('keydown', onKey)
    }
  }, [syncCalendar, closePanel])
  return (
    <div className="app">
      <div className="stage">
        <GameWorld />
        <TopBar />
        <PanelSheet />
        <BottomBar />
        <DiaryDetail />
        {storageError && <p className="save-warning" role="alert">기기에 저장하지 못했어요. 저장 공간과 브라우저 설정을 확인해 주세요.</p>}
      </div>
      <div className="rotate-notice" role="status">
        <span aria-hidden="true">↻</span>
        <strong>휴대폰을 가로로 돌려 주세요</strong>
        <p>하루마을은 가로 화면에서 즐길 수 있어요.</p>
      </div>
    </div>
  )
}
