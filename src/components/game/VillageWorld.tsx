import { useMemo, useState } from 'react'
import { getWorld } from '@/data/worlds'
import { useVillagers } from '@/hooks/useVillagers'
import { useGameStore } from '@/store/gameStore'
import { toMonthKey } from '@/utils/date'
import { fromLegacyPoint, lawnSpots, villageWorld } from '@/systems/villageLayout'
import { VillageStage, type StageDecoration, type VillageView } from './VillageStage'
import type { StageCharacter } from './ThreeStage'

const PREVIEW: StageCharacter[] = lawnSpots(30).map(({ x, y }, i) => ({
  id: `preview-${i + 1}`, x, y, targetX: x, targetY: y, phase: 'IDLE', walkDistance: 0,
}))

export function VillageWorld({ onLegacy }: { onLegacy: () => void }) {
  const worldId = useGameStore((s) => s.worldId)
  const characters = useGameStore((s) => s.characters)
  const today = useGameStore((s) => s.today)
  const selectCharacter = useGameStore((s) => s.selectCharacter)
  const worldDecorations = useGameStore((s) => s.worldDecorations)
  const [view, setView] = useState<VillageView>('whole')
  const [preview, setPreview] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const world = useMemo(() => villageWorld(getWorld(worldId)), [worldId])
  // Existing save coordinates belong to the old background. Remap only the live view.
  const monthly = useMemo(() => characters.filter((c) => toMonthKey(c.diaryDate) === worldId)
    .map((c) => ({ ...c, ...fromLegacyPoint(c) })), [characters, worldId])
  const decorations = useMemo<StageDecoration[]>(() => (worldDecorations[worldId] ?? [])
    .map((d) => ({ id: d.id, itemId: d.itemId, ...fromLegacyPoint(d) })), [worldDecorations, worldId])
  const { agents, commandWalk } = useVillagers(world, monthly)
  const onGround = (point: { x: number; y: number }) => {
    if (preview) return
    const controlled = monthly.find((c) => c.id === focusId) ?? monthly.find((c) => c.diaryDate === today) ?? monthly[0]
    if (controlled) {
      setFocusId(controlled.id)
      commandWalk(controlled.id, point)
    }
  }
  return <div className="game-world game-world--village">
    <VillageStage characters={preview ? PREVIEW : agents} decorations={decorations} view={view} focusId={focusId}
      onGround={onGround} onSelect={(id) => {
        setFocusId(id)
        if (!preview) selectCharacter(id)
      }} />
    <div className="village-controls" aria-label="마을 시점">
      {([['whole', '마을 전체'], ['basic', '기본 시점'], ['follow', '따라가기']] as const).map(([id, label]) =>
        <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}
      <button type="button" aria-pressed={preview} onClick={() => { setPreview(!preview); setFocusId(null) }}>30명 미리보기</button>
      <button type="button" onClick={onLegacy}>기존 마을</button>
    </div>
    <p className="village-hint">{preview ? '배치 확인용 30명 · 일기 데이터에는 저장되지 않아요' :
      monthly.length ? '캐릭터를 누르면 일기 · 잔디를 누르면 이동해요' : '오늘 기록을 쓰면 마을에 캐릭터가 생겨요'}</p>
  </div>
}
