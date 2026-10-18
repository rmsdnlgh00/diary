import { useState } from 'react'
import { ITEMS, ownsItem, priceOf } from '@/data/items'
import { portraitFor } from '@/data/expressions'
import { useGameStore } from '@/store/gameStore'
import type { ClothingCategory, GameItem } from '@/types'
import { formatKoreanDate, toMonthKey } from '@/utils/date'
import { CharacterPreview3D } from './CharacterPreview3D'
import { ItemArtwork } from './ItemArtwork'
import { useSheet } from './PanelSheet'
import { TryOnBar, outfitWith, takeOff, type TryOn } from './TryOnBar'

/** Every clothing slot has 3D clothes, so the fitting room can show them all. */
const WEARABLE = new Set<string>(['hat', 'top', 'bottom', 'shoes', 'bag', 'accessory'])

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
  const equipItem = useGameStore((s) => s.equipItem)
  const characters = useGameStore((s) => s.characters)
  const worldId = useGameStore((s) => s.worldId)
  const today = useGameStore((s) => s.today)
  const [trying, setTrying] = useState<TryOn>({})
  const sheet = useSheet()
  // The fitting room dresses today's character, or the latest one of the month shown.
  const model = characters.find((c) => c.diaryDate === today && toMonthKey(c.diaryDate) === worldId) ??
    characters.filter((c) => toMonthKey(c.diaryDate) === worldId).sort((a, b) => b.diaryDate.localeCompare(a.diaryDate))[0]
  const tryOn = (item: GameItem) => {
    const slot = item.category as ClothingCategory
    // On phones the fitting room needs room: grow the sheet when it opens.
    if (!Object.keys(trying).length) sheet.expand()
    setTrying(trying[slot] === item.id ? takeOff(trying, slot) : { ...trying, [slot]: item.id })
  }
  const getAndWear = (slot: ClothingCategory, id: string) => {
    buyItem(id)
    if (!useGameStore.getState().inventory.clothes.includes(id)) return
    if (model) equipItem(model.id, slot, id)
    setTrying(takeOff(trying, slot))
  }
  const items = ITEMS.filter((item) => (item.category === 'decoration') === (category === 'decorations') &&
    (category === 'decorations' || onShelf(item, shelf)))
  return <>
    <div className="shop-top">
      <div className="item-tabs shop-tabs" aria-label="상점 분류">
        <button type="button" data-icon="👕" aria-pressed={category === 'clothes'} onClick={() => setCategory('clothes')}>캐릭터 아이템</button>
        <button type="button" data-icon="🌷" aria-pressed={category === 'decorations'} onClick={() => setCategory('decorations')}>마을 꾸미기</button>
      </div>
      <span className="shop-coins" aria-label={`보유 코인 ${coins}`}><span aria-hidden="true">🪙</span>{coins}</span>
    </div>
    {category === 'clothes' && Object.keys(trying).length > 0 && <section className="fitting-room" aria-label="탈의실">
      <CharacterPreview3D emotion={model?.emotion} fallback={portraitFor(model?.emotion ?? 'HAPPY')}
        label={model ? `${formatKoreanDate(model.diaryDate)} 캐릭터가 입어보는 중` : '입어보는 중'}
        outfit={outfitWith(model?.equippedItems ?? {}, trying)} />
      <div className="fitting-room__side">
        <p className="fitting-room__title">
          <span>👀 탈의실</span>
          <button type="button" className="fitting-room__clear" onClick={() => setTrying({})}>다 벗기</button>
        </p>
        <small>{model ? `${formatKoreanDate(model.diaryDate)} 캐릭터` : '아직 이 달의 캐릭터가 없어요'}</small>
        <TryOnBar trying={trying} coins={coins} canWear={!!model} onGet={getAndWear}
          onTakeOff={(slot) => setTrying(takeOff(trying, slot))} />
      </div>
    </section>}
    {category === 'clothes'
      ? <div className="shop-shelves" aria-label="의상 종류">
        {SHELVES.map(([id, label]) => <button key={id} type="button" aria-pressed={shelf === id} onClick={() => setShelf(id)}>{label}</button>)}
      </div>
      : <p className="panel-hint shop-note">바닥 타일은 한 번 사면 여러 장 깔 수 있어요.</p>}
    <div className="item-grid shop-grid">
      {items.map((item) => {
        const owned = ownsItem(inventory, item)
        const price = priceOf(item)
        return <article className={`item-card shop-card shop-card--${item.category}`} key={item.id} data-item-id={item.id}
          data-owned={owned || undefined}>
          {owned && <span className="shop-card__ribbon">보유</span>}
          {WEARABLE.has(item.category)
            ? <span className="shop-card__stand shop-card__stand--try" role="button" tabIndex={0}
              aria-pressed={trying[item.category as ClothingCategory] === item.id} aria-label={`${item.name} 입어보기`}
              onClick={() => tryOn(item)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); tryOn(item) } }}>
              <ItemArtwork item={item} /><span className="shop-card__try">👀 입어보기</span>
            </span>
            : <span className="shop-card__stand"><ItemArtwork item={item} /></span>}
          <strong>{item.name}</strong>
          <span className="item-card__price" data-free={price === 0 || undefined}>
            {price === 0 ? '무료' : <><span aria-hidden="true">🪙</span>{price}</>}
          </span>
          <button type="button" className="item-action" disabled={owned} onClick={() => buyItem(item.id)}
            aria-label={`${item.name} ${owned ? '보유 중' : '구매'}`}>
            {owned ? '보유 중' : coins < price ? '코인이 부족해요' : price === 0 ? '받기' : '구매'}
          </button>
        </article>
      })}
    </div>
  </>
}
