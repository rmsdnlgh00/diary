import { create } from 'zustand'
import { createMockCharacters } from '@/data/mockCharacters'
import { DEFAULT_WORLD_ID, getWorld } from '@/data/worlds'
import type { DiaryCharacterData, PanelId } from '@/types'

interface GameState {
  worldId: string
  coins: number
  characters: DiaryCharacterData[]
  selectedCharacterId: string | null
  activePanel: PanelId | null
  selectCharacter: (id: string | null) => void
  togglePanel: (panel: PanelId) => void
  closePanel: () => void
}

export const useGameStore = create<GameState>((set) => ({
  worldId: DEFAULT_WORLD_ID,
  coins: 100,
  characters: createMockCharacters(getWorld(DEFAULT_WORLD_ID)),
  selectedCharacterId: null,
  activePanel: null,
  selectCharacter: (id) => set({ selectedCharacterId: id }),
  togglePanel: (panel) =>
    set((state) => ({ activePanel: state.activePanel === panel ? null : panel })),
  closePanel: () => set({ activePanel: null }),
}))
