import { useState } from 'react'
import { CharacterEquipment } from '@/components/game/CharacterEquipment'
import { CLOTHING_CATEGORIES, ITEMS } from '@/data/items'
import { portraitFor } from '@/data/expressions'
import { useGameStore } from '@/store/gameStore'
import type { ClothingCategory } from '@/types'
import { formatKoreanDate, toMonthKey } from '@/utils/date'
import { CharacterPreview3D } from './CharacterPreview3D'
import { ItemArtwork } from './ItemArtwork'
import { TryOnBar, outfitWith, takeOff, type TryOn } from './TryOnBar'

/**
 * Wardrobe: owned clothes are equipped with one tap. Clothes not owned yet can be tried on:
 * they only dress the 3D preview until the player gets them ("받고 입기") or takes them off.
 */
export function CharacterPanel() {
  const characters = useGameStore((s) => s.characters)
  const worldId = useGameStore((s) => s.worldId)
  const inventory = useGameStore((s) => s.inventory)
  const coins = useGameStore((s) => s.coins)
  const equipItem = useGameStore((s) => s.equipItem)
  const buyItem = useGameStore((s) => s.buyItem)
  const [selectedId, setSelectedId] = useState('')
  const [category, setCategory] = useState<ClothingCategory>('hat')
  // Try-ons belong to one character; picking another date starts fresh.
  const [tryOn, setTryOn] = useState<{ characterId: string; items: TryOn }>({ characterId: '', items: {} })
  const candidates = characters.filter((c) => toMonthKey(c.diaryDate) === worldId)
    .sort((a, b) => b.diaryDate.localeCompare(a.diaryDate))
  const character = candidates.find((c) => c.id === selectedId) ?? candidates[0]
  if (!character) return <p className="panel-hint">이 달에는 아직 캐릭터가 없어요. 오늘의 기록을 남기거나 이전 달을 선택해 주세요.</p>
  const trying: TryOn = tryOn.characterId === character.id ? tryOn.items : {}
  const setTrying = (next: TryOn) => setTryOn({ characterId: character.id, items: next })
  const without = (slot: ClothingCategory) => takeOff(trying, slot)
  const outfit = outfitWith(character.equippedItems, trying)
  const items = ITEMS.filter((item) => item.category === category)
  const owned = items.filter((item) => inventory.clothes.includes(item.id))
  const choose = (id: string | null) => {
    if (id && !inventory.clothes.includes(id)) {
      setTrying(trying[category] === id ? without(category) : { ...trying, [category]: id })
      return
    }
    setTrying(without(category))
    equipItem(character.id, category, id)
  }
  const getAndWear = (slot: ClothingCategory, id: string) => {
    buyItem(id)
    if (!useGameStore.getState().inventory.clothes.includes(id)) return
    equipItem(character.id, slot, id)
    setTrying(without(slot))
  }
  return <>
    <label className="character-picker">꾸밀 날짜
      <select value={character.id} onChange={(e) => setSelectedId(e.target.value)}>
        {candidates.map((c) => <option key={c.id} value={c.id}>{formatKoreanDate(c.diaryDate)}</option>)}
      </select>
    </label>
    <div className="wardrobe-preview">
      <CharacterPreview3D key={character.id} emotion={character.emotion} fallback={portraitFor(character.emotion)}
        label={`${formatKoreanDate(character.diaryDate)} 캐릭터`} outfit={outfit} />
      <div><span className="panel-hint">이 캐릭터의 장착 아이템</span>
        <CharacterEquipment equippedItems={character.equippedItems} />
        {!Object.values(character.equippedItems).some(Boolean) && <p className="panel-hint">아직 장착한 아이템이 없어요.</p>}
      </div>
    </div>
    <TryOnBar trying={trying} coins={coins} onGet={getAndWear} onTakeOff={(slot) => setTrying(without(slot))} />
    <div className="item-tabs item-tabs--clothes" aria-label="의상 분류">
      {(Object.entries(CLOTHING_CATEGORIES) as [ClothingCategory, string][]).map(([id, label]) =>
        <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>{label}</button>)}
    </div>
    <div className="item-grid">
      <button type="button" className="item-card" aria-pressed={!character.equippedItems[category] && !trying[category]}
        aria-label={`${CLOTHING_CATEGORIES[category]} 장착 해제`}
        onClick={() => choose(null)}>
        <span className="item-artwork">－</span><strong>장착 해제</strong>
      </button>
      {items.map((item) => {
        const has = inventory.clothes.includes(item.id)
        const worn = character.equippedItems[category] === item.id
        const tryingIt = trying[category] === item.id
        return <button key={item.id} type="button" className={`item-card${has ? '' : ' item-card--try'}`}
          data-item-id={item.id} aria-pressed={tryingIt || (worn && !trying[category])}
          onClick={() => choose(item.id)}>
          {!has && <span className="item-card__tag">미보유</span>}
          <ItemArtwork item={item} /><strong>{item.name}</strong>
          <span>{has ? (worn ? '장착 중' : '장착하기') : tryingIt ? '입어보는 중' : '입어보기'}</span>
        </button>
      })}
    </div>
    {!owned.length && <p className="panel-hint">보유한 {CLOTHING_CATEGORIES[category]} 아이템이 없어요. 눌러서 먼저 입어 볼 수 있어요.</p>}
  </>
}
