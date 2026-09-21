import type { AssetMeta, DecorationType } from '@/types'

function decorationAsset(
  type: DecorationType,
  folder: string,
  file: string,
  worldWidth: number,
  anchorY: number,
): AssetMeta {
  return {
    id: `decoration.${folder}`,
    type,
    src: `/assets/decorations/${folder}/${file}`,
    anchorX: 0.5,
    anchorY,
    defaultScale: 1,
    worldWidth,
    layer: 'decoration',
  }
}

export const decorationAssets: Record<DecorationType, AssetMeta> = {
  BENCH: decorationAsset('BENCH', 'bench', 'bench.webp', 0.08, 0.9),
  TREE: decorationAsset('TREE', 'tree', 'tree.webp', 0.09, 0.96),
  FLOWER: decorationAsset('FLOWER', 'flower', 'flower.webp', 0.035, 0.94),
  BICYCLE: decorationAsset('BICYCLE', 'bicycle', 'bicycle.webp', 0.07, 0.93),
  LAMP: decorationAsset('LAMP', 'lamp', 'lamp.webp', 0.03, 0.96),
  PICNIC_MAT: decorationAsset('PICNIC_MAT', 'picnic', 'picnic-mat.webp', 0.11, 0.7),
}
