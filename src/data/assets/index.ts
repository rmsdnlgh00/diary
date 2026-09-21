import type { AssetMeta, DecorationType, EmotionId, EnvironmentKind, NpcType } from '@/types'
import { characterAssets } from './characterAssets'
import { decorationAssets } from './decorationAssets'
import { npcAssets } from './npcAssets'
import { worldAssets } from './worldAssets'

export { characterAssets, decorationAssets, npcAssets, worldAssets }
export { CHARACTER_ANCHOR, CHARACTER_WORLD_WIDTH } from './characterAssets'

/**
 * 컴포넌트는 에셋 경로를 직접 알지 않는다. 항상 이 조회 함수를 통해 가져온다.
 * 경로가 바뀌어도 게임 로직은 수정할 필요가 없다.
 */

export const getBackgroundAsset = (worldId: string): AssetMeta | undefined =>
  worldAssets[worldId]?.background

export const getEnvironmentAsset = (
  worldId: string,
  kind: EnvironmentKind,
): AssetMeta | undefined => worldAssets[worldId]?.environment[kind]

export const getDecorationAsset = (type: DecorationType): AssetMeta => decorationAssets[type]

export const getNpcAsset = (type: NpcType): AssetMeta => npcAssets[type]

export { characterFullBase } from './characterAssets'
export const getCharacterFullAsset = (id: EmotionId): AssetMeta => characterAssets.full[id]
export const getCharacterBodyAsset = (id: string): AssetMeta | undefined => characterAssets.body[id]
export const getCharacterEmotionAsset = (id: EmotionId): AssetMeta => characterAssets.emotion[id]
export const getCharacterHairAsset = (id: string): AssetMeta | undefined => characterAssets.hair[id]
export const getCharacterOutfitAsset = (id: string): AssetMeta | undefined =>
  characterAssets.outfit[id]
export const getCharacterAccessoryAsset = (id: string): AssetMeta | undefined =>
  characterAssets.accessory[id]
