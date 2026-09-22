import { useState } from 'react'
import { ITEMS, ownsItem } from '@/data/items'
import { useGameStore } from '@/store/gameStore'
import { ItemArtwork } from './ItemArtwork'

export function ShopPanel() {
  const [category, setCategory] = useState<'clothes' | 'decorations'>('clothes')
  const inventory = useGameStore((s) => s.inventory)
  const coins = useGameStore((s) => s.coins)
  const buyItem = useGameStore((s) => s.buyItem)
  const items = ITEMS.filter((item) => (item.category === 'decoration') === (category === 'decorations'))
  return <>
    <div className="item-tabs" aria-label="상점 분류">
      <button type="button" aria-pressed={category === 'clothes'} onClick={() => setCategory('clothes')}>캐릭터 아이템</button>
      <button type="button" aria-pressed={category === 'decorations'} onClick={() => setCategory('decorations')}>공간 꾸미기</button>
    </div>
    <p className="panel-hint">보유 코인 🪙 {coins} · 아이템은 한 번만 구매해요.</p>
    <div className="item-grid">
      {items.map((item) => {
        const owned = ownsItem(inventory, item)
        return <article className="item-card" key={item.id} data-item-id={item.id}>
          <ItemArtwork item={item} />
          <strong>{item.name}</strong>
          <span className="item-card__price">🪙 {item.price}</span>
          <button type="button" className="item-action" disabled={owned} onClick={() => buyItem(item.id)}
            aria-label={`${item.name} ${owned ? '보유 중' : '구매'}`}>
            {owned ? '보유 중' : coins < item.price ? '코인이 부족해요' : '구매'}
          </button>
        </article>
      })}
    </div>
  </>
}
