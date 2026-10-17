import { useMemo, useState } from 'react'
import { EMOTIONS } from '@/data/emotions'
import { formatKoreanDate } from '@/utils/date'
import { getItem } from '@/data/items'
import { getWorld } from '@/data/worlds'
import { useVillagers } from '@/hooks/useVillagers'
import { useGameStore } from '@/store/gameStore'
import { toMonthKey } from '@/utils/date'
import { canPlaceInVillage, fromLegacyPoint, lawnSpots, snapDecoration, toLegacyPoint, villageWorld } from '@/systems/villageLayout'
import { VillageStage, type StageDecorating, type StageDecoration, type VillageView } from './VillageStage'
import type { StageCharacter } from './ThreeStage'

const PREVIEW: StageCharacter[] = lawnSpots(30).map(({ x, y }, i) => ({
  id: `preview-${i + 1}`, x, y, targetX: x, targetY: y, phase: 'IDLE', walkDistance: 0,
}))

/** Layout check only (`?preview=30`): thirty still characters spread over the lawn. */
const PREVIEW_ON = new URLSearchParams(window.location.search).get('preview') === '30'

export function VillageWorld() {
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
  const preview = PREVIEW_ON
  const [focusId, setFocusId] = useState<string | null>(null)
  // Existing save coordinates belong to the old background. Remap only the live view.
  const monthly = useMemo(() => characters.filter((c) => toMonthKey(c.diaryDate) === worldId)
    .map((c) => ({ ...c, ...fromLegacyPoint(c) })), [characters, worldId])
  const decorations = useMemo<StageDecoration[]>(() => (worldDecorations[worldId] ?? [])
    .map((d) => ({ id: d.id, itemId: d.itemId, ...fromLegacyPoint(d) })), [worldDecorations, worldId])
  // Placed decorations are blocked squares, so characters walk around them.
  const world = useMemo(() => villageWorld(getWorld(worldId), decorations), [worldId, decorations])
  const { agents, commandWalk } = useVillagers(world, monthly)
  // What each character wears, for the 3D clothes.
  const outfits = useMemo(() => new Map(monthly.map((c) => [c.id,
    Object.values(c.equippedItems).filter((id): id is string => !!id)])), [monthly])
  const dressed = useMemo(() => agents.map((a) => ({ ...a, outfit: outfits.get(a.id), emotion: a.emotion,
    model: monthly.find((c) => c.id === a.id)?.model })), [agents, outfits, monthly])

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

  const onGround = (clicked: { x: number; y: number }) => {
    if (editing) {
      if (!placing || !getItem(placing.itemId)) return
      const point = snapDecoration(placing.itemId, clicked)
      // Validate in 3D, then store the legacy coordinates the save format expects.
      const fits = canPlace(placing.itemId, point, placing.movingId)
      placeAt(toLegacyPoint(point), () => fits)
      return
    }
    if (preview) return
    const controlled = monthly.find((c) => c.id === focusId) ?? monthly.find((c) => c.diaryDate === today) ?? monthly[0]
    if (controlled) {
      setFocusId(controlled.id)
      commandWalk(controlled.id, clicked)
    }
  }
  const showPreview = preview && !editing
  // Days of this month with a character, oldest first, for the follow view's day picker.
  const days = useMemo(() => [...monthly].sort((a, b) => a.diaryDate.localeCompare(b.diaryDate)), [monthly])
  const followed = monthly.find((c) => c.id === focusId)?.id ?? (monthly.find((c) => c.diaryDate === today) ?? days.at(-1))?.id
  return <div className="game-world game-world--village">
    <VillageStage characters={showPreview ? PREVIEW : dressed} decorations={decorations} decorating={decorating}
      view={view} cameraResetKey={cameraResetKey} focusId={followed ?? null} onGround={onGround} onSelect={(id) => {
        setFocusId(id)
        if (!showPreview) selectCharacter(id)
      }} />
    <div className="village-controls" aria-label="마을 시점">
      {([['whole', '마을 전체'], ['basic', '기본 시점'], ['follow', '따라가기']] as const).map(([id, label]) =>
        <button key={id} type="button" aria-pressed={view === id} onClick={() => {
          setView(id)
          // Following starts with today's character (or the latest day) unless one is chosen.
          if (id === 'follow') setFocusId(followed ?? null)
          setCameraResetKey((key) => key + 1)
        }}>{label}</button>)}
    </div>
    {view === 'follow' && !editing && !showPreview && days.length > 0 && (
      <div className="village-days" role="listbox" aria-label="따라갈 날짜">
        {days.map((c) => (
          <button key={c.id} type="button" role="option" aria-selected={c.id === followed}
            style={{ ['--mood' as string]: EMOTIONS[c.emotion].color }}
            aria-label={`${formatKoreanDate(c.diaryDate)} · ${EMOTIONS[c.emotion].label}`}
            onClick={() => { setFocusId(c.id); setCameraResetKey((key) => key + 1) }}>
            <span className="village-days__dot" aria-hidden="true" />
            {Number(c.diaryDate.slice(8))}일
          </button>
        ))}
      </div>
    )}
    <p className="village-hint">{editing ? (placing ? '잔디 위를 눌러 놓아요 · 초록색이면 놓을 수 있어요'
      : '조형물을 꾹 누른 채 끌어서 이동 · 손을 떼면 놓아요')
      : showPreview ? '배치 확인용 30명 · 일기 데이터에는 저장되지 않아요'
      : monthly.length ? '짧게 누르면 일기·이동 · 드래그로 화면 이동 · 두 손가락으로 확대·축소'
      : '오늘 기록을 쓰면 캐릭터가 생겨요 · 드래그로 이동 · 두 손가락으로 확대·축소'}</p>
  </div>
}
