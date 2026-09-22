import { useAssetSrc } from '@/hooks/useAssetReady'
import type { GameItem } from '@/types'

// Vite가 src 에셋도 프로덕션 빌드에 포함한다. 비어 있는 폴더도 안전하다.
const sourceAssets = import.meta.glob([
  '/src/assets/character/clothes/**/*.{png,webp,jpg,jpeg,svg}',
  '/src/assets/decorations/**/*.{png,webp,jpg,jpeg,svg}',
], {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>

export function ItemArtwork({ item }: { item: GameItem }) {
  const path = item.assetPath.replace(/^@\//, '/src/').replace(/^src\//, '/src/')
  const source = path.startsWith('/src/') ? sourceAssets[path] ?? null : path
  const src = useAssetSrc(source)
  return (
    <span className="item-artwork" aria-hidden="true">
      {src ? <img src={src} alt="" draggable={false} /> : <span>{item.placeholder}</span>}
    </span>
  )
}
