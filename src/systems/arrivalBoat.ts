import * as THREE from 'three'
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { playSfx, playWaves } from '@/systems/audioSystem'
import { useSettingsStore } from '@/store/settingsStore'

/**
 * 배 도착: a small sailboat brings the day's character to the dock on the north shore.
 *
 * The dock (public/assets/village/arrival/dock.glb) is exported in village coordinates and simply
 * stays in the scene. The boat sails in along the shore from the east so its sail is seen from
 * the side, ties up across the end of the dock, waits, and sails off to the west.
 * Made in diary-village/arrival_dock_boat.blend (scripts/blender/export_arrival.py).
 */

const SEA_Y = -0.08
/**
 * The boat floats a little high, so that even rocking on the swell its floor stays above the sea
 * (the sea is one flat plane and would otherwise show inside the boat).
 */
const BOAT_LIFT = 0.16
/** Where the boat ties up: across the end of the dock, bow to the west. */
export const BOAT_MOORING = new THREE.Vector3(-9, SEA_Y, -47.65)
/** The end of the dock, where a passenger steps off. */
export const DOCK_LANDING = new THREE.Vector3(-9, 0.32, -45.9)
/**
 * From the dock to the lawn: down the dock, between two trees, through the gap in the north
 * fences (clear of the lamp post) and onto the back lawn. Checked in Blender against the village.
 */
export const ARRIVAL_WALK: readonly THREE.Vector3[] = [
  DOCK_LANDING,
  new THREE.Vector3(-9, 0.32, -38.6),
  new THREE.Vector3(-9, 0.02, -37.6),
  new THREE.Vector3(-7.65, 0, -31),
  new THREE.Vector3(-7.65, 0, -26.5),
  new THREE.Vector3(-5, 0, -17.8),
]
/** Where the passenger stands in the boat, in the boat's own space (behind the mast, on the floor). */
const SEAT = new THREE.Vector3(0, 0.06, 0.2)

const IN = { from: new THREE.Vector3(26, SEA_Y, -53), via: new THREE.Vector3(8, SEA_Y, -48.6), seconds: 7 }
const OUT = { via: new THREE.Vector3(-22, SEA_Y, -47.9), to: new THREE.Vector3(-38, SEA_Y, -51), seconds: 6 }
/** How long the boat waits at the dock when nobody asks it to leave. */
const WAIT_SECONDS = 3.5

type Phase = 'away' | 'arriving' | 'moored' | 'leaving'

const bezier = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, t: number, out: THREE.Vector3) => {
  const u = 1 - t
  return out.set(0, 0, 0).addScaledVector(a, u * u).addScaledVector(b, 2 * u * t).addScaledVector(c, t * t)
}
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
const easeIn = (t: number) => t * t

/** A few rings spreading behind the stern while the boat moves. */
function makeWake(scene: THREE.Scene) {
  const rings = Array.from({ length: 6 }, () => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.56, 40),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, opacity: 0 }))
    ring.rotation.x = -Math.PI / 2
    ring.visible = false
    scene.add(ring)
    return { ring, age: 1 }
  })
  let next = 0
  let timer = 0
  return {
    update(delta: number, stern: THREE.Vector3 | null) {
      timer += delta
      if (stern && timer > 0.35) {
        timer = 0
        const wake = rings[next++ % rings.length]
        wake.age = 0
        wake.ring.position.set(stern.x, SEA_Y + 0.03, stern.z)
        wake.ring.visible = true
      }
      for (const wake of rings) {
        if (!wake.ring.visible) continue
        wake.age += delta / 1.8
        if (wake.age >= 1) { wake.ring.visible = false; continue }
        wake.ring.scale.setScalar(1 + wake.age * 2.2)
        ;(wake.ring.material as THREE.MeshBasicMaterial).opacity = 0.32 * (1 - wake.age) * (1 - wake.age)
      }
    },
    dispose() {
      for (const { ring } of rings) {
        scene.remove(ring)
        ring.geometry.dispose()
        ;(ring.material as THREE.Material).dispose()
      }
    },
  }
}

export interface Arrival {
  /** Sails the boat in with a sail of this colour; it leaves by itself unless `hold` is set. */
  play: (sailColor: string, options?: { hold?: boolean }) => void
  /** Sends a held boat on its way. */
  leave: () => void
  /** Brings an arriving boat straight to the dock. */
  skip: () => void
  /** Where the passenger stands right now, and which way the boat points. */
  seat: (out: THREE.Vector3) => number
  phase: () => Phase
  /** The boat while it is in view, for the camera to watch. */
  boatPosition: () => THREE.Vector3 | null
  update: (time: number, delta: number) => void
  dispose: () => void
}

