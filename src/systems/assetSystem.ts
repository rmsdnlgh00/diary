import type { AssetRef } from '@/types'

const ASSET_ROOT = '/assets'

/**
 * 데이터의 asset 값이 null이면 placeholder(SVG 도형)로 그린다.
 * 실제 PNG/WebP를 public/assets 아래에 넣고 데이터의 asset 경로만 채우면
 * 컴포넌트 수정 없이 이미지로 교체된다.
 */
export function resolveAsset(ref: AssetRef): string | null {
  if (!ref) return null
  if (ref.startsWith('http') || ref.startsWith('/')) return ref
  return `${ASSET_ROOT}/${ref}`
}

export const hasAsset = (ref: AssetRef): boolean => resolveAsset(ref) !== null
