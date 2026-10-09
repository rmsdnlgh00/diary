import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { DEFAULT_DEPTH_CONFIG, type DepthConfig } from '@/systems/depthSystem'
import { MALE_WALK_STRIDE } from '@/systems/walkSystem'

/**
 * 3D 캐릭터를 2D 배경 위에 올리는 레이어.
 *
 * 스프라이트와 달리 방향이 끊기지 않는다. 모델을 진행 방향으로 돌리기만
 * 하면 되므로 360° 어디로든 향할 수 있고, 걷기와 서 있기는 섞어서(크로스페이드)
 * 넘어가므로 프레임을 맞춰 이어붙일 필요도 없다.
 *
 * 스프라이트 경로는 지우지 않고 RENDER_3D 플래그로 갈아탈 수 있게 두었다.
 */

/** true 면 스프라이트 대신 3D 캐릭터를 그린다. */
export const RENDER_3D = true

const WALK_URL = '/assets/characters/male/character-walk.glb'
/** 서 있기는 애니메이션만 꺼내 쓴다. 뼈대가 같아 걷기 모델에 그대로 붙는다. */
const IDLE_URL = '/assets/characters/male/character-idle.glb'

/** 걷기 클립 한 바퀴가 나아가는 거리. 한 바퀴는 두 걸음이다. */
const CYCLE_DISTANCE = MALE_WALK_STRIDE * 2
/** 걷기 ↔ 서 있기 전환 시간(초) */
const FADE_SECONDS = 0.25
/** 회전이 따라붙는 속도. 클수록 빨리 돈다. */
const TURN_RESPONSE = 9

/*
 * 카메라.
 *
 * 배경 그림의 원형 디딤돌이 눌린 비율에서 고도각 30° 를 실측했다(docs 참고).
 * 배경에는 원근이 들어 있어서 — 뒤쪽이 작아 보인다 — 정사영이 아니라
 * 원근 카메라를 쓴다. 거리를 멀리 두고 화각을 좁히면 원근의 세기를
 * 조절할 수 있고, 아래 DEPTH_SCALE_HINT 에 맞춰 튜닝한다.
 */
const CAMERA_ELEVATION_DEG = 30

/** 화면에서 캐릭터 키가 마을 전체 높이의 몇 %인지. 스프라이트와 같은 값. */
const CHARACTER_HEIGHT_FRACTION = 0.08

/** 월드 가로 1 에 해당하는 3D 거리. 숫자 자체는 의미 없고 비율만 맞으면 된다. */
const WORLD_WIDTH = 10
/** 지평선에서 화면 앞까지의 3D 거리. 월드가 16:9 라 가로의 9/16 이다. */
const GROUND_DEPTH = WORLD_WIDTH * (9 / 16)

/**
 * 카메라 거리를 깊이 설정에서 역산한다.
 *
 * 원근의 세기는 카메라 거리로 정해진다. 가까울수록 뒤쪽이 더 작아진다.
 * 스프라이트는 지평선에서 minScale, 화면 앞에서 maxScale 로 그렸으니
 * 3D 도 그 비율이 나오는 거리를 찾아야 같은 깊이감이 난다.
 *
 * 거리에 대해 단조로운 관계라 이분법으로 찾는다. 식을 직접 푸는 것보다
 * 짧고, 깊이 설정이 바뀌어도 따라온다.
 */
const distanceCache = new Map<string, number>()

