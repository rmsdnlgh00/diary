import { create } from 'zustand'
import { SEED_DIARIES } from '@/data/seedDiaries'
import { getItem, ownsItem } from '@/data/items'
import { getWorld } from '@/data/worlds'
import { canPlaceDecoration } from '@/systems/decorationSystem'
import { writeDiary } from '@/systems/diarySystem'
import { isMonthKey, loadSave, persistSave } from '@/systems/saveSystem'
import type { Point } from '@/systems/worldSystem'
import type { ClothingCategory, DecorationData, DiaryCharacterData, DiaryEntry, Inventory, PanelId, WorldDecorations } from '@/types'
import { TODAY, toDateKey, toMonthKey } from '@/utils/date'

type PlacementTool = { kind: 'place'; itemId: string } | { kind: 'move'; placedId: string } | null

interface GameState {
  worldId: string
  coins: number
  inventory: Inventory
  worldDecorations: WorldDecorations
  calendarMonth: string
  today: string
  storageError: boolean
  feedback: string
  placementTool: PlacementTool
  selectedDecorationId: string | null
  diaries: DiaryEntry[]
  characters: DiaryCharacterData[]
  decorations: DecorationData[]
  selectedCharacterId: string | null
  activePanel: PanelId | null
  /** 방금 일기를 써서 감정이 정해진 날짜. 결과를 잠깐 보여주는 데 쓴다. */
  lastWrittenDate: string | null
  selectCharacter: (id: string | null) => void
  togglePanel: (panel: PanelId) => void
  closePanel: () => void
  saveDiary: (date: string, text: string) => void
  clearLastWritten: () => void
  buyItem: (itemId: string) => void
  equipItem: (characterId: string, category: ClothingCategory, itemId: string | null) => void
  chooseDecoration: (itemId: string) => void
  selectDecoration: (placedId: string) => void
  startMovingDecoration: () => void
  placeAt: (point: Point) => void
  recallDecoration: () => void
  cancelPlacement: () => void
  setWorld: (worldId: string) => void
  syncCalendar: () => void
}

/** 저장된 게 하나도 없으면 지난 며칠치 예시 일기로 마을을 채워 둔다. */
function firstRunState() {
  const saved = loadSave()
  if (saved.diaries.length > 0 || saved.characters.length > 0) return saved

  let diaries: DiaryEntry[] = []
  let characters: DiaryCharacterData[] = []
  for (const seed of SEED_DIARIES) {
    const result = writeDiary(getWorld(toMonthKey(seed.date)), diaries, characters, seed.date, seed.text)
    diaries = result.diaries
    characters = result.characters
  }
  const initial = { ...saved, diaries, characters }
  persistSave(initial)
  return initial
}

const saved = firstRunState()

