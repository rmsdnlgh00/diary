import type { AssetMeta, DecorationType, EnvironmentKind, NpcType } from '@/types'
import { decorationAssets } from './decorationAssets'
import { npcAssets } from './npcAssets'
import { worldAssets } from './worldAssets'

export { decorationAssets, npcAssets, worldAssets }

/**
 * 컴포넌트는 에셋 경로를 직접 알지 않는다. 항상 이 조회 함수를 통해 가져온다.
 * 경로가 바뀌어도 게임 로직은 수정할 필요가 없다.
 */

export const getBackgroundAsset = (worldId: string): AssetMeta | undefined =>
  (worldAssets[worldId] ?? worldAssets['2026-09']).background

export const getEnvironmentAsset = (
  worldId: string,
  kind: EnvironmentKind,
): AssetMeta | undefined => worldAssets[worldId]?.environment[kind]

export const getDecorationAsset = (type: DecorationType): AssetMeta => decorationAssets[type]

export const getNpcAsset = (type: NpcType): AssetMeta => npcAssets[type]
