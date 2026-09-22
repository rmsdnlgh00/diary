import { useState } from 'react'
import { CharacterEquipment } from '@/components/game/CharacterEquipment'
import { CLOTHING_CATEGORIES, ITEMS } from '@/data/items'
import { expressionFor } from '@/data/expressions'
import { useGameStore } from '@/store/gameStore'
import type { ClothingCategory } from '@/types'
import { formatKoreanDate, toMonthKey } from '@/utils/date'
import { ItemArtwork } from './ItemArtwork'

export function CharacterPanel() {
  const characters = useGameStore((s) => s.characters)
  const worldId = useGameStore((s) => s.worldId)
  const inventory = useGameStore((s) => s.inventory)
  const equipItem = useGameStore((s) => s.equipItem)
  const [selectedId, setSelectedId] = useState('')
  const [category, setCategory] = useState<ClothingCategory>('hat')
  const candidates = characters.filter((c) => toMonthKey(c.diaryDate) === worldId)
    .sort((a, b) => b.diaryDate.localeCompare(a.diaryDate))
  const character = candidates.find((c) => c.id === selectedId) ?? candidates[0]
  if (!character) return <p className="panel-hint">이 달에는 아직 캐릭터가 없어요. 오늘의 기록을 남기거나 이전 달을 선택해 주세요.</p>
  const items = ITEMS.filter((item) => item.category === category && inventory.clothes.includes(item.id))
  return <>
    <label className="character-picker">꾸밀 날짜
      <select value={character.id} onChange={(e) => setSelectedId(e.target.value)}>
        {candidates.map((c) => <option key={c.id} value={c.id}>{formatKoreanDate(c.diaryDate)}</option>)}
      </select>
    </label>
    <div className="wardrobe-preview">
      <img src={expressionFor(character.emotion)} alt={`${formatKoreanDate(character.diaryDate)} 캐릭터`} />
      <div><span className="panel-hint">이 캐릭터의 장착 아이템</span>
        <CharacterEquipment equippedItems={character.equippedItems} />
        {!Object.values(character.equippedItems).some(Boolean) && <p className="panel-hint">아직 장착한 아이템이 없어요.</p>}
      </div>
    </div>
    <div className="item-tabs item-tabs--clothes" aria-label="의상 분류">
      {(Object.entries(CLOTHING_CATEGORIES) as [ClothingCategory, string][]).map(([id, label]) =>
        <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>{label}</button>)}
    </div>
    <div className="item-grid">
      <button type="button" className="item-card" aria-pressed={!character.equippedItems[category]}
        aria-label={`${CLOTHING_CATEGORIES[category]} 장착 해제`}
        onClick={() => equipItem(character.id, category, null)}>
        <span className="item-artwork">－</span><strong>장착 해제</strong>
      </button>
      {items.map((item) => <button key={item.id} type="button" className="item-card" data-item-id={item.id}
        aria-pressed={character.equippedItems[category] === item.id}
        onClick={() => equipItem(character.id, category, item.id)}>
        <ItemArtwork item={item} /><strong>{item.name}</strong>
        <span>{character.equippedItems[category] === item.id ? '장착 중' : '장착하기'}</span>
      </button>)}
    </div>
    {!items.length && <p className="panel-hint">보유한 {CLOTHING_CATEGORIES[category]} 아이템이 없어요. 상점에서 구매할 수 있어요.</p>}
  </>
}
