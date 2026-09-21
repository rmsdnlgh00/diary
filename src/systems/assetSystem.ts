import type { AssetMeta, AssetRef } from '@/types'

export type AssetStatus = 'loading' | 'ready' | 'missing'

const statuses = new Map<string, AssetStatus>()
const subscribers = new Set<() => void>()

const notify = () => {
  for (const callback of subscribers) callback()
}

export function subscribeAssets(callback: () => void): () => void {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

/**
 * 에셋 파일이 실제로 있는지 한 번만 확인하고 결과를 캐싱한다.
 * 파일이 없으면 'missing'이 되고 호출한 쪽에서 placeholder를 그린다.
 */
export function getAssetStatus(src: string): AssetStatus {
  const known = statuses.get(src)
  if (known) return known

  statuses.set(src, 'loading')

  if (typeof window === 'undefined') return 'loading'

  const image = new Image()
  image.decoding = 'async'
  image.onload = () => {
    statuses.set(src, 'ready')
    notify()
  }
  image.onerror = () => {
    statuses.set(src, 'missing')
    notify()
  }
  image.src = src

  return statuses.get(src) ?? 'loading'
}

export function resolveAsset(ref: AssetRef): string | null {
  if (!ref) return null
  return ref.startsWith('http') || ref.startsWith('/') ? ref : `/assets/${ref}`
}

/** 에셋 메타가 없을 때도 안전하게 기본값을 준다. */
export const anchorOf = (asset: AssetMeta | undefined): { x: number; y: number } => ({
  x: asset?.anchorX ?? 0.5,
  y: asset?.anchorY ?? 1,
})
