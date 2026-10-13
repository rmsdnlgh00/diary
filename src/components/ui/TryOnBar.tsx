import { getItem, priceOf } from '@/data/items'
import type { ClothingCategory } from '@/types'
import { ItemArtwork } from './ItemArtwork'

export type TryOn = Partial<Record<ClothingCategory, string>>

/** Copy of `trying` without the given slot. */
export function takeOff(trying: TryOn, slot: ClothingCategory): TryOn {
  const next = { ...trying }
  delete next[slot]
  return next
}

/** The equipped outfit with the tried-on pieces in their slots. */
export function outfitWith(equipped: Partial<Record<ClothingCategory, string | null>>, trying: TryOn): string[] {
  const slots = new Set([...Object.keys(equipped), ...Object.keys(trying)]) as Set<ClothingCategory>
  return [...slots].map((slot) => trying[slot] ?? equipped[slot]).filter((id): id is string => !!id)
}

/**
 * Clothes being tried on (not owned yet): get one and wear it at once, or take it off.
 * `canWear` is false when there is no character to dress; then the button only gets it.
 */
export function TryOnBar({ trying, coins, canWear = true, onGet, onTakeOff }: {
  trying: TryOn
  coins: number
  canWear?: boolean
  onGet: (slot: ClothingCategory, itemId: string) => void
  onTakeOff: (slot: ClothingCategory) => void
}) {
  const rows = (Object.entries(trying) as [ClothingCategory, string][]).flatMap(([slot, id]) => {
    const item = getItem(id)
    return item ? [{ slot, item }] : []
  })
  if (!rows.length) return null
  return <div className="try-on" aria-label="입어보는 중">
    {rows.map(({ slot, item }) => {
      const price = priceOf(item)
      const verb = canWear ? '입기' : ''
      return <div className="try-on__row" key={slot}>
        <ItemArtwork item={item} />
        <span><small>입어보는 중</small>{item.name}</span>
        <button type="button" className="item-action try-on__get" disabled={coins < price}
          onClick={() => onGet(slot, item.id)}>
          {coins < price ? '코인이 부족해요' : price === 0 ? `받고 ${verb}`.trim() : `🪙 ${price} 사고 ${verb}`.trim()}
        </button>
        <button type="button" className="item-action" onClick={() => onTakeOff(slot)}>벗기</button>
      </div>
    })}
  </div>
}
