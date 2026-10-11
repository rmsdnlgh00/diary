import { useMemo, useState } from 'react'
import { getItem } from '@/data/items'
import { getWorld } from '@/data/worlds'
import { useVillagers } from '@/hooks/useVillagers'
import { useGameStore } from '@/store/gameStore'
import { toMonthKey } from '@/utils/date'
import { canPlaceInVillage, fromLegacyPoint, lawnSpots, toLegacyPoint, villageWorld } from '@/systems/villageLayout'
import { VillageStage, type StageDecorating, type StageDecoration, type VillageView } from './VillageStage'
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
  const editing = useGameStore((s) => s.activePanel === 'DECORATE')
  const placementTool = useGameStore((s) => s.placementTool)
  const selectedDecorationId = useGameStore((s) => s.selectedDecorationId)
  const selectDecoration = useGameStore((s) => s.selectDecoration)
  const moveDecoration = useGameStore((s) => s.moveDecoration)
  const placeAt = useGameStore((s) => s.placeAt)
  const [view, setView] = useState<VillageView>('whole')
  const [cameraResetKey, setCameraResetKey] = useState(0)
  const [preview, setPreview] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  // Existing save coordinates belong to the old background. Remap only the live view.
  const monthly = useMemo(() => characters.filter((c) => toMonthKey(c.diaryDate) === worldId)
    .map((c) => ({ ...c, ...fromLegacyPoint(c) })), [characters, worldId])
  const decorations = useMemo<StageDecoration[]>(() => (worldDecorations[worldId] ?? [])
    .map((d) => ({ id: d.id, itemId: d.itemId, ...fromLegacyPoint(d) })), [worldDecorations, worldId])
  // Placed decorations are blocked squares, so characters walk around them.
  const world = useMemo(() => villageWorld(getWorld(worldId), decorations), [worldId, decorations])
  const { agents, commandWalk } = useVillagers(world, monthly)

  const canPlace = (itemId: string, point: { x: number; y: number }, movingId?: string) =>
    canPlaceInVillage(itemId, point, decorations, agents, movingId)
  const placing = !placementTool ? null : placementTool.kind === 'place' ? { itemId: placementTool.itemId }
    : { itemId: decorations.find((d) => d.id === placementTool.placedId)?.itemId ?? '', movingId: placementTool.placedId }
  const decorating: StageDecorating | null = editing
    ? { selectedId: selectedDecorationId, placing, canPlace, onSelectDecoration: selectDecoration,
      onMoveDecoration: (id, point) => {
        const item = decorations.find((d) => d.id === id)
        if (item) moveDecoration(id, toLegacyPoint(point), () => canPlace(item.itemId, point, id))
      } } : null

  const onGround = (point: { x: number; y: number }) => {
    if (editing) {
      if (!placing || !getItem(placing.itemId)) return
      // Validate in 3D, then store the legacy coordinates the save format expects.
      const fits = canPlace(placing.itemId, point, placing.movingId)
      placeAt(toLegacyPoint(point), () => fits)
      return
    }
    if (preview) return
    const controlled = monthly.find((c) => c.id === focusId) ?? monthly.find((c) => c.diaryDate === today) ?? monthly[0]
    if (controlled) {
      setFocusId(controlled.id)
      commandWalk(controlled.id, point)
    }
  }
  const showPreview = preview && !editing
  return <div className="game-world game-world--village">
    <VillageStage characters={showPreview ? PREVIEW : agents} decorations={decorations} decorating={decorating}
      view={view} cameraResetKey={cameraResetKey} focusId={focusId} onGround={onGround} onSelect={(id) => {
        setFocusId(id)
        if (!showPreview) selectCharacter(id)
      }} />
    <div className="village-controls" aria-label="마을 시점">
      {([['whole', '마을 전체'], ['basic', '기본 시점'], ['follow', '따라가기']] as const).map(([id, label]) =>
        <button key={id} type="button" aria-pressed={view === id} onClick={() => { setView(id); setCameraResetKey((key) => key + 1) }}>{label}</button>)}
      {!editing && <>
        <button type="button" aria-pressed={preview} onClick={() => { setPreview(!preview); setFocusId(null) }}>30명 미리보기</button>
        <button type="button" onClick={onLegacy}>기존 마을</button>
      </>}
    </div>
    <p className="village-hint">{editing ? (placing ? '잔디 위를 눌러 놓아요 · 초록색이면 놓을 수 있어요'
      : '조형물을 꾹 누른 채 끌어서 이동 · 손을 떼면 놓아요')
      : showPreview ? '배치 확인용 30명 · 일기 데이터에는 저장되지 않아요'
      : monthly.length ? '짧게 누르면 일기·이동 · 드래그로 화면 이동 · 두 손가락으로 확대·축소'
      : '오늘 기록을 쓰면 캐릭터가 생겨요 · 드래그로 이동 · 두 손가락으로 확대·축소'}</p>
  </div>
}
