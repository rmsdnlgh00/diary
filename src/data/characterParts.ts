import type { AssetRef } from '@/types'

export interface PartDefinition {
  id: string
  label: string
  color: string
  accent?: string
  asset: AssetRef
}

export const BODIES: Record<string, PartDefinition> = {
  body_default: { id: 'body_default', label: '기본', color: '#ffddc2', asset: null },
  body_warm: { id: 'body_warm', label: '웜톤', color: '#f3c8a4', asset: null },
}

export const HAIRS: Record<string, PartDefinition> = {
  hair_short: { id: 'hair_short', label: '단발', color: '#6b4a3a', asset: null },
  hair_bob: { id: 'hair_bob', label: '보브', color: '#3f3733', asset: null },
  hair_bun: { id: 'hair_bun', label: '똥머리', color: '#8a5a3b', asset: null },
  hair_curly: { id: 'hair_curly', label: '곱슬', color: '#c88a4d', asset: null },
}

export const OUTFITS: Record<string, PartDefinition> = {
  outfit_tee_blue: {
    id: 'outfit_tee_blue',
    label: '파란 티셔츠',
    color: '#7fb4f0',
    accent: '#5f97d9',
    asset: null,
  },
  outfit_hoodie_mint: {
    id: 'outfit_hoodie_mint',
    label: '민트 후드',
    color: '#8fd8c2',
    accent: '#6cbfa8',
    asset: null,
  },
  outfit_sweater_yellow: {
    id: 'outfit_sweater_yellow',
    label: '노란 스웨터',
    color: '#ffd36e',
    accent: '#efb945',
    asset: null,
  },
  outfit_dress_pink: {
    id: 'outfit_dress_pink',
    label: '분홍 원피스',
    color: '#ffa9c4',
    accent: '#ef8cab',
    asset: null,
  },
}

export const ACCESSORIES: Record<string, PartDefinition> = {
  acc_cap: { id: 'acc_cap', label: '모자', color: '#ff8f6b', asset: null },
  acc_backpack: { id: 'acc_backpack', label: '가방', color: '#b189e8', asset: null },
  acc_glasses: { id: 'acc_glasses', label: '안경', color: '#5a4b44', asset: null },
}

export const DEFAULT_APPEARANCE = {
  body: 'body_default',
  hair: 'hair_short',
  outfit: 'outfit_tee_blue',
  accessories: [] as string[],
}
