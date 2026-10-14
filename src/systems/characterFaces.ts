import * as THREE from 'three'
import { getItem } from '@/data/items'
import type { EmotionId } from '@/types'

/**
 * Mood faces for the 3D character. The character's face is painted into its texture, so each
 * mood gets its own copy of that texture with the face changed: faces.webp holds 32 px tiles
 * of every mood (scripts/bake-face-textures.py → scripts/pack-face-atlas.py) and faces.json
 * where they go. A mood's texture is built once on a canvas and shared by every character
 * with that mood.
 */
interface FaceAtlas {
  textureSize: number
  tile: number
  columns: number
  rows: number
  emotions: EmotionId[]
  tiles: [number, number][]
}

let atlas: Promise<{ info: FaceAtlas; image: HTMLImageElement } | null> | null = null

function loadAtlas() {
  atlas ??= (async () => {
    try {
      const [info, image] = await Promise.all([
        fetch('/assets/characters/male/faces.json').then((r) => {
          if (!r.ok) throw new Error(`faces.json ${r.status}`)
          return r.json() as Promise<FaceAtlas>
        }),
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = () => reject(new Error('faces.webp'))
          img.src = '/assets/characters/male/faces.webp'
        }),
      ])
      return { info, image }
    } catch (error) {
      // Without the atlas characters keep the painted smile.
      console.warn('[characterFaces] 표정을 불러오지 못했어요', error)
      return null
    }
  })()
  return atlas
}

/**
 * body-mask.png marks the body texture under clothes: red = covered by every top (painted
 * shirt and upper arms), green = covered by every bottom (thighs), blue = covered by long
 * bottoms (lower legs). Those parts are not drawn while the character wears such clothes,
 * so the body can't poke through.
 */
let bodyMask: THREE.Texture | null = null
function loadBodyMask(): THREE.Texture {
  if (!bodyMask) {
    bodyMask = new THREE.TextureLoader().load('/assets/characters/male/body-mask.png')
    bodyMask.flipY = false
    bodyMask.colorSpace = THREE.NoColorSpace
    bodyMask.magFilter = bodyMask.minFilter = THREE.NearestFilter
    bodyMask.generateMipmaps = false
  }
  return bodyMask
}

/** Which body parts the outfit covers: [top, bottom, long bottom]. */
function covered(outfit: readonly string[] | undefined): [number, number, number] {
  const items = (outfit ?? []).map((id) => getItem(id))
  const has = (test: (category: string | undefined, long: boolean) => boolean) =>
    items.some((item) => test(item?.category, !!item?.long)) ? 1 : 0
  return [has((c) => c === 'top'), has((c) => c === 'bottom'), has((c, long) => c === 'bottom' && long)]
}

/** Builds mood materials from one character's body material. */
export class FaceMaterials {
  private readonly faces = new Map<EmotionId, THREE.CanvasTexture>()
  private readonly made = new Map<string, THREE.Material>()
  private ready: Awaited<ReturnType<typeof loadAtlas>> = null

  constructor(private readonly base: THREE.MeshStandardMaterial) {}

  /** Starts loading the atlas; `material` returns the base material until it is in. */
  load(): Promise<void> {
    return loadAtlas().then((loaded) => { this.ready = loaded })
  }

  /** The body material for a mood, hiding what the outfit covers. */
  material(emotion: EmotionId | undefined, outfit?: readonly string[]): THREE.Material {
    const hide = covered(outfit)
    const key = `${emotion ?? '-'}|${hide.join('')}`
    const cached = this.made.get(key)
    if (cached) return cached
    const face = emotion ? this.face(emotion) : null
    if (!face && !hide.some(Boolean)) return this.base
    const material = this.base.clone()
    if (face) {
      material.map = face
      // The character glows with its own texture (glTF emissiveTexture), which carries most of
      // its colour: swap that one too, or the old face shows through.
      if (this.base.emissiveMap) material.emissiveMap = face
    }
    if (hide.some(Boolean)) {
      const mask = loadBodyMask()
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uBodyMask = { value: mask }
        shader.uniforms.uHide = { value: new THREE.Vector3(...hide) }
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform sampler2D uBodyMask;\nuniform vec3 uHide;')
          .replace('#include <map_fragment>', `#include <map_fragment>
            if (dot(step(vec3(0.5), texture2D(uBodyMask, vMapUv).rgb), uHide) > 0.5) discard;`)
      }
      material.customProgramCacheKey = () => `body-hide-${hide.join('')}`
    }
    // Before the face atlas is in, don't keep the faceless copy around.
    if (face || !emotion) this.made.set(key, material)
    return material
  }

  /** The texture with a mood's face, built once per mood. */
  private face(emotion: EmotionId): THREE.CanvasTexture | null {
    const map = this.base.map
    if (!this.ready || !map?.image) return null
    const cached = this.faces.get(emotion)
    if (cached) return cached
    const { info, image } = this.ready
    const band = info.emotions.indexOf(emotion)
    if (band < 0) return null
    const source = map.image as CanvasImageSource & { width: number; height: number }
    const canvas = document.createElement('canvas')
    canvas.width = source.width
    canvas.height = source.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(source, 0, 0)
    const scale = source.width / info.textureSize
    const t = info.tile
    info.tiles.forEach(([x, y], i) => {
      const sx = (i % info.columns) * t
      const sy = (band * info.rows + Math.floor(i / info.columns)) * t
      ctx.drawImage(image, sx, sy, t, t, x * scale, y * scale, t * scale, t * scale)
    })
    const texture = new THREE.CanvasTexture(canvas)
    texture.flipY = map.flipY
    texture.colorSpace = map.colorSpace
    texture.wrapS = map.wrapS
    texture.wrapT = map.wrapT
    texture.anisotropy = map.anisotropy
    this.faces.set(emotion, texture)
    return texture
  }

  dispose() {
    for (const material of this.made.values()) material.dispose()
    for (const texture of this.faces.values()) texture.dispose()
    this.made.clear()
    this.faces.clear()
  }
}

/** The character's body mesh (the skinned mesh that wears the painted texture). */
export function bodyOf(character: THREE.Object3D): THREE.SkinnedMesh | null {
  let body: THREE.SkinnedMesh | null = null
  character.traverse((o) => {
    if (!body && (o as THREE.SkinnedMesh).isSkinnedMesh && !o.name.startsWith('Cloth')) body = o as THREE.SkinnedMesh
  })
  return body
}
