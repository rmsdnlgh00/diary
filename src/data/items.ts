import type { CharacterModel, ClothingCategory, EquippedItems, GameItem, Inventory } from '@/types'

export const CLOTHING_CATEGORIES: Record<ClothingCategory, string> = {
  hat: '모자', top: '상의', bottom: '하의', shoes: '신발', bag: '가방', accessory: '액세서리',
}

export const emptyEquipment = (): EquippedItems => ({
  hat: null, top: null, bottom: null, shoes: null, bag: null, accessory: null,
})

/**
 * Every clothing item has its own folder, public/assets/clothes/<group>/<kind>/<id>/, holding
 * icon.webp and one fitted model per body (male.glb, female.glb; scripts/export-clothes.py).
 * group is `shared` unless the item has `onlyFor`.
 */
const CLOTHES_KINDS: Record<ClothingCategory, string> = {
  hat: 'hats', top: 'tops', bottom: 'bottoms', shoes: 'shoes', bag: 'accessories', accessory: 'accessories',
}
export const clothesFolder = (item: Pick<GameItem, 'id' | 'category' | 'onlyFor'>): string =>
  `/assets/clothes/${item.onlyFor ?? 'shared'}/${CLOTHES_KINDS[item.category as ClothingCategory]}/${item.id}`
export const clothesModelUrl = (item: Pick<GameItem, 'id' | 'category' | 'onlyFor'>, body: CharacterModel): string =>
  `${clothesFolder(item)}/${body}.glb`

type WearableSpec = Omit<GameItem, 'assetPath' | 'category'> & { category: ClothingCategory }
const wear = (item: WearableSpec): GameItem => ({ ...item, assetPath: `${clothesFolder(item)}/icon.webp` })

/** Every decoration has its own folder, public/assets/decorations/<id>/: icon.webp and model.glb. */
export const decorationFolder = (id: string): string => `/assets/decorations/${id}`
export const decorationModelUrl = (id: string): string => `${decorationFolder(id)}/model.glb`
const place = (item: Omit<GameItem, 'assetPath' | 'category'>): GameItem =>
  ({ ...item, category: 'decoration', assetPath: `${decorationFolder(item.id)}/icon.webp` })

// assetPath에 PNG/WebP 경로를 넣으면 상품·인벤토리·월드 표시가 함께 바뀐다.
// 3D 모델이 있는 아이템의 그림은 scripts/render-item-icons.py가 Blender에서 렌더한다.
export const ITEMS: GameItem[] = [
  wear({ id: 'basic_hat', name: '산책 모자', category: 'hat', price: 10, placeholder: '🧢' }),
  wear({ id: 'beanie', name: '방울 털모자', category: 'hat', price: 15, placeholder: '🧶' }),
  wear({ id: 'bucket_hat', name: '하늘 벙거지', category: 'hat', price: 15, placeholder: '👒' }),
  wear({ id: 'beret', name: '분홍 베레모', category: 'hat', price: 20, placeholder: '🎀' }),
  wear({ id: 'bear_hat', name: '곰돌이 모자', category: 'hat', price: 25, placeholder: '🐻' }),
  wear({ id: 'striped_tee', name: '줄무늬 티셔츠', category: 'top', price: 15, placeholder: '👕' }),
  wear({ id: 'hoodie_gray', name: '포근한 회색 후드', category: 'top', price: 20, placeholder: '👕' }),
  wear({ id: 'raincoat_yellow', name: '노란 비옷', category: 'top', price: 25, placeholder: '🧥' }),
  wear({ id: 'pajama', name: '구름 잠옷', category: 'top', price: 20, placeholder: '👚' }),
  wear({ id: 'winter_coat', name: '겨울 코트', category: 'top', price: 120, placeholder: '🧥' }),
  wear({ id: 'basic_pants', name: '편안한 바지', category: 'bottom', price: 10, placeholder: '👖', long: true }),
  wear({ id: 'denim_shorts', name: '청반바지', category: 'bottom', price: 15, placeholder: '🩳' }),
  wear({ id: 'jogger_pants', name: '조거 팬츠', category: 'bottom', price: 15, placeholder: '👖', long: true }),
  wear({ id: 'pajama_pants', name: '구름 잠옷 바지', category: 'bottom', price: 15, placeholder: '👖', long: true }),
  wear({ id: 'check_shorts', name: '체크 반바지', category: 'bottom', price: 20, placeholder: '🩳' }),
  wear({ id: 'walking_shoes', name: '산책 운동화', category: 'shoes', price: 10, placeholder: '👟' }),
  wear({ id: 'backpack', name: '작은 배낭', category: 'bag', price: 15, placeholder: '🎒' }),
  wear({ id: 'scarf', name: '따뜻한 목도리', category: 'accessory', price: 10, placeholder: '🧣' }),
  place({ id: 'flower_pot', name: '꽃 화분', price: 10, placeholder: '🪴', worldWidth: 0.035 }),
  place({ id: 'picnic_mat', name: '피크닉 매트', price: 20, placeholder: '🧺', worldWidth: 0.07 }),
  place({ id: 'small_lamp', name: '작은 가로등', price: 15, placeholder: '🏮', worldWidth: 0.035 }),
  place({ id: 'flower_bed', name: '작은 꽃밭', price: 20, placeholder: '🌷', worldWidth: 0.055 }),
  place({ id: 'chair', name: '쉬어가는 의자', price: 15, placeholder: '🪑', worldWidth: 0.04 }),
  place({ id: 'bench', name: '긴 벤치', price: 25, placeholder: '🛋️', worldWidth: 0.08 }),
  place({ id: 'sign', name: '마을 안내판', price: 10, placeholder: '🪧', worldWidth: 0.04 }),
  place({ id: 'plant', name: '초록 나무', price: 15, placeholder: '🌳', worldWidth: 0.055 }),
  place({ id: 'fountain', name: '작은 분수', price: 60, placeholder: '⛲', worldWidth: 0.08 }),
  place({ id: 'bicycle', name: '산책 자전거', price: 30, placeholder: '🚲', worldWidth: 0.06 }),
  place({ id: 'floor_tile', name: '돌바닥 타일', price: 5, placeholder: '🟫', worldWidth: 0.06,
    description: '한 번 사면 여러 장을 이어 깔 수 있어요.', stackable: true, floor: true }),
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
