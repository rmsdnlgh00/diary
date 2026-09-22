import { create } from 'zustand'
import { SEED_DIARIES } from '@/data/seedDiaries'
import { DEFAULT_WORLD_ID, getWorld } from '@/data/worlds'
import { writeDiary } from '@/systems/diarySystem'
import { loadSave, persistSave } from '@/systems/saveSystem'
import type { DecorationData, DiaryCharacterData, DiaryEntry, PanelId } from '@/types'

interface GameState {
  worldId: string
  coins: number
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
}

const initialWorld = getWorld(DEFAULT_WORLD_ID)

/** 저장된 게 하나도 없으면 지난 며칠치 예시 일기로 마을을 채워 둔다. */
function firstRunState() {
  const saved = loadSave()
  if (saved.diaries.length > 0 || saved.characters.length > 0) return saved

  let diaries: DiaryEntry[] = []
  let characters: DiaryCharacterData[] = []
  for (const seed of SEED_DIARIES) {
    const result = writeDiary(initialWorld, diaries, characters, seed.date, seed.text)
    diaries = result.diaries
    characters = result.characters
  }
  persistSave({ diaries, characters })
  return { version: 1 as const, diaries, characters }
}

const saved = firstRunState()

export const useGameStore = create<GameState>((set, get) => ({
  worldId: DEFAULT_WORLD_ID,
  coins: 100,
  diaries: saved.diaries,
  characters: saved.characters,
  decorations: initialWorld.decorations,
  selectedCharacterId: null,
  activePanel: null,
  lastWrittenDate: null,

  selectCharacter: (id) => set({ selectedCharacterId: id }),
  togglePanel: (panel) =>
    set((state) => ({ activePanel: state.activePanel === panel ? null : panel })),
  closePanel: () => set({ activePanel: null }),
  clearLastWritten: () => set({ lastWrittenDate: null }),

  saveDiary: (date, text) => {
    const { worldId, diaries, characters } = get()
    const result = writeDiary(getWorld(worldId), diaries, characters, date, text)
    persistSave({ diaries: result.diaries, characters: result.characters })
    set({
      diaries: result.diaries,
      characters: result.characters,
      lastWrittenDate: date,
    })
  },
}))

export const diaryForDate = (diaries: readonly DiaryEntry[], date: string) =>
  diaries.find((entry) => entry.date === date)