export async function createArrival(scene: THREE.Scene, loader: GLTFLoader): Promise<Arrival> {
  const [dockFile, boatFile] = await Promise.all([
    loader.loadAsync('/assets/village/arrival/dock.glb'),
    loader.loadAsync('/assets/village/arrival/boat.glb'),
  ])
  const dock = dockFile.scene
  dock.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
  })
  scene.add(dock)

  const boat = boatFile.scene
  let sail: THREE.MeshStandardMaterial | null = null
  boat.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    const material = mesh.material as THREE.MeshStandardMaterial
    if (material.name === 'Boat sail') {
      sail = material.clone()
      sail.side = THREE.DoubleSide
      mesh.material = sail
    }
  })
  boat.visible = false
  boat.rotation.order = 'YXZ'
  scene.add(boat)
  const wake = makeWake(scene)

  let phase: Phase = 'away'
  let stopWaves: (() => void) | null = null
  let clock = 0
  let hold = false
  let heading = Math.PI / 2
  const position = new THREE.Vector3()
  const ahead = new THREE.Vector3()
  const stern = new THREE.Vector3()
  const leaveFrom = new THREE.Vector3()

  const headTowards = (from: THREE.Vector3, to: THREE.Vector3) => {
    const dx = to.x - from.x
    const dz = to.z - from.z
    // The model's bow looks along -Z.
    if (Math.hypot(dx, dz) > 1e-4) heading = Math.atan2(-dx, -dz)
  }

  return {
    play(color, options = {}) {
      if (sail) sail.color.set(color).lerp(new THREE.Color('#ffffff'), 0.25)
      hold = !!options.hold
      phase = 'arriving'
      clock = 0
      boat.visible = true
      stopWaves?.()
      stopWaves = playWaves()
    },
    leave() {
      if (phase === 'moored' || phase === 'arriving') hold = false
    },
    skip() {
      if (phase === 'arriving') clock = IN.seconds
    },
    seat(out) {
      boat.updateMatrixWorld()
      out.copy(SEAT).applyMatrix4(boat.matrixWorld)
      return heading
    },
    phase: () => phase,
    boatPosition: () => (phase === 'away' ? null : position),
    update(time, delta) {
      if (phase === 'away') { wake.update(delta, null); return }
      clock += delta
      let moving = false
      if (phase === 'arriving') {
        const t = Math.min(1, clock / IN.seconds)
        const eased = easeOut(t)
        bezier(IN.from, IN.via, BOAT_MOORING, eased, position)
        bezier(IN.from, IN.via, BOAT_MOORING, Math.min(1, eased + 0.01), ahead)
        if (t < 0.98) headTowards(position, ahead)
        moving = t < 0.85
        if (t >= 1) { phase = 'moored'; clock = 0; playSfx('dock') }
      } else if (phase === 'moored') {
        position.copy(BOAT_MOORING)
        if (!hold && clock > WAIT_SECONDS) { phase = 'leaving'; clock = 0; leaveFrom.copy(position) }
      } else {
        const t = Math.min(1, clock / OUT.seconds)
        const eased = easeIn(t)
        bezier(leaveFrom, OUT.via, OUT.to, eased, position)
        bezier(leaveFrom, OUT.via, OUT.to, Math.min(1, eased + 0.01), ahead)
        headTowards(position, ahead)
        moving = t > 0.08
        if (t >= 1) { phase = 'away'; boat.visible = false; stopWaves?.(); stopWaves = null }
      }
      // Bobbing on the swell, a little more while under way (still when the water is still).
      const sway = !useSettingsStore.getState().waterMotion ? 0 : moving ? 1.4 : 1
      boat.position.set(position.x, SEA_Y + BOAT_LIFT + 0.03 * sway * Math.sin(time * 1.7), position.z)
      boat.rotation.set(0.02 * sway * Math.sin(time * 1.3), heading, 0.03 * sway * Math.sin(time * 1.1 + 1))
      stern.set(Math.sin(heading) * 1.7, 0, Math.cos(heading) * 1.7).add(position)
      wake.update(delta, moving ? stern : null)
    },
    dispose() {
      stopWaves?.()
      wake.dispose()
      scene.remove(dock, boat)
      for (const root of [dock, boat]) {
        root.traverse((o) => {
          const mesh = o as THREE.Mesh
          if (!mesh.isMesh) return
          mesh.geometry.dispose()
          for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) m.dispose()
        })
      }
    },
  }
}
