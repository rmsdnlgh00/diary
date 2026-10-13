import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { dressCharacter, loadCharacterKit } from '@/systems/characterClothes'
import { bodyOf } from '@/systems/characterFaces'
import type { EmotionId } from '@/types'

/**
 * The wardrobe's 3D preview: the village character in its idle pose, wearing `outfit`,
 * turning slowly on a little lawn stand. Drag to turn it yourself. Until the model is
 * ready (or without WebGL) the 2D `fallback` picture stays.
 */
export function CharacterPreview3D({ outfit, emotion, fallback, label }: {
  outfit: readonly string[]
  /** The face to show; the painted smile without it. */
  emotion?: EmotionId
  fallback: string
  label: string
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const outfitRef = useRef(outfit)
  outfitRef.current = outfit
  const emotionRef = useRef(emotion)
  emotionRef.current = emotion
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }) }
    catch { return }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.setAttribute('aria-hidden', 'true')
    host.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 40)
    camera.position.set(0, 1.35, 4.6)
    camera.lookAt(0, 0.82, 0)
    // Same warm sun and sky light as the village.
    const sun = new THREE.DirectionalLight(new THREE.Color(1, 0.95, 0.86), 2.2)
    sun.position.set(-2.4, 3.2, 3)
    scene.add(sun, new THREE.HemisphereLight(new THREE.Color(0.78, 0.86, 0.95), 0xd9d3a8, 1.6))
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.08, 48),
      new THREE.MeshStandardMaterial({ color: '#c8d078', roughness: 0.95 }))
    stand.position.y = -0.04
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32),
      new THREE.MeshBasicMaterial({ color: '#5b6a2c', transparent: true, opacity: 0.18, depthWrite: false }))
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.002
    scene.add(stand, shadow)

    let disposed = false
    let character: THREE.Object3D | null = null
    let mixer: THREE.AnimationMixer | null = null
    let worn: THREE.Object3D[] = []
    let wornKey = ''
    let angle = -0.35
    let dragging: { x: number; angle: number } | null = null
    let idleSince = 0
    let clothes: Awaited<ReturnType<typeof loadCharacterKit>>['clothes'] | null = null
    let faces: Awaited<ReturnType<typeof loadCharacterKit>>['faces'] = null
    let face: EmotionId | undefined

    loadCharacterKit().then((kit) => {
      if (disposed) return
      character = cloneSkinned(kit.template)
      scene.add(character)
      mixer = new THREE.AnimationMixer(character)
      mixer.clipAction(kit.idle).play()
      clothes = kit.clothes
      faces = kit.faces
      setReady(true)
    }).catch((error) => console.warn('[CharacterPreview3D] 캐릭터를 불러오지 못했어요', error))

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()

    const down = (event: PointerEvent) => {
      dragging = { x: event.clientX, angle }
      renderer.domElement.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (dragging) angle = dragging.angle + (event.clientX - dragging.x) * 0.012
    }
    const up = () => { dragging = null; idleSince = performance.now() }
    renderer.domElement.addEventListener('pointerdown', down)
    renderer.domElement.addEventListener('pointermove', move)
    renderer.domElement.addEventListener('pointerup', up)
    renderer.domElement.addEventListener('pointercancel', up)

    let raf = 0
    let previous = performance.now()
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const now = performance.now()
      const delta = Math.min(0.05, (now - previous) / 1000)
      previous = now
      if (!character || !mixer || !clothes) return
      const key = outfitRef.current.join('|')
      if (faces && emotionRef.current !== face) {
        face = emotionRef.current
        const body = bodyOf(character)
        if (body) body.material = faces.material(face)
      }
      if (key !== wornKey) {
        wornKey = key
        worn = dressCharacter(character, worn, outfitRef.current, clothes)
      }
      // Turn slowly on its own, but give the player a moment after they let go.
      if (!dragging && now - idleSince > 1500) angle += delta * 0.45
      character.rotation.y = angle
      mixer.update(delta)
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      mixer?.stopAllAction()
      for (const object of [stand, shadow]) {
        object.geometry.dispose()
        ;(object.material as THREE.Material).dispose()
      }
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div className="character-preview-3d" ref={hostRef} data-ready={ready || undefined} role="img" aria-label={label}>
    {!ready && <img src={fallback} alt="" />}
    <span className="character-preview-3d__hint" aria-hidden="true">↔ 돌려보기</span>
  </div>
}
