import { bell, whenAudioReady } from '@/systems/audioSystem'
import { soundVolume } from '@/store/settingsStore'

/**
 * 마을 오르골: an original, slow music-box tune over a soft pad and bass, I–vi–IV–V in C.
 * Two eight-bar halves alternate: A carries the melody, B only breathes with a sparse arpeggio,
 * so the loop doesn't wear thin while someone writes.
 */

const BPM = 72
const STEP = 60 / BPM / 2   // one eighth note
const BAR = 8               // eighths per bar

// [step, midi, length in eighths]
const MELODY: Array<[number, number, number]> = [
  [0, 76, 2], [2, 79, 2], [4, 84, 3], [7, 83, 1],
  [8, 81, 3], [11, 79, 1], [12, 76, 4],
  [16, 77, 2], [18, 81, 2], [20, 84, 2], [22, 81, 2],
  [24, 79, 3], [27, 77, 1], [28, 76, 2], [30, 74, 2],
  [32, 76, 2], [34, 79, 2], [36, 88, 3], [39, 86, 1],
  [40, 84, 2], [42, 81, 2], [44, 76, 4],
  [48, 77, 2], [50, 81, 2], [52, 79, 2], [54, 77, 2],
  [56, 76, 2], [58, 74, 2], [60, 72, 4],
]
// Chord per bar: root (bass) and the triad for the pad and the arpeggio.
const CHORDS: Array<{ root: number; triad: number[] }> = [
  { root: 48, triad: [60, 64, 67] }, { root: 45, triad: [57, 60, 64] },
  { root: 41, triad: [57, 60, 65] }, { root: 43, triad: [59, 62, 67] },
]

/** A slow-swelling triangle chord, quieter than everything else. */
function pad(ctx: AudioContext, out: AudioNode, notes: number[], at: number, length: number) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(0.035, at + length * 0.35)
  g.gain.linearRampToValueAtTime(0, at + length)
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 1200
  g.connect(filter).connect(out)
  for (const midi of notes) {
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)
    osc.detune.value = (Math.random() - 0.5) * 8
    osc.connect(g)
    osc.start(at)
    osc.stop(at + length + 0.05)
  }
}

function bass(ctx: AudioContext, out: AudioNode, midi: number, at: number, length: number) {
  const osc = ctx.createOscillator()
  osc.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(0.09, at + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(g).connect(out)
  osc.start(at)
  osc.stop(at + length + 0.05)
}

/** Starts the background music once sound is unlocked; it follows the music volume from then on. */
export function startMusic() {
  whenAudioReady((ctx, music, reverb) => {
    // Fade in rather than start on a downbeat out of nowhere.
    const fade = ctx.createGain()
    fade.gain.setValueAtTime(0, ctx.currentTime)
    fade.gain.linearRampToValueAtTime(1, ctx.currentTime + 4)
    fade.connect(music)
    const wet = ctx.createGain()
    wet.gain.value = 1.4
    fade.connect(wet).connect(reverb)

    const loopSteps = BAR * 8
    let step = 0
    let half = 0          // 0: melody (A), 1: arpeggio only (B)
    let next = ctx.currentTime + 0.4
    const schedule = () => {
      // Nothing to hear: skip building nodes, keep time.
      const silent = soundVolume('music') <= 0 || ctx.state !== 'running'
      // After a stall (throttled timer), skip ahead instead of playing the missed notes at once.
      if (next < ctx.currentTime - 0.1) next = ctx.currentTime + 0.05
      while (next < ctx.currentTime + 0.35) {
        const human = (Math.random() - 0.5) * 0.012
        const bar = Math.floor(step / BAR)
        const chord = CHORDS[bar % 4]
        if (!silent) {
          if (step % BAR === 0) {
            pad(ctx, fade, chord.triad, next, STEP * BAR)
            bass(ctx, fade, chord.root, next, STEP * 3.5)
          }
          if (step % BAR === 4) bass(ctx, fade, chord.root + 7, next, STEP * 3)
          if (half === 0) {
            for (const [at, midi, length] of MELODY) {
              if (at === step) bell(ctx, fade, null, midi, next + human, { gain: 0.11, decay: Math.max(1.1, length * STEP * 1.6) })
            }
          } else if (step % 3 === 0 && step % BAR !== 7) {
            const note = chord.triad[(step / 3) % 3] + 12
            bell(ctx, fade, null, note, next + human, { gain: 0.06, decay: 1.6, bright: 0.7 })
          }
        }
        next += STEP
        step += 1
        if (step === loopSteps) { step = 0; half = 1 - half }
      }
    }
    // Background tabs throttle timers; the look-ahead and `visibilitychange` suspend cover that.
    window.setInterval(schedule, 100)
    schedule()
  })
}
