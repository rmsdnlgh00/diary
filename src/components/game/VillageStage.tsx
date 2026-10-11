import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { StageCharacter } from './ThreeStage'
import { MALE_WALK_STRIDE } from '@/systems/walkSystem'
import { VILLAGE_CAMERA, VILLAGE_CHARACTER_HEIGHT, VILLAGE_VIEW_DISTANCE,
  VILLAGE_WIDTH, villageGround, villagePoint } from '@/systems/villageLayout'

export type VillageView = 'whole' | 'basic' | 'follow'
/** A placed decoration in village coordinates (0–1 over the lawn). */
export interface StageDecoration {
  id: string
  itemId: string
  x: number
  y: number
}
interface Props {
  characters: readonly StageCharacter[]
  decorations: readonly StageDecoration[]
  view: VillageView
  focusId: string | null
  onSelect: (id: string) => void
  onGround: (point: { x: number; y: number }) => void
}
interface Instance {
  object: THREE.Object3D
  mixer: THREE.AnimationMixer
  walk: THREE.AnimationAction
  idle: THREE.AnimationAction
  blend: number
  angle: number
  lastDistance: number
}

/** Flat village parts that only receive shadows. */
const FLAT_PARTS = /Ground|Sea|River|Path|Pond|Stepping|Lawn_Flowers/
/** Pastel lighting tuned so the lawn renders close to the painting's #C8D078. */
const SUN_INTENSITY = 2.2
const SKY_INTENSITY = 1.6
const CAMERA_OFFSET = VILLAGE_CAMERA.position.clone().sub(VILLAGE_CAMERA.target)
/** Light aerial haze: only the far trees and sea fade a little, like the painting. */
const HAZE = { color: '#dcebf2', near: 70, far: 260 }

const WATER_MATERIALS = new Set(['V4 water', 'V4 sea'])

/**
 * Clear, painted-looking water. Blender stores a "Water Depth" colour on the pond and
 * river (0 at the shore → 1 in the middle): shallow aqua fades into the base blue, with
 * a soft foam line at the shore, slowly drifting light ripples and small sun glints.
 * The sea has no depth data, so it stays deep and only gets ripples and glints.
 */
