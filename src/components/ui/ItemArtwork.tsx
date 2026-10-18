import { useAssetSrc } from '@/hooks/useAssetReady'
import type { GameItem } from '@/types'

/** An item's icon (public/assets/…/icon.webp), or its emoji placeholder while it is missing. */
export function ItemArtwork({ item }: { item: GameItem }) {
  const src = useAssetSrc(item.assetPath || null)
  return (
    <span className="item-artwork" aria-hidden="true">
      {src ? <img src={src} alt="" draggable={false} /> : <span>{item.placeholder}</span>}
    </span>
  )
}
