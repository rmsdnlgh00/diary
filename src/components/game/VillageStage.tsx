import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { StageCharacter } from './ThreeStage'
import { MALE_WALK_STRIDE } from '@/systems/walkSystem'
import { VILLAGE_BASIC_HEIGHT, VILLAGE_CHARACTER_HEIGHT, VILLAGE_OVERVIEW_HEIGHT,
  VILLAGE_WIDTH, villageGround, villagePoint } from '@/systems/villageLayout'

export type VillageView = 'whole' | 'basic' | 'follow'
interface Props {
  characters: readonly StageCharacter[]
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    host.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#d5dfbe')
    const camera = new THREE.OrthographicCamera(-17, 17, 37, -37, 0.1, 200)
    const key = new THREE.DirectionalLight(0xfff5df, 2.3)
    key.position.set(-20, 45, 25)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    Object.assign(key.shadow.camera, { left: -35, right: 35, top: 40, bottom: -40, near: 1, far: 100 })
    key.shadow.bias = -0.0003
    key.shadow.normalBias = 0.035
    key.shadow.radius = 3
    scene.add(key, key.target, new THREE.HemisphereLight(0xe9f2ff, 0xb5bd85, 1.1))
    const instances = new Map<string, Instance>()
    const loader = new GLTFLoader()
    let disposed = false
    let terrain: THREE.Object3D | null = null
    let template: THREE.Group | null = null
    let walkClip: THREE.AnimationClip | null = null
    let idleClip: THREE.AnimationClip | null = null
    const load = async () => {
      try {
        const [village, walk, idle] = await Promise.all([
          loader.loadAsync('/assets/village/diary-village-v2.glb'),
          loader.loadAsync('/assets/characters/male/character-walk.glb'),
          loader.loadAsync('/assets/characters/male/character-idle.glb'),
        ])
        if (disposed) {
          for (const asset of [village, walk, idle]) disposeObject(asset.scene)
          return
        }
        terrain = village.scene
        terrain.traverse((o) => {
          const mesh = o as THREE.Mesh
          if (!mesh.isMesh) return
          mesh.castShadow = !mesh.name.includes('Meadow') && !mesh.name.includes('Backdrop')
          mesh.receiveShadow = true
          // Blender's procedural grass shader isn't part of glTF. Use its pastel base colour.
          if (mesh.name.includes('Flat_Meadow') || mesh.name.includes('Flat Meadow')) {
            const material = mesh.material as THREE.MeshStandardMaterial
            material.color.setRGB(0.56, 0.68, 0.27)
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
        if (import.meta.env.DEV) Object.assign(window, { __village: { scene, camera, renderer, instances } })
      } catch (error) {
        if (!disposed) {
          console.error('[VillageStage] 마을 로드 실패', error)
          setStatus('마을을 불러오지 못했어요. 새로고침하거나 기존 마을로 전환해 주세요.')
          setFailed(true)
        }
      }
    }
    void load()
    let aspect = 9 / 19.5
    const resize = () => {
      if (!host.clientWidth || !host.clientHeight) return
      aspect = host.clientWidth / host.clientHeight
      renderer.setSize(host.clientWidth, host.clientHeight, false)
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
    const focus = new THREE.Vector3()
    let raf = 0
    let previous = performance.now()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      const delta = Math.min(0.05, (now - previous) / 1000)
      previous = now
      const { characters, view, focusId } = dataRef.current
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
      const target = view === 'follow' && tracked ? villageGround(tracked.x, tracked.y) : new THREE.Vector3()
      focus.lerp(target, Math.min(1, delta * 6))
      const height = view === 'whole' ? VILLAGE_OVERVIEW_HEIGHT : VILLAGE_BASIC_HEIGHT
      camera.left = -height * aspect / 2
      camera.right = height * aspect / 2
      camera.top = height / 2
      camera.bottom = -height / 2
      camera.position.copy(focus).add(new THREE.Vector3(0, 52, 38))
      camera.lookAt(focus)
      camera.updateProjectionMatrix()
      camera.updateMatrixWorld()
      renderer.render(scene, camera)
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
      key.shadow.map?.dispose()
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
