import { EMOTIONS } from '@/data/emotions'
import { getWorld } from '@/data/worlds'
import { useGameStore } from '@/store/gameStore'
import { toMonthKey } from '@/utils/date'

export function TopBar() {
  const worldId = useGameStore((state) => state.worldId)
  const coins = useGameStore((state) => state.coins)
  const characters = useGameStore((state) => state.characters)
  const todayDate = useGameStore((state) => state.today)
  const setWorld = useGameStore((state) => state.setWorld)

  const world = getWorld(worldId)
  const today = characters.find((character) => character.diaryDate === todayDate)
  const todayEmotion = today ? EMOTIONS[today.emotion] : null
  const count = characters.filter((character) => toMonthKey(character.diaryDate) === worldId).length
  const changeMonth = (delta: number) => {
    const date = new Date(world.year, world.month - 1 + delta, 1)
    setWorld(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="topbar">
      <div className="pill pill--month">
        <button type="button" className="month-arrow" onClick={() => changeMonth(-1)} aria-label="이전 달">‹</button>
        {world.label}
        <span className="pill__sub">
          {count === 0
            ? '아직 아무도 없어요'
            : `${count}명이 마을에 있어요`}
        </span>
        <button type="button" className="month-arrow" onClick={() => changeMonth(1)} aria-label="다음 달">›</button>
      </div>

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
