import { useEffect, useMemo, useState } from 'react'
import { EMOTIONS } from '@/data/emotions'
import { getItem } from '@/data/items'
import { getWorld } from '@/data/worlds'
import { useVillagers } from '@/hooks/useVillagers'
import { useGameStore } from '@/store/gameStore'
import { toMonthKey } from '@/utils/date'
import { canPlaceInVillage, fromLegacyPoint, lawnSpots, snapDecoration, toLegacyPoint, villageWorld } from '@/systems/villageLayout'
import { VillageStage, type StageDecorating, type StageDecoration } from './VillageStage'
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
  const selectedId = useGameStore((s) => s.selectedCharacterId)
  const worldDecorations = useGameStore((s) => s.worldDecorations)
  const editing = useGameStore((s) => s.activePanel === 'DECORATE')
  const placementTool = useGameStore((s) => s.placementTool)
  const selectedDecorationId = useGameStore((s) => s.selectedDecorationId)
  const selectDecoration = useGameStore((s) => s.selectDecoration)
  const moveDecoration = useGameStore((s) => s.moveDecoration)
  const placeAt = useGameStore((s) => s.placeAt)
  const arrivingId = useGameStore((s) => s.arrivingId)
  const finishArrival = useGameStore((s) => s.finishArrival)
  const preview = PREVIEW_ON
  const [focusId, setFocusId] = useState<string | null>(null)
  // Existing save coordinates belong to the old background. Remap only the live view.
  const monthly = useMemo(() => characters.filter((c) => toMonthKey(c.diaryDate) === worldId)
    .map((c) => ({ ...c, ...fromLegacyPoint(c) })), [characters, worldId])
  const decorations = useMemo<StageDecoration[]>(() => (worldDecorations[worldId] ?? [])
    .map((d) => ({ id: d.id, itemId: d.itemId, ...fromLegacyPoint(d) })), [worldDecorations, worldId])
  // Placed decorations are blocked squares, so characters walk around them.
  const world = useMemo(() => villageWorld(getWorld(worldId), decorations), [worldId, decorations])
  // While a character's diary is open it stops walking and faces the camera (see VillageStage).
  const reading = !editing && !!selectedId && monthly.some((c) => c.id === selectedId)
  // Today's character comes in by boat: it is only shown in this month's village.
  const arriving = monthly.find((c) => c.id === arrivingId) ?? null
  useEffect(() => { if (arrivingId && !arriving) finishArrival() }, [arrivingId, arriving, finishArrival])
  const holding = useMemo(() => [reading ? selectedId : null, arriving?.id ?? null]
    .filter((id): id is string => !!id), [reading, selectedId, arriving?.id])
  const { agents, commandWalk, place } = useVillagers(world, monthly, undefined, holding)
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
  // The whole village, until a character's diary is open: then the camera closes in on it and
  // follows it around; closing the diary goes back to the whole village.
  return <div className="game-world game-world--village">
    <VillageStage characters={showPreview ? PREVIEW : dressed} decorations={decorations} decorating={decorating}
      arriving={arriving && !editing ? { id: arriving.id, color: EMOTIONS[arriving.emotion].color } : null}
      /* Stepping onto the dock opens the diary (the camera follows the walk); the walk ends on the lawn. */
      onLanded={(id) => selectCharacter(id)}
      onArrived={(id, point) => { place(id, point); finishArrival() }}
      view={reading ? 'follow' : 'whole'} cameraResetKey={reading ? 1 : 0} focusId={reading ? selectedId : focusId} onGround={onGround} onSelect={(id) => {
        setFocusId(id)
        if (!showPreview) selectCharacter(id)
      }} />
    {editing && <p className="village-hint">{placing ? '잔디 위를 눌러 놓아요 · 초록색이면 놓을 수 있어요'
      : '조형물을 꾹 누른 채 끌어서 이동 · 손을 떼면 놓아요'}</p>}
  </div>
}
