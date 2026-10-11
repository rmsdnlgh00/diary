import { useState } from 'react'
import { ITEMS, ownsItem } from '@/data/items'
import { useGameStore } from '@/store/gameStore'
import type { GameItem } from '@/types'
import { ItemArtwork } from './ItemArtwork'

type Shelf = 'all' | 'hat' | 'top' | 'bottom' | 'extra'
const SHELVES: [Shelf, string][] = [['all', '전체'], ['hat', '모자'], ['top', '상의'], ['bottom', '하의'], ['extra', '소품']]
const onShelf = (item: GameItem, shelf: Shelf) =>
  shelf === 'all' || item.category === shelf ||
  (shelf === 'extra' && !['hat', 'top', 'bottom', 'decoration'].includes(item.category))

/** The village shop stall: clothes and decorations on round display stands with price tags. */
export function ShopPanel() {
  const [category, setCategory] = useState<'clothes' | 'decorations'>('clothes')
  const [shelf, setShelf] = useState<Shelf>('all')
  const inventory = useGameStore((s) => s.inventory)
  const coins = useGameStore((s) => s.coins)
  const buyItem = useGameStore((s) => s.buyItem)
  const items = ITEMS.filter((item) => (item.category === 'decoration') === (category === 'decorations') &&
    (category === 'decorations' || onShelf(item, shelf)))
  return <>
    <div className="shop-top">
      <div className="item-tabs shop-tabs" aria-label="상점 분류">
        <button type="button" data-icon="👕" aria-pressed={category === 'clothes'} onClick={() => setCategory('clothes')}>캐릭터 아이템</button>
        <button type="button" data-icon="🌷" aria-pressed={category === 'decorations'} onClick={() => setCategory('decorations')}>공간 꾸미기</button>
      </div>
      <span className="shop-coins" aria-label={`보유 코인 ${coins}`}><span aria-hidden="true">🪙</span>{coins}</span>
    </div>
    {category === 'clothes'
      ? <div className="shop-shelves" aria-label="의상 종류">
        {SHELVES.map(([id, label]) => <button key={id} type="button" aria-pressed={shelf === id} onClick={() => setShelf(id)}>{label}</button>)}
      </div>
      : <p className="panel-hint shop-note">바닥 타일은 한 번 사면 여러 장 깔 수 있어요.</p>}
    <div className="item-grid shop-grid">
      {items.map((item) => {
        const owned = ownsItem(inventory, item)
        return <article className={`item-card shop-card shop-card--${item.category}`} key={item.id} data-item-id={item.id}
          data-owned={owned || undefined}>
          {owned && <span className="shop-card__ribbon">보유</span>}
          <span className="shop-card__stand"><ItemArtwork item={item} /></span>
          <strong>{item.name}</strong>
          <span className="item-card__price"><span aria-hidden="true">🪙</span>{item.price}</span>
          <button type="button" className="item-action" disabled={owned} onClick={() => buyItem(item.id)}
            aria-label={`${item.name} ${owned ? '보유 중' : '구매'}`}>
            {owned ? '보유 중' : coins < item.price ? '코인이 부족해요' : '구매'}
          </button>
        </article>
      })}
    </div>
  </>
}
