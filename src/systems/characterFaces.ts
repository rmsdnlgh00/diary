import * as THREE from 'three'
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

/** Builds mood materials from one character's body material. */
export class FaceMaterials {
  private readonly made = new Map<EmotionId, THREE.Material>()
  private ready: Awaited<ReturnType<typeof loadAtlas>> = null

  constructor(private readonly base: THREE.MeshStandardMaterial) {}

  /** Starts loading the atlas; `material` returns the base material until it is in. */
  load(): Promise<void> {
    return loadAtlas().then((loaded) => { this.ready = loaded })
  }

  material(emotion: EmotionId | undefined): THREE.Material {
    const map = this.base.map
    if (!emotion || !this.ready || !map?.image) return this.base
    const cached = this.made.get(emotion)
    if (cached) return cached
    const { info, image } = this.ready
    const band = info.emotions.indexOf(emotion)
    if (band < 0) return this.base
    const source = map.image as CanvasImageSource & { width: number; height: number }
    const canvas = document.createElement('canvas')
    canvas.width = source.width
    canvas.height = source.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return this.base
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
    const material = this.base.clone()
    material.map = texture
    // The character glows with its own texture (glTF emissiveTexture), which carries most of
    // its colour: swap that one too, or the old face shows through.
    if (this.base.emissiveMap) material.emissiveMap = texture
    this.made.set(emotion, material)
    return material
  }

  dispose() {
    for (const material of this.made.values()) {
      (material as THREE.MeshStandardMaterial).map?.dispose()
      material.dispose()
    }
    this.made.clear()
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
