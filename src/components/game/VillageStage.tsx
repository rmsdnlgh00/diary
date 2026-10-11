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
import { ITEMS } from '@/data/items'
import { MALE_WALK_STRIDE } from '@/systems/walkSystem'
import { DECORATION_RADIUS, VILLAGE_CAMERA, VILLAGE_CENTER, VILLAGE_CHARACTER_HEIGHT, VILLAGE_POND, VILLAGE_VIEW_DISTANCE,
  VILLAGE_DEPTH, VILLAGE_WALKABLE_AREAS, VILLAGE_WIDTH, FLOOR_TILE_SIZE, isFloorDecoration, snapDecoration, villageGround,
  villagePoint } from '@/systems/villageLayout'

export type VillageView = 'whole' | 'basic' | 'follow'
/** A placed decoration in village coordinates (0–1 over the lawn). */
export interface StageDecoration {
  id: string
  itemId: string
  x: number
  y: number
}
/** Decorating state: the item being placed or moved follows the pointer as a ghost. */
export interface StageDecorating {
  selectedId: string | null
  placing: { itemId: string; movingId?: string } | null
  canPlace: (itemId: string, point: { x: number; y: number }, movingId?: string) => boolean
  onSelectDecoration: (id: string) => void
  onMoveDecoration: (id: string, point: { x: number; y: number }) => void
}
interface Props {
  characters: readonly StageCharacter[]
  decorations: readonly StageDecoration[]
  /** Set while the decorate panel is open. */
  decorating: StageDecorating | null
  view: VillageView
  cameraResetKey: number
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
  /** Item ids currently worn, joined, and the clothing objects added for them. */
  outfitKey: string
  outfit: THREE.Object3D[]
}

/**
 * Clothes from clothes-v1.glb (scripts/export-clothes.py), by item id. Tops and bottoms are
 * skinned to the same armature as the character, so they are re-bound to each character's
 * own bones; hats, hoods and buttons hang from a bone and are cloned onto that bone.
 */
type ClothingPart = { skinned: THREE.SkinnedMesh } | { rigid: THREE.Object3D; bone: string }
const ITEM_IDS = ITEMS.map((item) => item.id).sort((a, b) => b.length - a.length)

function collectClothes(root: THREE.Object3D): Map<string, ClothingPart[]> {
  const clothes = new Map<string, ClothingPart[]>()
  root.traverse((object) => {
    // Node names arrive sanitised: "Cloth hoodie_gray hood" → "Cloth_hoodie_gray_hood".
    if (!object.name.startsWith('Cloth_') || object.parent?.name.startsWith('Cloth_')) return
    const rest = object.name.slice('Cloth_'.length)
    const id = ITEM_IDS.find((itemId) => rest === itemId || rest.startsWith(`${itemId}_`))
    if (!id) return
    const parts = clothes.get(id) ?? []
    const skinned: THREE.SkinnedMesh[] = []
    object.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(o as THREE.SkinnedMesh) })
    if (skinned.length) parts.push(...skinned.map((mesh) => ({ skinned: mesh })))
    else if (object.parent) parts.push({ rigid: object, bone: object.parent.name })
    clothes.set(id, parts)
  })
  return clothes
}

/** Swap what a character wears: remove the old clothing objects, bind the new ones to its bones. */
function dress(instance: Instance, ids: readonly string[], clothes: Map<string, ClothingPart[]>) {
  for (const object of instance.outfit) object.removeFromParent()
  instance.outfit = []
  let body: THREE.SkinnedMesh | null = null
  instance.object.traverse((o) => { if (!body && (o as THREE.SkinnedMesh).isSkinnedMesh) body = o as THREE.SkinnedMesh })
  const skinnedBody = body as THREE.SkinnedMesh | null
  if (!skinnedBody?.parent) return
  const bones = new Map(skinnedBody.skeleton.bones.map((bone) => [bone.name, bone]))
  for (const id of ids) {
    for (const part of clothes.get(id) ?? []) {
      if ('skinned' in part) {
        const source = part.skinned
        const mapped = source.skeleton.bones.map((bone) => bones.get(bone.name))
        if (mapped.some((bone) => !bone)) continue
        const mesh = new THREE.SkinnedMesh(source.geometry, source.material)
        mesh.name = source.name
        source.updateMatrix()
        mesh.matrix.copy(source.matrix).decompose(mesh.position, mesh.quaternion, mesh.scale)
        skinnedBody.parent.add(mesh)
        mesh.bind(new THREE.Skeleton(mapped as THREE.Bone[], source.skeleton.boneInverses), source.bindMatrix)
        mesh.castShadow = true
        mesh.frustumCulled = false
        instance.outfit.push(mesh)
      } else {
        const bone = bones.get(part.bone)
        if (!bone) continue
        const object = part.rigid.clone()
        object.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true })
        bone.add(object)
        instance.outfit.push(object)
      }
    }
  }
}

