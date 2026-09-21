import type { ReactNode } from 'react'
import { useAssetSrc } from '@/hooks/useAssetReady'
import type { AssetMeta } from '@/types'

interface Props {
  asset?: AssetMeta
  /** 에셋 파일이 아직 없을 때 대신 그릴 도형 */
  placeholder: ReactNode
  className?: string
}

/**
 * 모든 월드 오브젝트는 이 컴포넌트를 통해 그려진다.
 * 레지스트리에 적힌 경로에 파일이 있으면 이미지, 없으면 placeholder.
 */
export function Sprite({ asset, placeholder, className }: Props) {
  const src = useAssetSrc(asset?.src ?? null)

  if (!src) return <>{placeholder}</>

  return (
    <img
      className={className ? `sprite ${className}` : 'sprite'}
      src={src}
      alt=""
      draggable={false}
      decoding="async"
      loading="lazy"
    />
  )
}
