import { getItem } from '@/data/items'
import { useGameStore } from '@/store/gameStore'
import type { DepthConfig } from '@/systems/depthSystem'
import type { PlacedDecoration } from '@/types'
import { ItemArtwork } from '@/components/ui/ItemArtwork'
import { WorldObject } from './WorldObject'

export function PlacedItem({ decoration, depthConfig }: {
  decoration: PlacedDecoration
  depthConfig: DepthConfig
}) {
  const editing = useGameStore((s) => s.activePanel === 'DECORATE')
  const selected = useGameStore((s) => s.selectedDecorationId === decoration.id)
  const select = useGameStore((s) => s.selectDecoration)
  const item = getItem(decoration.itemId)
  if (!item) return null
  return <WorldObject x={decoration.x} y={decoration.y} width={item.worldWidth ?? 0.04}
    depthConfig={depthConfig} anchorY={0.94} shadow
    className={`placed-item${selected && editing ? ' placed-item--selected' : ''}`}
    onClick={editing ? () => select(decoration.id) : undefined} label={`${item.name} 선택`}>
    <ItemArtwork item={item} />
  </WorldObject>
}