/** Flat village parts that only receive shadows. */
const FLAT_PARTS = /Ground|Sea|River|Path|Pond/
/** Pastel lighting tuned so the lawn renders close to the painting's #C8D078. */
const SUN_INTENSITY = 2.2
const SKY_INTENSITY = 1.6
const CAMERA_OFFSET = VILLAGE_CAMERA.position.clone().sub(VILLAGE_CAMERA.target)
/** Light aerial haze: only the far trees and sea fade a little, like the painting. */
const HAZE = { color: '#dcebf2', near: 90, far: 340 }

const WATER_MATERIALS = new Set(['V4 water', 'V4 sea'])

/**
 * Clear, painted-looking water. Blender stores a "Water Depth" colour on the pond and
 * river (0 at the shore → 1 in the middle): shallow aqua fades into the base blue, with
 * a soft foam line at the shore, slowly drifting light ripples and small sun glints.
 * The sea has no depth data, so it stays deep and only gets ripples and glints.
 */
function makeWater(base: THREE.MeshStandardMaterial, hasDepth: boolean, time: { value: number }, fountain = false) {
  const water = new THREE.MeshStandardMaterial({ color: base.color, roughness: 0.12, metalness: 0, vertexColors: hasDepth })
  water.name = base.name
  water.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time
    shader.uniforms.uShallow = { value: new THREE.Color('#a8e7ef') }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWaterPos;\nvarying vec2 vWaterLocal;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vWaterPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vWaterLocal = transformed.xz;`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        uniform vec3 uShallow;
        varying vec3 vWaterPos;
        varying vec2 vWaterLocal;`)
      .replace('#include <color_fragment>', `
        float depth = 1.0;
        #if defined( USE_COLOR_ALPHA ) || defined( USE_COLOR )
          depth = vColor.r;
        #endif
        // Fountain basins are small: finer ripples, plus rings spreading from where the water falls.
        vec2 wp = vWaterPos.xz * ${fountain ? '3.5' : '1.0'};
        float ripple = sin(wp.x * 1.6 + uTime * 0.7 + sin(wp.y * 1.2 + uTime * 0.4) * 1.6)
          * sin(wp.y * 2.0 - uTime * 0.55 + sin(wp.x * 0.8) * 1.3);
        vec3 waterColor = mix(uShallow, diffuseColor.rgb, smoothstep(0.0, 1.0, depth));
        waterColor += smoothstep(0.45, 0.95, ripple) * 0.07;
        ${fountain ? 'waterColor += smoothstep(0.55, 1.0, sin(length(vWaterLocal) * 16.0 - uTime * 3.2)) * 0.06;' : ''}
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

/**
 * Falling fountain water. Blender gives the curtains a UV whose v is metres along the flow
 * (copied to `flowUv`; glTF stores it flipped), so streaks scrolling along it pour from the
 * bowl down into the basin.
 * Clear aqua with brighter threads; thinner where it leaves the rim and where it lands.
 */
function makeFall(time: { value: number }) {
  const fall = new THREE.MeshStandardMaterial({ color: '#c8eef5', roughness: 0.08, metalness: 0, transparent: true,
    depthWrite: false, side: THREE.DoubleSide })
  fall.name = 'V4 fountain fall'
  fall.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = time
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 flowUv;\nvarying vec2 vFlow;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvFlow = flowUv;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        varying vec2 vFlow;
        float fallHash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
        float fallNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(fallHash(i), fallHash(i + vec2(1.0, 0.0)), u.x),
            mix(fallHash(i + vec2(0.0, 1.0)), fallHash(i + vec2(1.0, 1.0)), u.x), u.y);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // glTF flips Blender's v (v' = 1 − v), so turn it back into metres travelled downstream.
        float along = 1.0 - vFlow.y;
        // Long thin threads across the flow, short pulses along it, all moving downstream.
        vec2 flow = vec2(vFlow.x * 14.0, along * 1.6 - uTime * 2.2);
        float threads = fallNoise(flow) * 0.6 + fallNoise(flow * vec2(2.1, 2.6) + 5.1) * 0.4;
        float pulse = fallNoise(vec2(vFlow.x * 3.0, along * 5.0 - uTime * 6.0));
        float bright = smoothstep(0.5, 0.8, threads) * (0.6 + 0.4 * pulse);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), bright * 0.75);
        float ends = smoothstep(0.0, 0.06, along);
        diffuseColor.a = (0.1 + 0.7 * bright) * ends;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(bright * 0.22);')
  }
  return fall
}

/**
 * Painted lawn: soft patches of sunny yellow-green and calmer green (like the brush
 * strokes in the legacy painting), a faint fine grain, and slightly deeper green away
 * from the middle of the lawn so the open grass reads as the centre of the village.
 */
function makeLawn(base: THREE.MeshStandardMaterial) {
  const lawn = base.clone()
  lawn.onBeforeCompile = (shader) => {
    shader.uniforms.uLawnCentre = { value: new THREE.Vector2(VILLAGE_CENTER.x, VILLAGE_CENTER.z) }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLawnPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvLawnPos = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec2 uLawnCentre;
        varying vec3 vLawnPos;
        float lawnHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float lawnNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(lawnHash(i), lawnHash(i + vec2(1.0, 0.0)), u.x),
            mix(lawnHash(i + vec2(0.0, 1.0)), lawnHash(i + vec2(1.0, 1.0)), u.x), u.y);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 lp = vLawnPos.xz;
        float patches = lawnNoise(lp * 0.16) * 0.6 + lawnNoise(lp * 0.42 + 7.3) * 0.3 + lawnNoise(lp * 1.1 + 3.1) * 0.1;
        vec3 sunny = diffuseColor.rgb * vec3(1.1, 1.08, 0.92);
        vec3 calm = diffuseColor.rgb * vec3(0.86, 0.92, 0.88);
        vec3 grass = mix(calm, sunny, smoothstep(0.32, 0.72, patches));
        grass *= 0.97 + 0.06 * lawnNoise(lp * 5.0);
        float edge = smoothstep(0.75, 1.35, length((lp - uLawnCentre) / vec2(13.0, 12.0)));
        diffuseColor.rgb = mix(grass, grass * vec3(0.88, 0.93, 0.9), edge);`)
  }
  return lawn
}

