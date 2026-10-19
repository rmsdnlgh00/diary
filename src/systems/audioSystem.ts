import { useSettingsStore, soundVolume } from '@/store/settingsStore'

/**
 * The village's sound: one Web Audio graph with a music and an effects channel, both following
 * 설정 › 사운드. Everything is synthesised (soft bells, a music box), so there are no audio files
 * to download or license; a recorded track can later be fed into `musicBus` the same way.
 *
 * Browsers (iOS Safari most of all) only allow sound after a tap, so the context is created and
 * unlocked on the first pointer or key press.
 */

export type Sfx = 'tap' | 'open' | 'close' | 'select' | 'coin' | 'save' | 'error' | 'place' | 'recall' | 'equip' | 'page' | 'toggle'
  | 'dock' | 'hop'

let ctx: AudioContext | null = null
let master: GainNode
let musicBus: GainNode
let effectsBus: GainNode
/** Reverb inputs, one per channel, so the ring-out follows that channel's volume and mute too. */
let musicReverb: GainNode
let reverbSend: GainNode
let onReady: Array<(ctx: AudioContext) => void> = []

/** A short, soft room so bells ring out instead of stopping dead. */
function makeImpulse(context: AudioContext, seconds: number, decay: number) {
  const length = Math.floor(context.sampleRate * seconds)
  const buffer = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
  }
  return buffer
}

function applyVolumes(ramp = 0.15) {
  if (!ctx) return
  const now = ctx.currentTime
  musicBus.gain.setTargetAtTime(soundVolume('music'), now, ramp)
  effectsBus.gain.setTargetAtTime(soundVolume('effects'), now, ramp / 3)
}

function create() {
  const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioContextClass) return
  ctx = new AudioContextClass()
  master = ctx.createGain()
  // Keeps stacked bells from clipping.
  const limiter = ctx.createDynamicsCompressor()
  limiter.threshold.value = -10
  limiter.ratio.value = 6
  master.connect(limiter).connect(ctx.destination)
  musicBus = ctx.createGain()
  effectsBus = ctx.createGain()
  musicBus.gain.value = 0
  effectsBus.gain.value = 0
  musicBus.connect(master)
  effectsBus.connect(master)
  const room = makeImpulse(ctx, 2.4, 3)
  const reverbInto = (bus: GainNode) => {
    const send = ctx!.createGain()
    send.gain.value = 0.32
    const convolver = ctx!.createConvolver()
    convolver.buffer = room
    send.connect(convolver).connect(bus)
    return send
  }
  reverbSend = reverbInto(effectsBus)
  musicReverb = reverbInto(musicBus)
  applyVolumes(0.01)
  if (import.meta.env.DEV) {
    // Lets the checks hear whether anything is playing.
    const meter = ctx.createAnalyser()
    meter.fftSize = 2048
    limiter.connect(meter)
    const samples = new Float32Array(meter.fftSize)
    Object.assign(window, { __audio: { ctx, level: () => {
      meter.getFloatTimeDomainData(samples)
      return Math.max(...samples.map(Math.abs))
    } } })
  }
  for (const ready of onReady) ready(ctx)
  onReady = []
}

/** Call once at start-up: unlocks sound on the first tap and follows the settings and the tab. */
export function initAudio() {
  const unlock = () => {
    if (!ctx) create()
    if (!ctx) return
    // iOS needs a sound started inside the gesture itself.
    const silent = ctx.createBufferSource()
    silent.buffer = ctx.createBuffer(1, 1, 22050)
    silent.connect(ctx.destination)
    silent.start()
    void ctx.resume()
    if (ctx.state === 'running') {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
    }
  }
  window.addEventListener('pointerdown', unlock, true)
  window.addEventListener('keydown', unlock, true)
  // Quiet in the background (another app, a locked phone), back on return.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) void ctx.suspend()
    else void ctx.resume()
  })
  useSettingsStore.subscribe((state, prev) => {
    if (state.muted !== prev.muted || state.masterVolume !== prev.masterVolume
      || state.musicVolume !== prev.musicVolume || state.effectsVolume !== prev.effectsVolume) applyVolumes()
  })
}

/** Runs `fn` with the audio context once the player has tapped (right away if they already have). */
export function whenAudioReady(fn: (ctx: AudioContext, music: AudioNode, reverb: AudioNode) => void) {
  const run = (context: AudioContext) => fn(context, musicBus, musicReverb)
  if (ctx) run(ctx)
  else onReady.push(run)
}

const midiToHz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

/**
 * A small struck bell / music-box tine: a sine with a quiet octave and a slightly sharp twelfth
 * that fade faster than the fundamental.
 */
export function bell(context: AudioContext, out: AudioNode, send: AudioNode | null, midi: number, at: number,
  { gain = 0.25, decay = 1.2, bright = 1 } = {}) {
  const hz = midiToHz(midi)
  const voice = context.createGain()
  voice.gain.setValueAtTime(0, at)
  voice.gain.linearRampToValueAtTime(gain, at + 0.004)
  voice.gain.exponentialRampToValueAtTime(0.0001, at + decay)
  const tone = context.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = Math.min(12000, hz * 6 * bright)
  voice.connect(tone).connect(out)
  if (send) tone.connect(send)
  const partials: Array<[number, number, number]> = [[1, 1, 1], [2, 0.28 * bright, 0.45], [3.01, 0.12 * bright, 0.25]]
  for (const [ratio, level, life] of partials) {
    const osc = context.createOscillator()
    osc.frequency.value = hz * ratio
    const g = context.createGain()
    g.gain.setValueAtTime(level, at)
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay * life)
    osc.connect(g).connect(voice)
    osc.start(at)
    osc.stop(at + decay + 0.05)
  }
}

