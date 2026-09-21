import { getWorld } from '@/data/worlds'
import { EMOTIONS } from '@/data/emotions'
import { useGameStore } from '@/store/gameStore'

const TODAY = '2026-09-21'

export function TopBar() {
  const worldId = useGameStore((state) => state.worldId)
  const coins = useGameStore((state) => state.coins)
  const characters = useGameStore((state) => state.characters)

  const world = getWorld(worldId)
  const today = characters.find((character) => character.diaryDate === TODAY)
  const todayEmotion = today ? EMOTIONS[today.emotion] : null

  return (
    <div className="topbar">
      <div className="pill pill--month">{world.label}</div>

      <div className="pill pill--status">
        {todayEmotion ? (
          <>
            <span className="dot" style={{ background: todayEmotion.color }} />
            오늘의 기분 · {todayEmotion.label}
          </>
        ) : (
          '오늘 기록 없음'
        )}
      </div>

      <div className="pill pill--coin">
        <span className="coin">🪙</span>
        {coins}
      </div>
    </div>
  )
}
