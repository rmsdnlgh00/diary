import { getItem } from '@/data/items'
import type { EquippedItems } from '@/types'
import { ItemArtwork } from '@/components/ui/ItemArtwork'

/**
 * 통짜 걷기 그림과 장착 표현을 분리하는 연결 지점.
 * 현재는 장착 배지를 표시한다. 방향/프레임별 투명 의상 에셋이 준비되면
 * 이 컴포넌트만 레이어 렌더러로 확장하고 장착/구매/저장 로직은 유지한다.
 */
export function CharacterEquipment({ equippedItems, compact = false }: {
  equippedItems: EquippedItems
  compact?: boolean
}) {
  const items = Object.values(equippedItems).flatMap((id) => {
    const item = id ? getItem(id) : undefined
    return item ? [item] : []
  })
  if (!items.length) return null
  return <span className={compact ? 'equipment-badge' : 'equipment-summary'}
    aria-label={`장착 아이템: ${items.map((item) => item.name).join(', ')}`}>
    {(compact ? items.slice(0, 2) : items).map((item) => <span key={item.id} title={item.name}>
      <ItemArtwork item={item} />
      {!compact && <span>{item.name}</span>}
    </span>)}
    {compact && items.length > 2 && <small>+{items.length - 2}</small>}
  </span>
}