function solveCameraDistance(depth: DepthConfig): number {
  const key = `${depth.horizonY}|${depth.frontY}|${depth.minScale}|${depth.maxScale}`
  const cached = distanceCache.get(key)
  if (cached !== undefined) return cached

  const target = depth.maxScale / depth.minScale
  const rad = (CAMERA_ELEVATION_DEG * Math.PI) / 180
  const probe = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000)
  const look = new THREE.Vector3(0, 0, GROUND_DEPTH / 2)
  const foot = new THREE.Vector3()
  const head = new THREE.Vector3()

  /*
   * 거리를 단순히 '카메라까지의 거리 비'로 풀면 안 맞는다. 카메라가 기울어
   * 있으면 같은 길이의 세로 막대라도 깊이에 따라 다르게 줄어들기 때문이다.
   * 그래서 실제로 투영해서 화면상 높이를 재고 그 비를 맞춘다.
   * 화각은 양쪽을 똑같이 키우므로 비에는 영향을 주지 않는다.
   */
  const ratioAt = (distance: number) => {
    probe.position.set(0, distance * Math.sin(rad), GROUND_DEPTH / 2 + distance * Math.cos(rad))
    probe.lookAt(look)
    probe.updateMatrixWorld(true)
    const heightAt = (z: number) => {
      foot.set(0, 0, z).project(probe)
      head.set(0, 1, z).project(probe)
      return Math.abs(head.y - foot.y)
    }
    return heightAt(GROUND_DEPTH) / heightAt(0)
  }

  let low = 0.5
  let high = 2000
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2
    // 가까울수록 원근이 세져 비율이 커진다.
    if (ratioAt(mid) > target) low = mid
    else high = mid
  }
  const solved = (low + high) / 2
  distanceCache.set(key, solved)
  return solved
}

export interface StageCharacter {
  id: string
  /** 월드 좌표 0~1 */
  x: number
  y: number
  /** 지금 향해 가는 목적지. 여기서 바라볼 각도를 구한다. */
  targetX: number
  targetY: number
  phase: 'IDLE' | 'WALK' | 'TALK'
  /** 걷기 시작 후 실제로 나아간 거리. 걸음 속도를 여기에 맞춘다. */
  walkDistance: number
}

/** 캐릭터 하나에 딸린 3D 상태 */
interface Instance {
  object: THREE.Object3D
  mixer: THREE.AnimationMixer
  walk: THREE.AnimationAction
  idle: THREE.AnimationAction
  /** 0 이면 서 있기, 1 이면 걷기. 그 사이를 오가며 섞는다. */
  blend: number
  /** 바라보는 각도(rad). 목표 각도로 부드럽게 따라간다. */
  angle: number
  lastDistance: number
}

/** 두 각도 사이의 최단 차이 (-π ~ π) */
function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from))
}

interface Props {
  characters: readonly StageCharacter[]
  depthConfig?: DepthConfig
}

/** 월드 좌표(0~1) → 3D 바닥 좌표. y 가 클수록 카메라 쪽(앞)이다. */
function toGround(x: number, y: number, depth: DepthConfig): THREE.Vector3 {
  const span = depth.frontY - depth.horizonY
  // 지평선 위쪽은 걸을 수 없으므로 0 아래로는 가지 않는다.
  const t = (y - depth.horizonY) / span
  return new THREE.Vector3((x - 0.5) * WORLD_WIDTH, 0, t * WORLD_WIDTH * (9 / 16))
}

