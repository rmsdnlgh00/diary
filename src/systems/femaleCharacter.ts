import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export const FEMALE_CHARACTER_URL = '/assets/characters/female/character-game.glb'

/** Releases an independently loaded female asset after its viewer closes. */
export function disposeFemaleCharacter(root: THREE.Object3D) {
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
  for (const resource of [...geometries, ...materials, ...textures]) resource.dispose()
}

/** Separate materials/UVs: male mood atlases and clothes must not be applied to this model. */
export async function loadFemaleCharacter(height: number) {
  const asset = await new GLTFLoader().loadAsync(FEMALE_CHARACTER_URL)
  const walk = asset.animations.find((clip) => clip.name === 'Walk')
  const idle = asset.animations.find((clip) => clip.name === 'Idle')
  if (!walk || !idle) throw new Error('Female Walk/Idle animations missing')
  const raw = asset.scene
  raw.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(raw)
  const factor = height / (box.max.y - box.min.y)
  raw.scale.multiplyScalar(factor)
  raw.position.y -= box.min.y * factor
  raw.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      object.castShadow = true
      object.frustumCulled = false
    }
  })
  const template = new THREE.Group()
  template.userData.characterModel = 'female'
  template.add(raw)
  return { template, walk, idle }
}
