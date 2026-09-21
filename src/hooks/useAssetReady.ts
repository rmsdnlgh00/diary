import { useSyncExternalStore } from 'react'
import { getAssetStatus, resolveAsset, subscribeAssets } from '@/systems/assetSystem'
import type { AssetRef } from '@/types'

/** 파일이 실제로 로드된 경우에만 경로를 돌려준다. 없으면 null → placeholder. */
export function useAssetSrc(ref: AssetRef): string | null {
  const src = resolveAsset(ref)
  const status = useSyncExternalStore(
    subscribeAssets,
    () => (src ? getAssetStatus(src) : 'missing'),
    () => 'loading' as const,
  )

  return src && status === 'ready' ? src : null
}
