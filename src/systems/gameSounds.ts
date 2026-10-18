import { initAudio, playSfx, sinceLastSfx, type Sfx } from '@/systems/audioSystem'
import { startMusic } from '@/systems/music'
import { useGameStore } from '@/store/gameStore'
import { useSettingsStore } from '@/store/settingsStore'

/** Feedback lines that mean "that didn't work". */
const REFUSED = /부족|놓을 수 없어요/

/**
 * Connects the game to its sounds. Sounds follow what changed in the store rather than which
 * button was pressed, so a purchase sounds the same from the shop and the fitting room. Any other
 * button gets a soft tap.
 */
export function initGameSounds() {
  initAudio()
  startMusic()

  useGameStore.subscribe((state, prev) => {
    const play = (sfx: Sfx) => playSfx(sfx)
    if (state.lastWrittenDate && state.lastWrittenDate !== prev.lastWrittenDate) return play('save')
    if (state.coins < prev.coins) return play('coin')
    if (state.feedback !== prev.feedback && REFUSED.test(state.feedback)) return play('error')
    const placed = state.worldDecorations[state.worldId]?.length ?? 0
    const placedBefore = prev.worldDecorations[prev.worldId]?.length ?? 0
    if (state.worldDecorations !== prev.worldDecorations && state.worldId === prev.worldId) {
      return play(placed < placedBefore ? 'recall' : 'place')
    }
    if (state.characters !== prev.characters && state.diaries === prev.diaries
      && state.characters.length === prev.characters.length) return play('equip')
    if (state.selectedCharacterId !== prev.selectedCharacterId) return play(state.selectedCharacterId ? 'select' : 'close')
    if (state.activePanel !== prev.activePanel) return play(state.activePanel ? 'open' : 'close')
    if (state.worldId !== prev.worldId) return play('page')
  })
  useSettingsStore.subscribe((state, prev) => {
    if (state.open !== prev.open) playSfx(state.open ? 'open' : 'close')
  })

  // Every other button: a soft tap, unless the press already made a more specific sound.
  document.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest?.('button, [role="switch"], [role="tab"], [role="radio"]')
    if (!button || (button as HTMLButtonElement).disabled) return
    const toggle = button.matches('[role="switch"], [role="radio"], [role="tab"]')
    setTimeout(() => { if (sinceLastSfx() > 40) playSfx(toggle ? 'toggle' : 'tap') }, 0)
  }, true)
}
