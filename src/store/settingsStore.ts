import { create } from 'zustand'

/**
 * Device settings (graphics, motion, sound). Kept apart from the diary save: they belong to this
 * device, not to the village, so they never travel with a backup or a future server sync.
 */
export type GraphicsQuality = 'auto' | 'low' | 'medium' | 'high'
export type FrameRate = 30 | 60
export type SoundChannel = 'music' | 'effects'

export interface Settings {
  quality: GraphicsQuality
  frameRate: FrameRate
  /** UI slides and pop-ins become instant. */
  reduceMotion: boolean
  /** Ripples and glints drifting across the pond and the sea. */
  waterMotion: boolean
  /** 0–1. Sound is not in the game yet; these are read by the audio system once it lands. */
  masterVolume: number
  musicVolume: number
  effectsVolume: number
  muted: boolean
}

const STORAGE_KEY = 'haru-village-settings'

export const DEFAULT_SETTINGS: Settings = {
  quality: 'auto',
  frameRate: 60,
  reduceMotion: typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  waterMotion: true,
  masterVolume: 0.8,
  musicVolume: 0.6,
  effectsVolume: 0.8,
  muted: false,
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const saved = JSON.parse(raw) as Partial<Settings>
    // Only keep known keys with the right type, so an old or broken entry falls back per field.
    const merged = { ...DEFAULT_SETTINGS }
    for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof Settings>) {
      if (typeof saved[key] === typeof DEFAULT_SETTINGS[key]) (merged as Record<string, unknown>)[key] = saved[key]
    }
    return merged
  } catch {
    return DEFAULT_SETTINGS
  }
}

interface SettingsState extends Settings {
  /** Whether the settings window is showing (not saved). */
  open: boolean
  setOpen: (open: boolean) => void
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  reset: () => void
}

export const useSettingsStore = create<SettingsState>((setState) => ({
  ...load(),
  open: false,
  setOpen: (open) => setState({ open }),
  set: (key, value) => setState({ [key]: value } as Partial<Settings>),
  reset: () => setState(DEFAULT_SETTINGS),
}))

/** What a sound on `channel` should play at, 0–1, with mute and the master volume applied. */
export function soundVolume(channel: SoundChannel): number {
  const s = useSettingsStore.getState()
  if (s.muted) return 0
  return s.masterVolume * (channel === 'music' ? s.musicVolume : s.effectsVolume)
}

const applyReduceMotion = (on: boolean) => {
  if (typeof document !== 'undefined') document.documentElement.toggleAttribute('data-reduce-motion', on)
}
applyReduceMotion(useSettingsStore.getState().reduceMotion)

useSettingsStore.subscribe((state, prev) => {
  if (state.open !== prev.open) return
  const settings = Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((key) => [key, state[key as keyof Settings]]))
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) } catch { /* private mode: keep in memory */ }
  applyReduceMotion(state.reduceMotion)
})