/**
 * The duck swims a slow, wobbly loop around the middle of the pond. Measured in Blender:
 * at 0.45 of the pond radii (±12 %) it stays ≥ 0.9 units from the shore and ≥ 1.3 from
 * the three lily pads. One lap takes about a minute.
 */
const DUCK_POND = { x: VILLAGE_POND.x, z: VILLAGE_POND.z, rx: 5.44 * 0.45, rz: 5.6 * 0.45, lapSpeed: 0.11 }
const WAKE_PERIOD = 2.4

function duckPosition(t: number, out: THREE.Vector3): THREE.Vector3 {
  const angle = t * DUCK_POND.lapSpeed
  const wobble = 1 + 0.12 * Math.sin(t * 0.23 + 1)
  return out.set(DUCK_POND.x + Math.cos(angle) * DUCK_POND.rx * wobble, out.y,
    DUCK_POND.z + Math.sin(angle) * DUCK_POND.rz * wobble)
}

/** Phones and small screens skip ambient occlusion and use a smaller shadow map. */
function isLowPower(): boolean {
  return window.matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 600
}

/** Most footprints the placement grid can mark as taken at once. */
const GRID_BLOCKERS = 64

/**
 * Graph-paper overlay shown while placing: fills the lawn areas where decorations may go,
 * draws the 2-unit floor-tile grid (with fainter 1-unit lines) and the outline of the
 * area, and tints the footprints of decorations already there.
 */
