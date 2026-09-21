import { ACCESSORIES, BODIES, HAIRS, OUTFITS } from '@/data/characterParts'
import { EMOTION_IDS } from '@/data/emotions'
import type { AssetMeta, EmotionId } from '@/types'

/** 캐릭터 레이어는 모두 같은 박스를 채우므로 anchor(발 위치)를 공유한다. */
const CHARACTER_WORLD_WIDTH = 0.029
const ANCHOR_X = 0.5
const ANCHOR_Y = 130 / 132

function layerAsset(kind: string, folder: string, id: string): AssetMeta {
  return {
    id: `character.${kind}.${id}`,
    type: `CHARACTER_${kind.toUpperCase()}`,
    src: `/assets/characters/${folder}/${id}.webp`,
    anchorX: ANCHOR_X,
    anchorY: ANCHOR_Y,
    defaultScale: 1,
    worldWidth: CHARACTER_WORLD_WIDTH,
    layer: 'character',
  }
}

const fromParts = (kind: string, folder: string, parts: Record<string, { id: string }>) =>
  Object.fromEntries(
    Object.keys(parts).map((id) => [id, layerAsset(kind, folder, id)]),
  ) as Record<string, AssetMeta>

/**
 * 레이어로 나뉘지 않은 통짜 캐릭터 이미지.
 * 감정별로 한 장씩 그려진 에셋을 쓸 때 이 경로에 넣는다.
 * 이게 있으면 레이어 합성을 건너뛰고 이 이미지만 그린다.
 */
const fullAsset = (name: string): AssetMeta => ({
  id: `character.full.${name}`,
  type: 'CHARACTER_FULL',
  src: `/assets/characters/full/${name}.webp`,
  anchorX: ANCHOR_X,
  anchorY: 0.99,
  defaultScale: 1,
  worldWidth: CHARACTER_WORLD_WIDTH,
  layer: 'character',
})

/** 감정별 그림이 아직 없을 때 쓰는 기본 전신 그림. */
export const characterFullBase = fullAsset('base')

export const characterAssets = {
  full: Object.fromEntries(
    EMOTION_IDS.map((id) => [id, fullAsset(id.toLowerCase())]),
  ) as Record<EmotionId, AssetMeta>,
  body: fromParts('body', 'body', BODIES),
  emotion: Object.fromEntries(
    EMOTION_IDS.map((id) => [id, layerAsset('emotion', 'emotions', id.toLowerCase())]),
  ) as Record<EmotionId, AssetMeta>,
  hair: fromParts('hair', 'hair', HAIRS),
  outfit: fromParts('outfit', 'outfits', OUTFITS),
  accessory: fromParts('accessory', 'accessories', ACCESSORIES),
}

export const CHARACTER_ANCHOR = { x: ANCHOR_X, y: ANCHOR_Y }
export { CHARACTER_WORLD_WIDTH }
