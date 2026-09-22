import type { AssetMeta, DecorationType, EnvironmentKind, NpcType } from '@/types'
import { decorationAssets } from './decorationAssets'
import { npcAssets } from './npcAssets'
import { worldAssets } from './worldAssets'

export { decorationAssets, npcAssets, worldAssets }

/**
 * 컴포넌트는 에셋 경로를 직접 알지 않는다. 항상 이 조회 함수를 통해 가져온다.
 * 경로가 바뀌어도 게임 로직은 수정할 필요가 없다.
 *
 * 캐릭터 스프라이트는 프레임 보정값과 함께 다뤄야 해서
 * data/characterFrames.ts 에 따로 모아 두었다.
 */

export const getBackgroundAsset = (worldId: string): AssetMeta | undefined =>
  worldAssets[worldId]?.background

export const getEnvironmentAsset = (
  worldId: string,
  kind: EnvironmentKind,
): AssetMeta | undefined => worldAssets[worldId]?.environment[kind]

export const getDecorationAsset = (type: DecorationType): AssetMeta => decorationAssets[type]

export const getNpcAsset = (type: NpcType): AssetMeta => npcAssets[type]