export const useGameStore = create<GameState>((set, get) => {
  // 모든 영속 변경은 전체 저장 데이터를 함께 기록한다. 일기 저장도 구매 기록을 덮어쓰지 않는다.
  const commit = (updates: Partial<GameState>) => {
    const next = { ...get(), ...updates }
    const { diaries, characters, coins, inventory, worldDecorations, worldId, calendarMonth } = next
    const stored = persistSave({ diaries, characters, coins, inventory, worldDecorations, worldId, calendarMonth })
    set({ ...updates, storageError: !stored })
  }
  return {
    worldId: saved.worldId,
    calendarMonth: saved.calendarMonth,
    today: TODAY,
    coins: saved.coins,
    inventory: saved.inventory,
    worldDecorations: saved.worldDecorations,
    storageError: false,
    feedback: '',
    placementTool: null,
    selectedDecorationId: null,
    diaries: saved.diaries,
    characters: saved.characters,
    decorations: getWorld(saved.worldId).decorations,
    selectedCharacterId: null,
    activePanel: null,
    lastWrittenDate: null,

    selectCharacter: (id) => set({ selectedCharacterId: id }),
    togglePanel: (panel) =>
      set((state) => ({ activePanel: state.activePanel === panel ? null : panel,
        selectedCharacterId: null, selectedDecorationId: null, placementTool: null, feedback: '' })),
    closePanel: () => set({ activePanel: null, selectedDecorationId: null, placementTool: null, feedback: '' }),
    clearLastWritten: () => set({ lastWrittenDate: null }),

    saveDiary: (date, text) => {
      const { diaries, characters } = get()
      const month = toMonthKey(date)
      const result = writeDiary(getWorld(month), diaries, characters, date, text)
      commit({
        diaries: result.diaries,
        characters: result.characters,
        lastWrittenDate: date,
        worldId: month,
        decorations: getWorld(month).decorations,
      })
    },

    buyItem: (itemId) => {
      const { coins, inventory } = get()
      const item = getItem(itemId)
      if (!item) return
      if (ownsItem(inventory, item)) { set({ feedback: '보유 중' }); return }
      if (coins < item.price) { set({ feedback: '코인이 부족해요' }); return }
      const group = item.category === 'decoration' ? 'decorations' : 'clothes'
      commit({ coins: coins - item.price,
        inventory: { ...inventory, [group]: [...inventory[group], item.id] }, feedback: '구매했어요!' })
    },

    equipItem: (characterId, category, itemId) => {
      const { characters, inventory } = get()
      if (!characters.some((c) => c.id === characterId)) return
      if (itemId !== null && (!inventory.clothes.includes(itemId) || getItem(itemId)?.category !== category)) return
      commit({ characters: characters.map((c) => c.id === characterId
        ? { ...c, equippedItems: { ...c.equippedItems, [category]: itemId } } : c),
        feedback: itemId ? '장착했어요!' : '장착을 해제했어요' })
    },

    chooseDecoration: (itemId) => {
      const { activePanel, inventory, worldDecorations, worldId } = get()
      if (activePanel !== 'DECORATE' || !inventory.decorations.includes(itemId)) return
      const existing = (worldDecorations[worldId] ?? []).find((d) => d.itemId === itemId)
      if (existing) {
        set({ selectedDecorationId: existing.id, placementTool: null, feedback: '이미 배치했어요. 이동하거나 회수할 수 있어요.' })
      } else {
        set({ placementTool: { kind: 'place', itemId }, selectedDecorationId: null, feedback: '잔디 위에 놓을 곳을 눌러주세요.' })
      }
    },

    selectDecoration: (placedId) => {
      const { activePanel, worldId, worldDecorations } = get()
      if (activePanel !== 'DECORATE' || !(worldDecorations[worldId] ?? []).some((d) => d.id === placedId)) return
      set({ selectedDecorationId: placedId, placementTool: null, feedback: '' })
    },

    startMovingDecoration: () => {
      const { activePanel, selectedDecorationId } = get()
      if (activePanel !== 'DECORATE' || !selectedDecorationId) return
      set({ placementTool: { kind: 'move', placedId: selectedDecorationId }, feedback: '옮길 곳을 눌러주세요.' })
    },

    placeAt: (point) => {
      const { activePanel, worldId, worldDecorations, placementTool, inventory } = get()
      if (activePanel !== 'DECORATE' || !placementTool) return
      const placed = worldDecorations[worldId] ?? []
      const moving = placementTool.kind === 'move' ? placed.find((d) => d.id === placementTool.placedId) : undefined
      const item = getItem(placementTool.kind === 'place' ? placementTool.itemId : moving?.itemId ?? '')
      if (!item || !inventory.decorations.includes(item.id) || (placementTool.kind === 'move' && !moving)) return
      if (!moving && placed.some((d) => d.itemId === item.id)) return
      if (!canPlaceDecoration(getWorld(worldId), item, point, placed, moving?.id)) {
        set({ feedback: '여기에는 놓을 수 없어요. 비어 있는 잔디를 골라주세요.' }); return
      }
      const decoration = { id: moving?.id ?? `placed_${crypto.randomUUID()}`, itemId: item.id,
        x: point.x, y: point.y }
      const next = moving ? placed.map((d) => d.id === moving.id ? decoration : d) : [...placed, decoration]
      commit({ worldDecorations: { ...worldDecorations, [worldId]: next }, placementTool: null,
        selectedDecorationId: decoration.id, feedback: moving ? '옮겼어요!' : '배치했어요!' })
    },

    recallDecoration: () => {
      const { activePanel, worldId, worldDecorations, selectedDecorationId } = get()
      if (activePanel !== 'DECORATE' || !selectedDecorationId) return
      commit({ worldDecorations: { ...worldDecorations,
        [worldId]: (worldDecorations[worldId] ?? []).filter((d) => d.id !== selectedDecorationId) },
        selectedDecorationId: null, placementTool: null, feedback: '회수했어요. 다시 배치할 수 있어요.' })
    },

    cancelPlacement: () => set({ placementTool: null, feedback: '' }),

    setWorld: (worldId) => {
      if (!isMonthKey(worldId)) return
      commit({ worldId, decorations: getWorld(worldId).decorations, selectedCharacterId: null,
        selectedDecorationId: null, placementTool: null, feedback: '' })
    },

    syncCalendar: () => {
      const today = toDateKey(new Date())
      const month = toMonthKey(today)
      if (get().calendarMonth !== month) {
        commit({ today, calendarMonth: month, worldId: month, decorations: getWorld(month).decorations,
          selectedCharacterId: null, selectedDecorationId: null, placementTool: null, activePanel: null, feedback: '' })
      } else if (get().today !== today) {
        set({ today, activePanel: null })
      }
    },
  }
})

export const diaryForDate = (diaries: readonly DiaryEntry[], date: string) =>
  diaries.find((entry) => entry.date === date)
