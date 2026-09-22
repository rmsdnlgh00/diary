import type { ClothingCategory, EquippedItems, GameItem, Inventory } from '@/types'

export const CLOTHING_CATEGORIES: Record<ClothingCategory, string> = {
  hat: '모자', top: '상의', bottom: '하의', shoes: '신발', bag: '가방', accessory: '액세서리',
}

export const emptyEquipment = (): EquippedItems => ({
  hat: null, top: null, bottom: null, shoes: null, bag: null, accessory: null,
})

// assetPath에 PNG/WebP 경로를 넣으면 상품·인벤토리·월드 표시가 함께 바뀐다.
export const ITEMS: GameItem[] = [
  { id: 'basic_hat', name: '산책 모자', category: 'hat', price: 10, assetPath: '', placeholder: '🧢' },
  { id: 'hoodie_gray', name: '포근한 회색 후드', category: 'top', price: 20, assetPath: '', placeholder: '👕' },
  { id: 'raincoat_yellow', name: '노란 비옷', category: 'top', price: 25, assetPath: '', placeholder: '🧥' },
  { id: 'pajama', name: '구름 잠옷', category: 'top', price: 20, assetPath: '', placeholder: '👚' },
  { id: 'winter_coat', name: '겨울 코트', category: 'top', price: 120, assetPath: '', placeholder: '🧥' },
  { id: 'basic_pants', name: '편안한 바지', category: 'bottom', price: 10, assetPath: '', placeholder: '👖' },
  { id: 'walking_shoes', name: '산책 운동화', category: 'shoes', price: 10, assetPath: '', placeholder: '👟' },
  { id: 'backpack', name: '작은 배낭', category: 'bag', price: 15, assetPath: '', placeholder: '🎒' },
  { id: 'scarf', name: '따뜻한 목도리', category: 'accessory', price: 10, assetPath: '', placeholder: '🧣' },
  { id: 'flower_pot', name: '꽃 화분', category: 'decoration', price: 10, assetPath: '', placeholder: '🪴', worldWidth: 0.035 },
  { id: 'picnic_mat', name: '피크닉 매트', category: 'decoration', price: 20, assetPath: '', placeholder: '🧺', worldWidth: 0.07 },
  { id: 'small_lamp', name: '작은 가로등', category: 'decoration', price: 15, assetPath: '', placeholder: '🏮', worldWidth: 0.035 },
  { id: 'flower_bed', name: '작은 꽃밭', category: 'decoration', price: 20, assetPath: '', placeholder: '🌷', worldWidth: 0.055 },
  { id: 'chair', name: '쉬어가는 의자', category: 'decoration', price: 15, assetPath: '', placeholder: '🪑', worldWidth: 0.04 },
  { id: 'sign', name: '마을 안내판', category: 'decoration', price: 10, assetPath: '', placeholder: '🪧', worldWidth: 0.04 },
  { id: 'plant', name: '초록 나무', category: 'decoration', price: 15, assetPath: '', placeholder: '🌳', worldWidth: 0.055 },
]

export const getItem = (id: string): GameItem | undefined => ITEMS.find((item) => item.id === id)
export const ownsItem = (inventory: Inventory, item: GameItem): boolean =>
  (item.category === 'decoration' ? inventory.decorations : inventory.clothes).includes(item.id)

export function normalizeEquipment(value: unknown, clothes: readonly string[]): EquippedItems {
  const result = emptyEquipment()
  if (!value || typeof value !== 'object') return result
  for (const category of Object.keys(result) as ClothingCategory[]) {
    const id = (value as Record<string, unknown>)[category]
    if (typeof id === 'string' && clothes.includes(id) && getItem(id)?.category === category) {
      result[category] = id
    }
  }
  return result
}
