import { getItem, normalizeEquipment } from '@/data/items'
import type { DiaryCharacterData, DiaryEntry, Inventory, WorldDecorations } from '@/types'
import { toDateKey, toMonthKey } from '@/utils/date'

const STORAGE_KEY = 'haru-village:v1'
export const isMonthKey = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)

export interface SaveData {
  version: 2
  diaries: DiaryEntry[]
  characters: DiaryCharacterData[]
  coins: number
  inventory: Inventory
  worldDecorations: WorldDecorations
  worldId: string
  calendarMonth: string
}

function emptySave(): SaveData {
  const month = toMonthKey(toDateKey(new Date()))
  return {
    version: 2, diaries: [], characters: [], coins: 100,
    inventory: { clothes: [], decorations: [] }, worldDecorations: {},
    worldId: month, calendarMonth: month,
  }
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

function ownedIds(value: unknown, decoration: boolean): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id): id is string => {
    if (typeof id !== 'string') return false
    const item = getItem(id)
    return !!item && (item.category === 'decoration') === decoration
  }))]
}

/** 같은 저장 키에서 v1 일기를 보존하고 구매/장착/월별 공간 필드를 보완한다. */
export function loadSave(): SaveData {
  const empty = emptySave()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty
    const parsed = record(JSON.parse(raw))
    if (parsed.version !== 1 && parsed.version !== 2) return empty
    const savedInventory = record(parsed.inventory)
    const inventory: Inventory = {
      clothes: ownedIds(savedInventory.clothes, false),
      decorations: ownedIds(savedInventory.decorations, true),
    }
    const characters = Array.isArray(parsed.characters)
      ? parsed.characters.filter((c) => c && typeof c.id === 'string' && typeof c.diaryDate === 'string')
        .map((c) => ({ ...c, equippedItems: normalizeEquipment(c.equippedItems, inventory.clothes) }))
      : []
    const worldDecorations: WorldDecorations = {}
    for (const [month, entries] of Object.entries(record(parsed.worldDecorations))) {
      if (!isMonthKey(month) || !Array.isArray(entries)) continue
      const itemIds = new Set<string>()
      const placedIds = new Set<string>()
      worldDecorations[month] = entries.filter((entry) => {
        if (!entry || typeof entry.id !== 'string' || typeof entry.itemId !== 'string' ||
          !inventory.decorations.includes(entry.itemId) || itemIds.has(entry.itemId) || placedIds.has(entry.id) ||
          !Number.isFinite(entry.x) || !Number.isFinite(entry.y) ||
          entry.x < 0 || entry.x > 1 || entry.y < 0 || entry.y > 1) return false
        itemIds.add(entry.itemId)
        placedIds.add(entry.id)
        return true
      }).map(({ id, itemId, x, y }) => ({ id, itemId, x, y }))
    }
    return {
      ...empty,
      diaries: Array.isArray(parsed.diaries) ? parsed.diaries : [],
      characters, inventory, worldDecorations,
      coins: typeof parsed.coins === 'number' && Number.isSafeInteger(parsed.coins) && parsed.coins >= 0
        ? parsed.coins : empty.coins,
      // 달이 바뀌면 새로운 마을로, 같은 달의 새로고침은 보고 있던 마을로 돌아간다.
      worldId: parsed.calendarMonth === empty.calendarMonth && isMonthKey(parsed.worldId)
        ? parsed.worldId : empty.worldId,
    }
  } catch {
    return empty
  }
}

/** 저장 접근은 이 모듈에만 모은다. 실패 시 UI에서 알릴 수 있게 결과를 반환한다. */
export function persistSave(data: Omit<SaveData, 'version'>): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: 2 }))
    return true
  } catch {
    return false
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 저장소 사용이 제한되어 있어도 앱은 계속 동작한다.
  }
}