function makeWater(base: THREE.MeshStandardMaterial, hasDepth: boolean, time: { value: number }) {
  const water = new THREE.MeshStandardMaterial({ color: base.color, roughness: 0.12, metalness: 0, vertexColors: hasDepth })
  water.name = base.name
  water.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time
    shader.uniforms.uShallow = { value: new THREE.Color('#a8e7ef') }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWaterPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWaterPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec3 uShallow;\nvarying vec3 vWaterPos;')
      .replace('#include <color_fragment>', `
        float depth = 1.0;
        #if defined( USE_COLOR_ALPHA ) || defined( USE_COLOR )
          depth = vColor.r;
        #endif
        vec2 wp = vWaterPos.xz;
        float ripple = sin(wp.x * 1.6 + uTime * 0.7 + sin(wp.y * 1.2 + uTime * 0.4) * 1.6)
          * sin(wp.y * 2.0 - uTime * 0.55 + sin(wp.x * 0.8) * 1.3);
        vec3 waterColor = mix(uShallow, diffuseColor.rgb, smoothstep(0.0, 1.0, depth));
        waterColor += smoothstep(0.45, 0.95, ripple) * 0.07;
        float foam = 1.0 - smoothstep(0.0, 0.14, depth);
        diffuseColor.rgb = mix(waterColor, vec3(0.96, 0.99, 1.0), foam * 0.6);
      `)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float glint = sin(wp.x * 4.1 + uTime * 1.3 + sin(wp.y * 1.7) * 2.0)
          * sin(wp.y * 3.7 - uTime * 1.1 + sin(wp.x * 1.3 + uTime * 0.3) * 2.0);
        totalEmissiveRadiance += vec3(pow(max(glint, 0.0), 40.0) * 0.3);`)
  }
  return water
}

/** Phones and small screens skip ambient occlusion and use a smaller shadow map. */
function isLowPower(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 600
}

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  root.traverse((object) => {
    const mesh = object as THREE.Mesh
    if (!mesh.isMesh) return
    geometries.add(mesh.geometry)
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value)
    }
  })
  geometries.forEach((g) => g.dispose())
  materials.forEach((m) => m.dispose())
  textures.forEach((t) => t.dispose())
}

export function VillageStage(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const dataRef = useRef(props)
  dataRef.current = props
  const [status, setStatus] = useState('마을을 불러오는 중이에요…')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true }) }
    catch {
      setStatus('3D 화면을 열 수 없어요. 기존 마을로 전환해 주세요.')
      setFailed(true)
      return
    }
    const lowPower = isLowPower()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    host.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#9fd0e6')
    scene.fog = new THREE.Fog(HAZE.color, HAZE.near, HAZE.far)
    const camera = new THREE.PerspectiveCamera(VILLAGE_CAMERA.fov, 16 / 9, 0.5, 600)
    // Soft warm sun from the upper left, matching Blender's "V4 Soft Sun" direction.
    const key = new THREE.DirectionalLight(new THREE.Color(1, 0.95, 0.86), SUN_INTENSITY)
    key.position.set(-0.551, 0.636, 0.54).multiplyScalar(80).add(VILLAGE_CAMERA.target)
    key.target.position.copy(VILLAGE_CAMERA.target)
    key.castShadow = true
    key.shadow.mapSize.setScalar(lowPower ? 2048 : 4096)
    // Covers everything the legacy view can see (about 50 × 46 units of ground).
    Object.assign(key.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 })
    key.shadow.bias = -0.0003
    key.shadow.normalBias = 0.035
    key.shadow.radius = 4
    scene.add(key, key.target, new THREE.HemisphereLight(new THREE.Color(0.78, 0.86, 0.95), 0xd9d3a8, SKY_INTENSITY))
    // Soft contact shadows under trees, fences and characters (desktop only).
    let composer: EffectComposer | null = null
    let ambientOcclusion: GTAOPass | null = null
    if (!lowPower) {
      composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType }))
      composer.addPass(new RenderPass(scene, camera))
      ambientOcclusion = new GTAOPass(scene, camera, 1, 1)
      ambientOcclusion.blendIntensity = 0.6
      ambientOcclusion.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.5, thickness: 1.5, scale: 1, samples: 8 })
      composer.addPass(ambientOcclusion)
      composer.addPass(new OutputPass())
    }
    const instances = new Map<string, Instance>()
    const waterTime = { value: 0 }
    const draco = new DRACOLoader().setDecoderPath('/draco/').setDecoderConfig({ type: 'wasm' })
    const loader = new GLTFLoader().setDRACOLoader(draco)
    let disposed = false
    let terrain: THREE.Object3D | null = null
    let template: THREE.Group | null = null
    let walkClip: THREE.AnimationClip | null = null
    let idleClip: THREE.AnimationClip | null = null
    let decorationAsset: THREE.Object3D | null = null
    /** One model per shop item, keyed by item id ("Deco flower_pot" → "flower_pot"). */
    const decorationModels = new Map<string, THREE.Object3D>()
    const placed = new Map<string, { itemId: string; object: THREE.Object3D }>()
    const load = async () => {
      try {
        const [village, walk, idle, decorationsFile] = await Promise.all([
          loader.loadAsync('/assets/village/diary-village-v4.glb'),
          // Light copies made in Blender: 9.4k instead of 31k triangles, JPEG texture, and
          // an idle file that only carries the animation. Bones and tracks match the originals.
          loader.loadAsync('/assets/characters/male/character-walk-light.glb'),
          loader.loadAsync('/assets/characters/male/character-idle-anim.glb'),
          loader.loadAsync('/assets/village/decorations-v1.glb'),
        ])
        if (disposed) {
          for (const asset of [village, walk, idle, decorationsFile]) disposeObject(asset.scene)
          return
        }
        decorationAsset = decorationsFile.scene
        for (const model of [...decorationAsset.children]) {
          model.position.set(0, 0, 0)
          model.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = o.receiveShadow = true })
          decorationModels.set(model.name.replace(/^Deco_/, ''), model)
        }
        terrain = village.scene
        terrain.traverse((o) => {
          const mesh = o as THREE.Mesh
          if (!mesh.isMesh) return
          // Multi-material meshes arrive as a group, so check the parent's name as well.
          const name = `${mesh.name} ${mesh.parent?.name ?? ''}`
          mesh.castShadow = !FLAT_PARTS.test(name)
          mesh.receiveShadow = true
          const material = mesh.material as THREE.MeshStandardMaterial
          if (WATER_MATERIALS.has(material.name)) {
            mesh.material = makeWater(material, 'color' in mesh.geometry.attributes, waterTime)
            material.dispose()
          } else if (material.vertexColors) {
            // Only water uses the exported "Water Depth" colours; the pond stones must not.
            material.vertexColors = false
            material.needsUpdate = true
          }
        })
        scene.add(terrain)
        walkClip = walk.animations[0] ?? null
        idleClip = idle.animations[0]?.clone() ?? null
        if (!walkClip || !idleClip) throw new Error('Character animation missing')
        for (const track of idleClip.tracks) track.name = track.name.replace(/_\d+(?=\.)/, '')
        const raw = walk.scene
        const box = new THREE.Box3().setFromObject(raw)
        const factor = VILLAGE_CHARACTER_HEIGHT / (box.max.y - box.min.y)
        raw.scale.setScalar(factor)
        raw.position.y = -box.min.y * factor
        raw.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true })
        template = new THREE.Group()
        template.add(raw)
        disposeObject(idle.scene)
        setStatus('')
        if (import.meta.env.DEV) Object.assign(window, { __village: { scene, camera, renderer, instances, lowPower } })
      } catch (error) {
        if (!disposed) {
          console.error('[VillageStage] 마을 로드 실패', error)
          setStatus('마을을 불러오지 못했어요. 새로고침하거나 기존 마을로 전환해 주세요.')
          setFailed(true)
        }
      }
    }
    void load()
    const resize = () => {
      if (!host.clientWidth || !host.clientHeight) return
      camera.aspect = host.clientWidth / host.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(host.clientWidth, host.clientHeight, false)
      if (composer) {
        composer.setPixelRatio(renderer.getPixelRatio())
        composer.setSize(host.clientWidth, host.clientHeight)
      }
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    const raycaster = new THREE.Raycaster()
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const click = (event: PointerEvent) => {
      const box = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(
        (event.clientX - box.left) / box.width * 2 - 1,
        1 - (event.clientY - box.top) / box.height * 2,
      ), camera)
      const hits = raycaster.intersectObjects([...instances.values()].map((i) => i.object), true)
      if (hits.length) {
        let object: THREE.Object3D | null = hits[0].object
        while (object && !object.userData.characterId) object = object.parent
        if (object) dataRef.current.onSelect(object.userData.characterId as string)
        return
      }
      const point = raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3())
      if (point) dataRef.current.onGround(villagePoint(point))
    }
    renderer.domElement.addEventListener('pointerup', click)
    /** Adds, moves and removes decoration models to match the placed list. */
    const syncDecorations = (decorations: readonly StageDecoration[]) => {
      const ids = new Set(decorations.map((d) => d.id))
      for (const [id, entry] of placed) if (!ids.has(id)) {
        scene.remove(entry.object)
        placed.delete(id)
      }
      for (const d of decorations) {
        let entry = placed.get(d.id)
        if (entry && entry.itemId !== d.itemId) {
          scene.remove(entry.object)
          entry = undefined
        }
        if (!entry) {
          const model = decorationModels.get(d.itemId)
          if (!model) continue
          entry = { itemId: d.itemId, object: model.clone() }
          entry.object.userData.decorationId = d.id
          scene.add(entry.object)
          placed.set(d.id, entry)
        }
        entry.object.position.copy(villageGround(d.x, d.y))
      }
    }
    const focus = VILLAGE_CAMERA.target.clone()
    let distance = 1
    let raf = 0
    let previous = performance.now()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      waterTime.value = now / 1000
      const delta = Math.min(0.05, (now - previous) / 1000)
      previous = now
      const { characters, decorations, view, focusId } = dataRef.current
      if (decorationModels.size) syncDecorations(decorations)
      if (template && walkClip && idleClip) {
        const ids = new Set(characters.map((c) => c.id))
        for (const [id, instance] of instances) if (!ids.has(id)) {
          instance.mixer.stopAllAction()
          instance.mixer.uncacheRoot(instance.object)
          scene.remove(instance.object)
          instances.delete(id)
        }
        for (const c of characters) {
          let inst = instances.get(c.id)
          if (!inst) {
            const object = cloneSkinned(template)
            object.userData.characterId = c.id
            scene.add(object)
            const mixer = new THREE.AnimationMixer(object)
            const walk = mixer.clipAction(walkClip).setEffectiveWeight(0).play()
            const idle = mixer.clipAction(idleClip).setEffectiveWeight(1).play()
            inst = { object, mixer, walk, idle, blend: 0, angle: 0, lastDistance: c.walkDistance }
            instances.set(c.id, inst)
          }
          const p = villageGround(c.x, c.y)
          inst.object.position.copy(p)
          const moving = c.phase === 'WALK'
          const moved = Math.max(0, c.walkDistance - inst.lastDistance)
          inst.lastDistance = c.walkDistance
          const speed = delta > 0 ? moved * VILLAGE_WIDTH / delta : 0
          inst.walk.timeScale = Math.max(0.001, speed / (MALE_WALK_STRIDE * 2 * VILLAGE_WIDTH) * walkClip.duration)
          inst.blend += ((moving ? 1 : 0) - inst.blend) * Math.min(1, delta / 0.25)
          inst.walk.setEffectiveWeight(inst.blend)
          inst.idle.setEffectiveWeight(1 - inst.blend)
          if (moving) {
            const destination = villageGround(c.targetX, c.targetY)
            const angle = Math.atan2(destination.x - p.x, destination.z - p.z)
            const difference = Math.atan2(Math.sin(angle - inst.angle), Math.cos(angle - inst.angle))
            inst.angle += difference * Math.min(1, 9 * delta)
          }
          inst.object.rotation.y = inst.angle
          inst.mixer.update(delta)
        }
      }
      const tracked = characters.find((c) => c.id === focusId) ?? characters[0]
      // Every view keeps the legacy angle; only the look-at point and distance change.
      const target = view === 'whole' ? VILLAGE_CAMERA.target
        : view === 'follow' && tracked ? villageGround(tracked.x, tracked.y) : villageGround(0.5, 0.5)
      const ease = Math.min(1, delta * 6)
      focus.lerp(target, ease)
      distance += (VILLAGE_VIEW_DISTANCE[view] - distance) * ease
      camera.position.copy(focus).addScaledVector(CAMERA_OFFSET, distance)
      camera.lookAt(focus)
      camera.updateMatrixWorld()
      if (composer) composer.render(delta)
      else renderer.render(scene, camera)
    }
    tick()
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerup', click)
      for (const instance of instances.values()) {
        instance.mixer.stopAllAction()
        instance.mixer.uncacheRoot(instance.object)
      }
      if (template) disposeObject(template)
      if (terrain) disposeObject(terrain)
      // Placed decorations are clones that share these geometries and materials.
      if (decorationAsset) disposeObject(decorationAsset)
      key.shadow.map?.dispose()
      ambientOcclusion?.dispose()
      composer?.dispose()
      draco.dispose()
      renderer.dispose()
      host.removeChild(renderer.domElement)
      if (import.meta.env.DEV) Reflect.deleteProperty(window, '__village')
    }
  }, [])

  return <>
    <div ref={hostRef} className="village-stage" aria-label="3D 감정일기 마을" />
    {status && <p className="village-status" role={failed ? 'alert' : 'status'}>{status}</p>}
  </>
}