/** A soft rounded blip, for taps and toggles. */
function blip(context: AudioContext, out: AudioNode, from: number, to: number, at: number, length: number, gain: number,
  type: OscillatorType = 'sine') {
  const osc = context.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(from, at)
  osc.frequency.exponentialRampToValueAtTime(to, at + length)
  const g = context.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(gain, at + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, at + length)
  osc.connect(g).connect(out)
  osc.start(at)
  osc.stop(at + length + 0.02)
}

/** A short filtered noise puff: grass, cloth, a page turning. */
function puff(context: AudioContext, out: AudioNode, at: number, length: number, gain: number, from: number, to: number) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const source = context.createBufferSource()
  source.buffer = buffer
  const filter = context.createBiquadFilter()
  filter.type = 'bandpass'
  filter.Q.value = 0.8
  filter.frequency.setValueAtTime(from, at)
  filter.frequency.exponentialRampToValueAtTime(to, at + length)
  const g = context.createGain()
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(gain, at + length * 0.3)
  g.gain.exponentialRampToValueAtTime(0.0001, at + length)
  source.connect(filter).connect(g).connect(out)
  source.start(at)
}

let lastPlayed = 0

/** Plays one sound effect. Silent until the first tap, when muted or at zero volume. */
export function playSfx(name: Sfx) {
  if (!ctx || ctx.state !== 'running' || soundVolume('effects') <= 0) return
  lastPlayed = performance.now()
  const c = ctx
  const t = c.currentTime + 0.005
  const out = effectsBus
  const send = reverbSend
  switch (name) {
    case 'tap': blip(c, out, 880, 620, t, 0.07, 0.12); break
    case 'toggle': blip(c, out, 1200, 900, t, 0.05, 0.09, 'triangle'); break
    case 'open': bell(c, out, send, 79, t, { gain: 0.14, decay: 0.7 }); bell(c, out, send, 84, t + 0.07, { gain: 0.14, decay: 0.9 }); break
    case 'close': bell(c, out, send, 84, t, { gain: 0.1, decay: 0.5 }); bell(c, out, send, 79, t + 0.06, { gain: 0.1, decay: 0.6 }); break
    case 'select': blip(c, out, 520, 780, t, 0.12, 0.14); bell(c, out, send, 88, t + 0.05, { gain: 0.1, decay: 0.8 }); break
    case 'page': puff(c, out, t, 0.22, 0.12, 2400, 900); break
    case 'equip': puff(c, out, t, 0.18, 0.14, 1600, 3200); bell(c, out, send, 91, t + 0.08, { gain: 0.07, decay: 0.5 }); break
    case 'coin':
      bell(c, out, send, 83, t, { gain: 0.16, decay: 0.25, bright: 1.6 })
      bell(c, out, send, 88, t + 0.08, { gain: 0.18, decay: 0.9, bright: 1.6 })
      break
    case 'save':
      [72, 76, 79, 84].forEach((m, i) => bell(c, out, send, m, t + i * 0.09, { gain: 0.15, decay: 1.4 }))
      bell(c, out, send, 88, t + 0.4, { gain: 0.11, decay: 1.8 })
      break
    case 'error': blip(c, out, 330, 300, t, 0.12, 0.13, 'triangle'); blip(c, out, 262, 240, t + 0.13, 0.16, 0.13, 'triangle'); break
    case 'place': blip(c, out, 220, 110, t, 0.16, 0.3); puff(c, out, t, 0.14, 0.12, 900, 300); break
    case 'recall': blip(c, out, 330, 660, t, 0.14, 0.14); puff(c, out, t, 0.12, 0.08, 600, 1800); break
    // The boat bumps the dock: a wooden knock and a ship's bell, "통".
    case 'dock':
      blip(c, out, 150, 70, t, 0.22, 0.32)
      puff(c, out, t, 0.1, 0.1, 700, 250)
      bell(c, out, send, 67, t + 0.04, { gain: 0.16, decay: 2.2, bright: 0.8 })
      bell(c, out, send, 74, t + 0.04, { gain: 0.06, decay: 1.6, bright: 0.8 })
      break
    // A little jump onto the planks.
    case 'hop': blip(c, out, 420, 900, t, 0.16, 0.12, 'triangle'); blip(c, out, 140, 90, t + 0.5, 0.1, 0.18); break
  }
}

/**
 * The sea while the boat is out: filtered noise that swells slowly like waves on the shore.
 * Returns a function that fades it out again.
 */
export function playWaves(): () => void {
  if (!ctx || ctx.state !== 'running') return () => {}
  const c = ctx
  const buffer = c.createBuffer(1, c.sampleRate * 3, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const noise = c.createBufferSource()
  noise.buffer = buffer
  noise.loop = true
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 520
  const level = c.createGain()
  level.gain.setValueAtTime(0, c.currentTime)
  level.gain.linearRampToValueAtTime(0.11, c.currentTime + 2)
  // Each wave rolls in and out over about seven seconds.
  const swell = c.createOscillator()
  swell.frequency.value = 0.14
  const depth = c.createGain()
  depth.gain.value = 0.06
  swell.connect(depth).connect(level.gain)
  noise.connect(filter).connect(level).connect(effectsBus)
  noise.start()
  swell.start()
  return () => {
    const now = c.currentTime
    level.gain.cancelScheduledValues(now)
    level.gain.setValueAtTime(level.gain.value, now)
    level.gain.linearRampToValueAtTime(0, now + 2.5)
    noise.stop(now + 2.6)
    swell.stop(now + 2.6)
  }
}

/** Milliseconds since the last effect, so the generic button tap can step aside for a specific one. */
export const sinceLastSfx = () => performance.now() - lastPlayed
