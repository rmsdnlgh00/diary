import type { ClothingCategory, EquippedItems, GameItem, Inventory } from '@/types'

export const CLOTHING_CATEGORIES: Record<ClothingCategory, string> = {
  hat: '모자', top: '상의', bottom: '하의', shoes: '신발', bag: '가방', accessory: '액세서리',
}

export const emptyEquipment = (): EquippedItems => ({
  hat: null, top: null, bottom: null, shoes: null, bag: null, accessory: null,
})

// assetPath에 PNG/WebP 경로를 넣으면 상품·인벤토리·월드 표시가 함께 바뀐다.
// 3D 모델이 있는 아이템의 그림은 scripts/render-item-icons.py가 Blender에서 렌더한다.
export const ITEMS: GameItem[] = [
  { id: 'basic_hat', name: '산책 모자', category: 'hat', price: 10, assetPath: '/assets/items/basic_hat.webp', placeholder: '🧢' },
  { id: 'beanie', name: '방울 털모자', category: 'hat', price: 15, assetPath: '/assets/items/beanie.webp', placeholder: '🧶' },
  { id: 'bucket_hat', name: '하늘 벙거지', category: 'hat', price: 15, assetPath: '/assets/items/bucket_hat.webp', placeholder: '👒' },
  { id: 'beret', name: '분홍 베레모', category: 'hat', price: 20, assetPath: '/assets/items/beret.webp', placeholder: '🎀' },
  { id: 'bear_hat', name: '곰돌이 모자', category: 'hat', price: 25, assetPath: '/assets/items/bear_hat.webp', placeholder: '🐻' },
  { id: 'striped_tee', name: '줄무늬 티셔츠', category: 'top', price: 15, assetPath: '/assets/items/striped_tee.webp', placeholder: '👕' },
  { id: 'hoodie_gray', name: '포근한 회색 후드', category: 'top', price: 20, assetPath: '/assets/items/hoodie_gray.webp', placeholder: '👕' },
  { id: 'raincoat_yellow', name: '노란 비옷', category: 'top', price: 25, assetPath: '/assets/items/raincoat_yellow.webp', placeholder: '🧥' },
  { id: 'pajama', name: '구름 잠옷', category: 'top', price: 20, assetPath: '/assets/items/pajama.webp', placeholder: '👚' },
  { id: 'winter_coat', name: '겨울 코트', category: 'top', price: 120, assetPath: '/assets/items/winter_coat.webp', placeholder: '🧥' },
  { id: 'basic_pants', name: '편안한 바지', category: 'bottom', price: 10, assetPath: '/assets/items/basic_pants.webp', placeholder: '👖', long: true },
  { id: 'denim_shorts', name: '청반바지', category: 'bottom', price: 15, assetPath: '/assets/items/denim_shorts.webp', placeholder: '🩳' },
  { id: 'jogger_pants', name: '조거 팬츠', category: 'bottom', price: 15, assetPath: '/assets/items/jogger_pants.webp', placeholder: '👖', long: true },
  { id: 'pajama_pants', name: '구름 잠옷 바지', category: 'bottom', price: 15, assetPath: '/assets/items/pajama_pants.webp', placeholder: '👖', long: true },
  { id: 'check_shorts', name: '체크 반바지', category: 'bottom', price: 20, assetPath: '/assets/items/check_shorts.webp', placeholder: '🩳' },
  { id: 'walking_shoes', name: '산책 운동화', category: 'shoes', price: 10, assetPath: '/assets/items/walking_shoes.webp', placeholder: '👟' },
  { id: 'backpack', name: '작은 배낭', category: 'bag', price: 15, assetPath: '/assets/items/backpack.webp', placeholder: '🎒' },
  { id: 'scarf', name: '따뜻한 목도리', category: 'accessory', price: 10, assetPath: '/assets/items/scarf.webp', placeholder: '🧣' },
  { id: 'flower_pot', name: '꽃 화분', category: 'decoration', price: 10, assetPath: '/assets/items/flower_pot.webp', placeholder: '🪴', worldWidth: 0.035 },
  { id: 'picnic_mat', name: '피크닉 매트', category: 'decoration', price: 20, assetPath: '/assets/items/picnic_mat.webp', placeholder: '🧺', worldWidth: 0.07 },
  { id: 'small_lamp', name: '작은 가로등', category: 'decoration', price: 15, assetPath: '/assets/items/small_lamp.webp', placeholder: '🏮', worldWidth: 0.035 },
  { id: 'flower_bed', name: '작은 꽃밭', category: 'decoration', price: 20, assetPath: '/assets/items/flower_bed.webp', placeholder: '🌷', worldWidth: 0.055 },
  { id: 'chair', name: '쉬어가는 의자', category: 'decoration', price: 15, assetPath: '/assets/items/chair.webp', placeholder: '🪑', worldWidth: 0.04 },
  { id: 'bench', name: '긴 벤치', category: 'decoration', price: 25, assetPath: '/assets/items/bench.webp', placeholder: '🛋️', worldWidth: 0.08 },
  { id: 'sign', name: '마을 안내판', category: 'decoration', price: 10, assetPath: '/assets/items/sign.webp', placeholder: '🪧', worldWidth: 0.04 },
  { id: 'plant', name: '초록 나무', category: 'decoration', price: 15, assetPath: '/assets/items/plant.webp', placeholder: '🌳', worldWidth: 0.055 },
  { id: 'fountain', name: '작은 분수', category: 'decoration', price: 60, assetPath: '/assets/items/fountain.webp', placeholder: '⛲', worldWidth: 0.08 },
  { id: 'bicycle', name: '산책 자전거', category: 'decoration', price: 30, assetPath: '/assets/items/bicycle.webp', placeholder: '🚲', worldWidth: 0.06 },
  { id: 'floor_tile', name: '돌바닥 타일', category: 'decoration', price: 5, assetPath: '/assets/items/floor_tile.webp', placeholder: '🟫', worldWidth: 0.06,
    description: '한 번 사면 여러 장을 이어 깔 수 있어요.', stackable: true, floor: true },
]

/**
 * For now everything in the shop is free. The price list stays as it is; set `free` to
 * false to charge the prices again.
 */
export const SHOP = { free: true }
export const priceOf = (item: GameItem): number => SHOP.free ? 0 : item.price

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
