import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ITEMS } from '@/data/items'

/**
 * Clothes from clothes-v1.glb (scripts/export-clothes.py), by item id. Tops and bottoms are
 * skinned to the same armature as the character, so they are re-bound to each character's
 * own bones; hats, hoods and buttons hang from a bone and are cloned onto that bone.
 */
export type ClothingPart = { skinned: THREE.SkinnedMesh } | { rigid: THREE.Object3D; bone: string }
const ITEM_IDS = ITEMS.map((item) => item.id).sort((a, b) => b.length - a.length)

export function collectClothes(root: THREE.Object3D): Map<string, ClothingPart[]> {
  const clothes = new Map<string, ClothingPart[]>()
  root.updateMatrixWorld(true)
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

/**
 * Dress a character (a clone of the character GLB): removes `worn`, binds the clothes for
 * `ids` to its bones and returns the new clothing objects. Geometry and materials stay
 * shared with the clothes file.
 */
export function dressCharacter(character: THREE.Object3D, worn: readonly THREE.Object3D[], ids: readonly string[],
  clothes: Map<string, ClothingPart[]>): THREE.Object3D[] {
  for (const object of worn) object.removeFromParent()
  let body: THREE.SkinnedMesh | null = null
  character.traverse((o) => { if (!body && (o as THREE.SkinnedMesh).isSkinnedMesh) body = o as THREE.SkinnedMesh })
  const skinnedBody = body as THREE.SkinnedMesh | null
  if (!skinnedBody?.parent) return []
  const bones = new Map(skinnedBody.skeleton.bones.map((bone) => [bone.name, bone]))
  const added: THREE.Object3D[] = []
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
        added.push(mesh)
      } else {
        const bone = bones.get(part.bone)
        if (!bone) continue
        const object = part.rigid.clone()
        object.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true })
        bone.add(object)
        added.push(object)
      }
    }
  }
  return added
}

/** The character and its clothes, loaded once and shared by the wardrobe preview. */
export interface CharacterKit {
  /** The light character, scaled to `height` with its feet at y = 0. Clone it before use. */
  template: THREE.Object3D
  idle: THREE.AnimationClip
  clothes: Map<string, ClothingPart[]>
}

let kit: Promise<CharacterKit> | null = null

export function loadCharacterKit(height = 1.7): Promise<CharacterKit> {
  kit ??= (async () => {
    const draco = new DRACOLoader().setDecoderPath('/draco/').setDecoderConfig({ type: 'wasm' })
    const loader = new GLTFLoader().setDRACOLoader(draco)
    const [walk, idle, clothesFile] = await Promise.all([
      loader.loadAsync('/assets/characters/male/character-walk-light.glb'),
      loader.loadAsync('/assets/characters/male/character-idle-anim.glb'),
      loader.loadAsync('/assets/characters/male/clothes-v1.glb').catch(() => null),
    ])
    draco.dispose()
    const clip = idle.animations[0]?.clone()
    if (!clip) throw new Error('Character animation missing')
    for (const track of clip.tracks) track.name = track.name.replace(/_\d+(?=\.)/, '')
    const raw = walk.scene
    const box = new THREE.Box3().setFromObject(raw)
    const factor = height / (box.max.y - box.min.y)
    raw.scale.setScalar(factor)
    raw.position.y = -box.min.y * factor
    const template = new THREE.Group()
    template.add(raw)
    return { template, idle: clip, clothes: clothesFile ? collectClothes(clothesFile.scene) : new Map() }
  })()
  kit.catch(() => { kit = null })
  return kit
}