export function ThreeStage({ characters, depthConfig = DEFAULT_DEPTH_CONFIG }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  /** 렌더 루프 밖에서 갱신할 수 있도록 최신 값을 담아 둔다. */
  const dataRef = useRef({ characters, depthConfig })
  dataRef.current = { characters, depthConfig }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    host.appendChild(renderer.domElement)
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1000)

    /*
     * 배경 그림의 햇빛은 오른쪽 위에서 온다. 그림자·반사광 CSS 와 같은 방향이다.
     * 채움광을 넉넉히 둬서 그늘이 배경 명도대(0.55 아래로 내려가지 않음)를
     * 벗어나지 않게 한다.
     */
    const key = new THREE.DirectionalLight(0xfff1d0, 2.1)
    key.position.set(6, 8, 4)
    scene.add(key)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9fb86a, 1.5))
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))

    let disposed = false
    const instances = new Map<string, Instance>()
    let template: THREE.Object3D | null = null
    let walkClip: THREE.AnimationClip | null = null
    let idleClip: THREE.AnimationClip | null = null

    const loader = new GLTFLoader()

    /*
     * 서 있기 파일에서는 애니메이션만 꺼낸다.
     *
     * 뼈 이름이 걷기 파일과 완전히 같아서(mixamorig:* 41 개) 클립을 그대로
     * 걷기 모델에 붙일 수 있다. 그 파일에 들어 있는 메시는 쓰지 않는다.
     */
    loader.load(
      IDLE_URL,
      (gltf) => {
        if (disposed) return
        const clip = gltf.animations[0]
        if (!clip) return
        /*
         * 트랙이 가리키는 뼈 이름을 걷기 모델에 맞춘다.
         *
         * 이 파일에는 캐릭터가 중복으로 들어 있어서 두 번째 뼈대에 _1 이
         * 붙고 애니메이션이 그쪽을 가리킨다. 그대로 쓰면 걷기 모델에 없는
         * 이름이라 아무것도 움직이지 않는다. 뼈 구성은 같으므로 접미사만
         * 떼면 그대로 맞는다.
         */
        idleClip = clip.clone()
        for (const track of idleClip.tracks) {
          track.name = track.name.replace(/_\d+(?=\.)/, '')
        }
      },
      undefined,
      (error) => console.error('[ThreeStage] 서 있기 로드 실패', error),
    )

    loader.load(
      WALK_URL,
      (gltf) => {
        if (disposed) return
        walkClip = gltf.animations[0] ?? null
        /*
         * 모델 크기를 정규화한다.
         *
         * Mixamo 는 cm 단위로 내보내서 키가 170 쯤으로 들어온다. 그대로 두면
         * 카메라 거리가 수천 단위가 되어 far 평면 밖으로 나가고 아무것도
         * 안 보인다. 키를 1 로 맞춰 두면 이후 계산이 전부 비율로만 굴러간다.
         */
        const raw = gltf.scene
        const rawBox = new THREE.Box3().setFromObject(raw)
        const rawHeight = rawBox.max.y - rawBox.min.y
        raw.scale.setScalar(1 / rawHeight)
        raw.position.y = -rawBox.min.y / rawHeight

        // 정규화한 모델을 한 번 감싸, 인스턴스마다 위치만 옮기면 되게 한다.
        template = new THREE.Group()
        template.add(raw)
        template.userData.modelHeight = 1
        template.userData.rawHeight = rawHeight
        const height = 1
        if (import.meta.env.DEV) {
          Object.assign(window, {
            __three: { modelHeight: height, rawHeight, camera, scene, renderer, instances, getClips: () => ({ walk: walkClip, idle: idleClip }) },
          })
        }
      },
      undefined,
      (error) => console.error('[ThreeStage] 모델 로드 실패', error),
    )

    /**
     * 카메라를 배치한다.
     *
     * 거리는 원근의 세기를 정하고(깊이 설정에서 역산), 화각은 그 거리에서
     * 캐릭터가 화면의 8% 로 보이도록 정한다. 둘을 따로 정하면 깊이감이
     * 맞으면 크기가 틀어지고, 크기를 맞추면 깊이감이 틀어진다.
     */
    const placeCamera = () => {
      const depth = dataRef.current.depthConfig
      const mid = toGround(0.5, (depth.horizonY + depth.frontY) / 2, depth)
      const rad = (CAMERA_ELEVATION_DEG * Math.PI) / 180
      const distance = solveCameraDistance(depth)

      const modelHeight = (template?.userData.modelHeight as number) ?? 1
      const viewHeight = modelHeight / CHARACTER_HEIGHT_FRACTION
      const fov = (2 * Math.atan(viewHeight / 2 / distance) * 180) / Math.PI
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov
        camera.updateProjectionMatrix()
      }

      camera.position.set(
        mid.x,
        mid.y + Math.sin(rad) * distance,
        mid.z + Math.cos(rad) * distance,
      )
      camera.lookAt(mid)
    }

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host
      if (w === 0 || h === 0) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    let raf = 0
    let previous = performance.now()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      // 탭이 백그라운드에 있다 돌아왔을 때 한 번에 튀지 않도록 상한을 둔다.
      const delta = Math.min(0.05, (now - previous) / 1000)
      previous = now
      if (!template || !walkClip || !idleClip) return
      const { characters: list, depthConfig: depth } = dataRef.current

      // 사라진 캐릭터를 치운다.
      for (const [id, inst] of instances) {
        if (!list.some((c) => c.id === id)) {
          scene.remove(inst.object)
          instances.delete(id)
        }
      }

      for (const c of list) {
        let inst = instances.get(c.id)
        if (!inst) {
          const object = cloneSkinned(template)
          scene.add(object)
          const mixer = new THREE.AnimationMixer(object)
          const walk = mixer.clipAction(walkClip)
          const idle = mixer.clipAction(idleClip)
          /*
           * 둘 다 돌려 두고 가중치로만 섞는다. crossFadeTo 는 가중치를
           * 옮길 뿐이라, 미리 play() 하고 시작 가중치를 정해 두지 않으면
           * 양쪽 다 꺼진 채로 남는다.
           */
          idle.reset().setEffectiveWeight(1).play()
          walk.reset().setEffectiveWeight(0).play()
          inst = {
            object,
            mixer,
            walk,
            idle,
            blend: 0,
            angle: 0,
            lastDistance: c.walkDistance,
          }
          instances.set(c.id, inst)
        }

        const p = toGround(c.x, c.y, depth)
        inst.object.position.x = p.x
        inst.object.position.z = p.z

        const moving = c.phase === 'WALK'

        /*
         * 걸음 속도를 실제 이동 속도에 맞춘다.
         *
         * 클립을 그냥 1 배속으로 돌리면 몸이 느려질 때도 다리는 제 속도로
         * 움직여 발이 미끄러진다. 한 바퀴가 CYCLE_DISTANCE 를 걷는 것에
         * 해당하도록 재생 속도를 매 프레임 맞춘다.
         */
        const moved = Math.max(0, c.walkDistance - inst.lastDistance)
        inst.lastDistance = c.walkDistance
        const speed = delta > 0 ? moved / delta : 0
        // 멈춰 있어도 0 으로 두지 않는다. timeScale 0 이면 액션이 멈춘 것으로
        // 취급돼 가중치를 섞어도 반영되지 않는다.
        inst.walk.timeScale = Math.max(0.001, (speed / CYCLE_DISTANCE) * walkClip.duration)

        /*
         * 걷기 ↔ 서 있기를 섞는다.
         *
         * crossFadeTo 를 쓰지 않고 가중치를 직접 옮긴다. 크로스페이드는
         * 내부 상태를 들고 있어서 timeScale 이 0 에 가까워지는 순간과
         * 얽히면 양쪽 다 꺼진 채로 남는 일이 생긴다.
         */
        const targetBlend = moving ? 1 : 0
        inst.blend += (targetBlend - inst.blend) * Math.min(1, delta / FADE_SECONDS)
        inst.walk.setEffectiveWeight(inst.blend)
        inst.idle.setEffectiveWeight(1 - inst.blend)

        /*
         * 진행 방향으로 돌린다.
         *
         * 스프라이트는 네 장 중 한 장을 고르는 방식이라 방향이 90° 씩
         * 끊겼다. 여기서는 각도를 그대로 쓰고 목표 각도로 천천히 따라가므로
         * 어느 쪽으로든 부드럽게 돈다.
         */
        if (moving) {
          const to = toGround(c.targetX, c.targetY, depth)
          const dx = to.x - p.x
          const dz = to.z - p.z
          if (dx * dx + dz * dz > 1e-8) {
            const target = Math.atan2(dx, dz)
            const step = angleDelta(inst.angle, target)
            inst.angle += step * Math.min(1, TURN_RESPONSE * delta)
          }
        }
        inst.object.rotation.y = inst.angle

        inst.mixer.update(delta)
      }

      placeCamera()
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      renderer.dispose()
      host.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={hostRef} className="three-stage" aria-hidden="true" />
}
