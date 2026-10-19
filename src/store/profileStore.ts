import { create } from 'zustand'
import type { CharacterModel } from '@/types'

/**
 * Who is writing: the name the village calls them and the look new characters get.
 * Set once by the first-run welcome (Onboarding); without it the welcome shows.
 * Kept apart from the diary save so older saves load unchanged.
 */
export interface Profile {
  name: string
  model: CharacterModel
  /**
   * Where the first-run guide is: 'diary' while the first diary is still to be written, 'tour'
   * until the short tour of the menus is over; gone once done.
   */
  guide?: Guide
}
export type Guide = 'diary' | 'tour'

const STORAGE_KEY = 'haru-village:profile'
export const NAME_LIMIT = 10

function load(): Profile | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<Profile> | null
    if (!saved || typeof saved.name !== 'string' || !saved.name.trim()) return null
    return { name: saved.name.trim().slice(0, NAME_LIMIT), model: saved.model === 'female' ? 'female' : 'male',
      ...(saved.guide === 'diary' || saved.guide === 'tour' ? { guide: saved.guide } : {}) }
  } catch {
    return null
  }
}

interface ProfileState {
  profile: Profile | null
  setProfile: (profile: Profile) => void
  /** Moves the first-run guide on; null ends it. */
  setGuide: (guide: Guide | null) => void
}

const save = (profile: Profile) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(profile)) } catch { /* kept for this visit only */ }
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: load(),
  setProfile: (profile) => {
    const clean: Profile = { name: profile.name.trim().slice(0, NAME_LIMIT), model: profile.model,
      ...(profile.guide ? { guide: profile.guide } : {}) }
    save(clean)
    set({ profile: clean })
  },
  setGuide: (guide) => {
    const profile = get().profile
    if (!profile) return
    const next: Profile = { name: profile.name, model: profile.model, ...(guide ? { guide } : {}) }
    save(next)
    set({ profile: next })
  },
}))
