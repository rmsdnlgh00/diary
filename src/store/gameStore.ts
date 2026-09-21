import { create } from 'zustand'
import { createMockCharacters } from '@/data/mockCharacters'
import { DEFAULT_WORLD_ID, getWorld } from '@/data/worlds'
import type { DecorationData, DiaryCharacterData, PanelId } from '@/types'

interface GameState {
  worldId: string
  coins: number
  characters: DiaryCharacterData[]
  decorations: DecorationData[]
  selectedCharacterId: string | null
  activePanel: PanelId | null
  selectCharacter: (id: string | null) => void
  togglePanel: (panel: PanelId) => void
  closePanel: () => void
}

const initialWorld = getWorld(DEFAULT_WORLD_ID)

export const useGameStore = create<GameState>((set) => ({
  worldId: DEFAULT_WORLD_ID,
  coins: 100,
  characters: createMockCharacters(initialWorld),
  decorations: initialWorld.decorations,
  selectedCharacterId: null,
  activePanel: null,
  selectCharacter: (id) => set({ selectedCharacterId: id }),
  togglePanel: (panel) =>
    set((state) => ({ activePanel: state.activePanel === panel ? null : panel })),
  closePanel: () => set({ activePanel: null }),
}))
