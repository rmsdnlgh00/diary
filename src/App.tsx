import { DiaryDetail } from '@/components/diary/DiaryDetail'
import { GameWorld } from '@/components/game/GameWorld'
import { BottomBar } from '@/components/ui/BottomBar'
import { PanelSheet } from '@/components/ui/PanelSheet'
import { TopBar } from '@/components/ui/TopBar'

export default function App() {
  return (
    <div className="app">
      <div className="stage">
        <GameWorld />
        <TopBar />
        <PanelSheet />
        <BottomBar />
        <DiaryDetail />
      </div>
    </div>
  )
}