function makePlacementGrid() {
  const rects = VILLAGE_WALKABLE_AREAS.map((a) => {
    const min = villageGround(a.x[0], a.y[0])
    const max = villageGround(a.x[1], a.y[1])
    return new THREE.Vector4(min.x, min.z, max.x, max.z)
  })
  const blockers = Array.from({ length: GRID_BLOCKERS }, () => new THREE.Vector4())
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    uniforms: {
      opacity: { value: 0 },
      rects: { value: rects },
      blockers: { value: blockers },
      blockerCount: { value: 0 },
      origin: { value: new THREE.Vector2(VILLAGE_CENTER.x + FLOOR_TILE_SIZE / 2, VILLAGE_CENTER.z + FLOOR_TILE_SIZE / 2) },
    },
    vertexShader: `
      varying vec2 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `
      uniform float opacity;
      uniform vec4 rects[${rects.length}];
      uniform vec4 blockers[${GRID_BLOCKERS}];
      uniform int blockerCount;
      uniform vec2 origin;
      varying vec2 vWorld;
      bool inside(vec2 p) {
        for (int i = 0; i < ${rects.length}; i++) {
          vec4 r = rects[i];
          if (p.x >= r.x && p.x <= r.z && p.y >= r.y && p.y <= r.w) return true;
        }
        return false;
      }
      float lines(vec2 p, float size, float width) {
        vec2 cell = (p - origin) / size;
        vec2 dist = abs(cell - floor(cell + 0.5)) * size / max(fwidth(p), vec2(1e-4));
        return 1.0 - clamp(min(dist.x, dist.y) - width + 0.5, 0.0, 1.0);
      }
      void main() {
        if (!inside(vWorld)) discard;
        float e = 0.12;
        bool edge = !inside(vWorld + vec2(e, 0.0)) || !inside(vWorld - vec2(e, 0.0)) ||
          !inside(vWorld + vec2(0.0, e)) || !inside(vWorld - vec2(0.0, e));
        float taken = 0.0;
        for (int i = 0; i < ${GRID_BLOCKERS}; i++) {
          if (i >= blockerCount) break;
          vec4 b = blockers[i];
          vec2 d = abs(vWorld - b.xy);
          float inBlock = b.w > 0.5 ? step(max(d.x, d.y), b.z) : step(length(vWorld - b.xy), b.z);
          taken = max(taken, inBlock);
        }
        float major = lines(vWorld, 2.0, 1.2);
        float minor = lines(vWorld, 1.0, 0.8) * 0.45;
        vec3 color = mix(vec3(1.0, 0.99, 0.9), vec3(1.0, 0.45, 0.4), taken);
        float alpha = 0.10 + 0.12 * taken + max(major * 0.55, minor * 0.5);
        if (edge) { color = vec3(1.0, 0.98, 0.86); alpha = 0.9; }
        gl_FragColor = vec4(color, alpha * opacity);
      }`,
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(VILLAGE_WIDTH + 2, VILLAGE_DEPTH + 2), material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(VILLAGE_CENTER.x, 0.04, VILLAGE_CENTER.z)
  mesh.renderOrder = 2
  mesh.visible = false
  return { mesh, material, blockers }
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
    const pixelRatio = () => Math.min(window.devicePixelRatio || 1,
      window.matchMedia('(any-pointer: coarse)').matches ? 2 : 1.5)
    renderer.setPixelRatio(pixelRatio())
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    host.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#9fd0e6')
    scene.fog = new THREE.Fog(HAZE.color, HAZE.near, HAZE.far)
    const camera = new THREE.PerspectiveCamera(VILLAGE_CAMERA.fov, 16 / 9, 0.5, 600)
    const initialZoom = window.matchMedia('(any-pointer: coarse)').matches ? 1.45 : 1
    let zoom = initialZoom
    const pan = new THREE.Vector3()
    const focus = VILLAGE_CAMERA.target.clone()
    let distance = VILLAGE_VIEW_DISTANCE[props.view] as number
    let resetKey = props.cameraResetKey
    const updateCamera = () => {
      const target = focus.clone().add(pan)
      camera.position.copy(target).addScaledVector(CAMERA_OFFSET, distance * zoom)
      camera.lookAt(target)
      camera.updateMatrixWorld()
    }
    updateCamera()
    // Soft warm sun from the upper left, matching Blender's "V4 Soft Sun" direction.
    const key = new THREE.DirectionalLight(new THREE.Color(1, 0.95, 0.86), SUN_INTENSITY)
    key.position.set(-0.551, 0.636, 0.54).multiplyScalar(110).add(VILLAGE_CAMERA.target)
    key.target.position.copy(VILLAGE_CAMERA.target)
    key.castShadow = true
    key.shadow.mapSize.setScalar(lowPower ? 2048 : 4096)
    // Covers everything the widened whole-village view can see (about 65 × 60 units of ground).
    Object.assign(key.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 260 })
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
    let clothesAsset: THREE.Object3D | null = null
    let clothes = new Map<string, ClothingPart[]>()
    let duck: THREE.Object3D | null = null
    let duckBaseY = 0
    let duckHeading = 0
    // Small ripple rings that spread behind the swimming duck.
    const wakeMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false })
    const wakeRings = [0, 1, 2].map(() => {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 32), wakeMaterial.clone())
      ring.rotation.x = -Math.PI / 2
      ring.visible = false
      scene.add(ring)
      return { ring, phase: 1 }
    })
    const duckNow = new THREE.Vector3()
    const duckNext = new THREE.Vector3()
    const updateDuck = (t: number) => {
      if (!duck) return
      duckPosition(t, duckNow)
      duckPosition(t + 0.1, duckNext)
      // The model looks along -X, so turn -X towards the direction of travel.
      const target = Math.atan2(duckNext.z - duckNow.z, -(duckNext.x - duckNow.x))
      duckHeading += Math.atan2(Math.sin(target - duckHeading), Math.cos(target - duckHeading)) * 0.1
      duck.position.set(duckNow.x, duckBaseY + 0.015 * Math.sin(t * 2.4), duckNow.z)
      duck.rotation.set(0, duckHeading, 0.04 * Math.sin(t * 2.4 + 0.6))
      wakeRings.forEach((wake, k) => {
        const phase = ((t + k * WAKE_PERIOD / wakeRings.length) % WAKE_PERIOD) / WAKE_PERIOD
        if (phase < wake.phase) {
          // A new ring starts just behind the duck.
          wake.ring.position.set(duckNow.x + Math.cos(duckHeading) * 0.2, 0.03, duckNow.z - Math.sin(duckHeading) * 0.2)
          wake.ring.visible = true
        }
        wake.phase = phase
        wake.ring.scale.setScalar(1 + phase * 2.4)
        ;(wake.ring.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - phase)
      })
    }
    /** One model per shop item, keyed by item id ("Deco flower_pot" → "flower_pot"). */
    const decorationModels = new Map<string, THREE.Object3D>()
    const placed = new Map<string, { itemId: string; object: THREE.Object3D }>()
    const load = async () => {
      try {
        const [village, walk, idle, decorationsFile, clothesFile] = await Promise.all([
          loader.loadAsync('/assets/village/diary-village-v4.glb'),
          // Light copies made in Blender: 9.4k instead of 31k triangles, JPEG texture, and
          // an idle file that only carries the animation. Bones and tracks match the originals.
          loader.loadAsync('/assets/characters/male/character-walk-light.glb'),
          loader.loadAsync('/assets/characters/male/character-idle-anim.glb'),
          loader.loadAsync('/assets/village/decorations-v1.glb'),
          // Without clothes the village still works; characters just wear their painted outfit.
          loader.loadAsync('/assets/characters/male/clothes-v1.glb').catch((error) => {
            console.warn('[VillageStage] 옷을 불러오지 못했어요', error)
            return null
          }),
        ])
        if (disposed) {
          for (const asset of [village, walk, idle, decorationsFile, clothesFile]) if (asset) disposeObject(asset.scene)
          return
        }
        if (clothesFile) {
          clothesAsset = clothesFile.scene
          clothesAsset.updateMatrixWorld(true)
          clothes = collectClothes(clothesAsset)
        }
        decorationAsset = decorationsFile.scene
        for (const model of [...decorationAsset.children]) {
          model.position.set(0, 0, 0)
          const itemId = model.name.replace(/^Deco_/, '')
          model.traverse((o) => {
            const mesh = o as THREE.Mesh
            if (!mesh.isMesh) return
            // Floor tiles lie flat, so they only receive shadows; the fountain's water ripples like the pond.
            mesh.castShadow = !isFloorDecoration(itemId)
            mesh.receiveShadow = true
            const material = mesh.material as THREE.MeshStandardMaterial
            if (WATER_MATERIALS.has(material.name)) {
              mesh.material = makeWater(material, 'color' in mesh.geometry.attributes, waterTime, true)
            } else if (material.name === 'V4 fountain fall') {
              mesh.geometry.setAttribute('flowUv', mesh.geometry.attributes.uv)
              mesh.material = makeFall(waterTime)
              mesh.castShadow = false
            } else if (material.vertexColors) {
              // The fountain's water depth colours are only meant for the water.
              material.vertexColors = false
            }
          })
          decorationModels.set(itemId, model)
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
          } else if (material.name === 'V4 grass') {
            mesh.material = makeLawn(material)
            material.dispose()
          } else if (material.vertexColors) {
            // Only water uses the exported "Water Depth" colours; the pond stones must not.
            material.vertexColors = false
            material.needsUpdate = true
          }
        })
        scene.add(terrain)
        // Lift the duck out of the (cm → m scaled) village group so it can swim in world units.
        terrain.updateMatrixWorld(true)
        duck = terrain.getObjectByName('V4_Duck') ?? null
        if (duck) {
          scene.attach(duck)
          duckBaseY = duck.position.y
        }
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
        if (import.meta.env.DEV) Object.assign(window, { __village: { scene, camera, renderer, instances, lowPower, clothes: () => clothes } })
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
      renderer.setPixelRatio(pixelRatio())
      camera.aspect = host.clientWidth / host.clientHeight
      // Cover the original village frame rather than expose edges on wide screens.
      camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(
        Math.tan(THREE.MathUtils.degToRad(VILLAGE_CAMERA.fov / 2)) * Math.min(1, (16 / 9) / camera.aspect),
      ))
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
    const aim = (event: PointerEvent) => {
      const box = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(
        (event.clientX - box.left) / box.width * 2 - 1,
        1 - (event.clientY - box.top) / box.height * 2,
      ), camera)
    }
    /** First object under the pointer that carries `key` in its userData, if any. */
    const pick = (objects: THREE.Object3D[], key: string): string | null => {
      for (const hit of raycaster.intersectObjects(objects, true)) {
        let object: THREE.Object3D | null = hit.object
        while (object && !object.userData[key]) object = object.parent
        if (object) return object.userData[key] as string
      }
      return null
    }
    const click = (event: PointerEvent) => {
      aim(event)
      const { decorating } = dataRef.current
      if (decorating && !decorating.placing) {
        // Decorating: tap a decoration to select it for moving or recalling.
        const id = pick([...placed.values()].map((p) => p.object), 'decorationId')
        if (id) decorating.onSelectDecoration(id)
        return
      }
      if (!decorating) {
        const id = pick([...instances.values()].map((i) => i.object), 'characterId')
        if (id) {
          dataRef.current.onSelect(id)
          return
        }
      }
      const point = raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3())
      if (point) dataRef.current.onGround(villagePoint(point))
    }
    /** Where the pointer touches the lawn, for the placement ghost. */
    let pointerGround: THREE.Vector3 | null = null
    const hover = (event: PointerEvent) => {
      aim(event)
      pointerGround = raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3())
    }
    const leave = () => { pointerGround = null }
    // Capture each finger so dragging outside the canvas still finishes cleanly.
    const pointers = new Map<number, { x: number; y: number; startX: number; startY: number; time: number }>()
    let gesturing = false
    let holdTimer: number | undefined
    let dragging: { pointerId: number; id: string; itemId: string; offset: THREE.Vector3; point: THREE.Vector3 } | null = null
    const clearHold = () => { window.clearTimeout(holdTimer); holdTimer = undefined }
    const cancelDrag = () => {
      clearHold()
      delete host.dataset.decorationDragging
      if (dragging) {
        const original = placed.get(dragging.id)
        if (original) original.object.visible = true
        dragging = null
      }
    }
    const groundAt = (x: number, y: number) => {
      const box = renderer.domElement.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(
        (x - box.left) / box.width * 2 - 1, 1 - (y - box.top) / box.height * 2,
      ), camera)
      return raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3())
    }
    const reposition = (before: THREE.Vector3 | null, x: number, y: number) => {
      const after = groundAt(x, y)
      if (!before || !after) return
      pan.add(before.sub(after))
      pan.x = THREE.MathUtils.clamp(pan.x, -18, 18)
      pan.z = THREE.MathUtils.clamp(pan.z, -22, 22)
      updateCamera()
    }
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      if (!pointers.size) gesturing = false
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY,
        startX: event.clientX, startY: event.clientY, time: performance.now() })
      renderer.domElement.setPointerCapture(event.pointerId)
      if (pointers.size > 1) { cancelDrag(); gesturing = true; leave(); return }
      if (dataRef.current.decorating) {
        aim(event)
        const id = pick([...placed.values()].map((p) => p.object), 'decorationId')
        const anchor = groundAt(event.clientX, event.clientY)
        if (id && anchor) holdTimer = window.setTimeout(() => {
          const original = placed.get(id)
          const decorating = dataRef.current.decorating
          if (gesturing || pointers.size !== 1 || !pointers.has(event.pointerId) || !decorating ||
            !original || !dataRef.current.decorations.some((d) => d.id === id)) return
          decorating.onSelectDecoration(id)
          dragging = { pointerId: event.pointerId, id, itemId: original.itemId,
            offset: original.object.position.clone().sub(anchor), point: original.object.position.clone() }
          host.dataset.decorationDragging = 'true'
          original.object.visible = false
          gesturing = true
          leave()
        }, 400)
      }
    }
    const pointerMove = (event: PointerEvent) => {
      const pointer = pointers.get(event.pointerId)
      if (!pointer) { hover(event); return }
      if (dragging?.pointerId === event.pointerId) {
        const point = groundAt(event.clientX, event.clientY)
        if (point) dragging.point.copy(point).add(dragging.offset)
        pointer.x = event.clientX
        pointer.y = event.clientY
        return
      }
      const touches = [...pointers.values()]
      if (touches.length >= 2) {
        const [a, b] = touches
        const oldGap = Math.hypot(a.x - b.x, a.y - b.y)
        const anchor = groundAt((a.x + b.x) / 2, (a.y + b.y) / 2)
        pointer.x = event.clientX
        pointer.y = event.clientY
        const newGap = Math.hypot(a.x - b.x, a.y - b.y)
        if (oldGap > 0 && newGap > 0) {
          zoom = THREE.MathUtils.clamp(zoom * oldGap / newGap, 0.55, 2.4)
          updateCamera()
        }
        reposition(anchor, (a.x + b.x) / 2, (a.y + b.y) / 2)
        leave()
        return
      }
      if (!gesturing && Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 8) {
        clearHold()
        gesturing = true
      }
      if (gesturing) {
        reposition(groundAt(pointer.x, pointer.y), event.clientX, event.clientY)
        leave()
      } else hover(event)
      pointer.x = event.clientX
      pointer.y = event.clientY
    }
    const pointerEnd = (event: PointerEvent) => {
      const pointer = pointers.get(event.pointerId)
      if (!pointer) return
      const drop = dragging?.pointerId === event.pointerId ? dragging : null
      if (drop && event.type === 'pointerup' && Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) > 8 &&
        document.elementFromPoint(event.clientX, event.clientY) === renderer.domElement) {
        const point = groundAt(event.clientX, event.clientY)
        if (point) dataRef.current.decorating?.onMoveDecoration(drop.id, snapDecoration(drop.itemId, villagePoint(point.add(drop.offset))))
      }
      cancelDrag()
      const tap = event.type === 'pointerup' && !gesturing && pointers.size === 1 &&
        performance.now() - pointer.time < 350 &&
        Math.hypot(event.clientX - pointer.startX, event.clientY - pointer.startY) <= 8
      pointers.delete(event.pointerId)
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId)
      if (tap) click(event)
      if (!pointers.size) { gesturing = false; leave() }
    }
    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointerup', pointerEnd)
    renderer.domElement.addEventListener('pointercancel', pointerEnd)
    renderer.domElement.addEventListener('lostpointercapture', pointerEnd)
    renderer.domElement.addEventListener('pointermove', pointerMove)
    renderer.domElement.addEventListener('pointerleave', leave)
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
    // Decorating: a translucent ghost follows the pointer (green = fits, red = not here),
    // and the selected decoration gets an orange ring.
    let ghost: { itemId: string; object: THREE.Object3D; materials: THREE.MeshStandardMaterial[] } | null = null
    const clearGhost = () => {
      if (!ghost) return
      scene.remove(ghost.object)
      for (const material of ghost.materials) material.dispose()
      ghost = null
    }
    const makeGhost = (itemId: string) => {
      const model = decorationModels.get(itemId)
      if (!model) return null
      const object = model.clone()
      const materials: THREE.MeshStandardMaterial[] = []
      object.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.castShadow = false
        const material = (mesh.material as THREE.MeshStandardMaterial).clone()
        Object.assign(material, { transparent: true, opacity: 0.6, depthWrite: false, emissiveIntensity: 0.6 })
        mesh.material = material
        materials.push(material)
      })
      scene.add(object)
      return { itemId, object, materials }
    }
    const selectionRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.08, 48),
      new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9, depthWrite: false }))
    selectionRing.rotation.x = -Math.PI / 2
    selectionRing.visible = false
    scene.add(selectionRing)
    const placementGrid = makePlacementGrid()
    scene.add(placementGrid.mesh)
    const fits = new THREE.Color('#5fd17a')
    const blocked = new THREE.Color('#ff6b6b')
    // Fades the grid in while placing and marks what the item being placed must keep clear of:
    // tiles avoid tiles, everything else avoids non-floor decorations.
    const updateGrid = (placing: { itemId: string; movingId?: string } | undefined, delta: number) => {
      const uniforms = placementGrid.material.uniforms
      uniforms.opacity.value = THREE.MathUtils.damp(uniforms.opacity.value, placing ? 1 : 0, 10, delta)
      placementGrid.mesh.visible = uniforms.opacity.value > 0.01
      if (!placing) return
      const floor = isFloorDecoration(placing.itemId)
      const others = dataRef.current.decorations
        .filter((d) => d.id !== placing.movingId && isFloorDecoration(d.itemId) === floor).slice(0, GRID_BLOCKERS)
      others.forEach((d, i) => {
        const at = villageGround(d.x, d.y)
        placementGrid.blockers[i].set(at.x, at.z, floor ? FLOOR_TILE_SIZE / 2 : DECORATION_RADIUS[d.itemId] ?? 0.6, floor ? 1 : 0)
      })
      uniforms.blockerCount.value = others.length
    }
    const updateDecorating = (decorating: StageDecorating | null, delta: number) => {
      if (dragging && (!decorating || !dataRef.current.decorations.some((d) => d.id === dragging!.id) ||
        decorating.selectedId !== dragging.id || decorating.placing)) cancelDrag()
      const selected = decorating?.selectedId ? placed.get(decorating.selectedId) : undefined
      selectionRing.visible = !!selected && !decorating?.placing
      if (selected) {
        selectionRing.scale.setScalar(DECORATION_RADIUS[selected.itemId] ?? 0.6)
        selectionRing.position.copy(dragging?.point ?? selected.object.position).setY(0.05)
      }
      const placing = dragging ? { itemId: dragging.itemId, movingId: dragging.id } : decorating?.placing
      updateGrid(decorating ? placing ?? undefined : undefined, delta)
      const previewPoint = dragging?.point ?? pointerGround
      if (!decorating || !placing || !previewPoint) {
        clearGhost()
        return
      }
      if (ghost?.itemId !== placing.itemId) {
        clearGhost()
        ghost = makeGhost(placing.itemId)
      }
      if (!ghost) return
      const point = snapDecoration(placing.itemId, villagePoint(previewPoint))
      ghost.object.position.copy(villageGround(point.x, point.y))
      const tint = decorating.canPlace(placing.itemId, point, placing.movingId) ? fits : blocked
      for (const material of ghost.materials) material.emissive.copy(tint)
    }
    let raf = 0
    let previous = performance.now()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      waterTime.value = now / 1000
      updateDuck(now / 1000)
      const delta = Math.min(0.05, (now - previous) / 1000)
      previous = now
      const { characters, decorations, decorating, view, focusId } = dataRef.current
      if (decorationModels.size) {
        syncDecorations(decorations)
        updateDecorating(decorating, delta)
      }
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
            inst = { object, mixer, walk, idle, blend: 0, angle: 0, lastDistance: c.walkDistance, outfitKey: '', outfit: [] }
            instances.set(c.id, inst)
          }
          const outfitKey = c.outfit?.join('|') ?? ''
          if (outfitKey !== inst.outfitKey) {
            inst.outfitKey = outfitKey
            dress(inst, c.outfit ?? [], clothes)
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
      if (resetKey !== dataRef.current.cameraResetKey) {
        resetKey = dataRef.current.cameraResetKey
        zoom = initialZoom
        pan.set(0, 0, 0)
      }
      // Every view keeps the legacy angle; only the look-at point and distance change.
      const target = view === 'whole' ? VILLAGE_CAMERA.target
        : view === 'follow' && tracked ? villageGround(tracked.x, tracked.y) : villageGround(0.5, 0.5)
      const ease = Math.min(1, delta * 6)
      if (!pointers.size) focus.lerp(target, ease)
      distance += (VILLAGE_VIEW_DISTANCE[view] - distance) * ease
      updateCamera()
      if (composer) composer.render(delta)
      else renderer.render(scene, camera)
    }
    tick()
    return () => {
      disposed = true
      cancelDrag()
      cancelAnimationFrame(raf)
      observer.disconnect()
      renderer.domElement.removeEventListener('pointerdown', pointerDown)
      renderer.domElement.removeEventListener('pointerup', pointerEnd)
      renderer.domElement.removeEventListener('pointercancel', pointerEnd)
      renderer.domElement.removeEventListener('lostpointercapture', pointerEnd)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('pointerleave', leave)
      clearGhost()
      placementGrid.mesh.geometry.dispose()
      placementGrid.material.dispose()
      selectionRing.geometry.dispose()
      ;(selectionRing.material as THREE.Material).dispose()
      for (const instance of instances.values()) {
        instance.mixer.stopAllAction()
        instance.mixer.uncacheRoot(instance.object)
      }
      if (template) disposeObject(template)
      if (terrain) disposeObject(terrain)
      // Placed decorations are clones that share these geometries and materials.
      if (decorationAsset) disposeObject(decorationAsset)
      if (clothesAsset) disposeObject(clothesAsset)
      // The duck left the terrain group, so it is disposed on its own.
      if (duck) disposeObject(duck)
      for (const { ring } of wakeRings) {
        ring.geometry.dispose()
        ;(ring.material as THREE.Material).dispose()
      }
      wakeMaterial.dispose()
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
