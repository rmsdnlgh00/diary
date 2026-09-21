import type { AssetRef } from '@/types'

export interface PartDefinition {
  id: string
  label: string
  color: string
  accent?: string
  /** 하의 색. 상의와 따로 관리한다. */
  bottom?: string
  asset: AssetRef
}

export const BODIES: Record<string, PartDefinition> = {
  body_default: { id: 'body_default', label: '기본', color: '#fbdcc4', asset: null },
  body_warm: { id: 'body_warm', label: '웜톤', color: '#f2c9a5', asset: null },
}

export const HAIRS: Record<string, PartDefinition> = {
  hair_short: { id: 'hair_short', label: '보울컷', color: '#5b4136', asset: null },
  hair_bob: { id: 'hair_bob', label: '단발', color: '#3f332e', asset: null },
  hair_bun: { id: 'hair_bun', label: '똥머리', color: '#7a5237', asset: null },
  hair_curly: { id: 'hair_curly', label: '곱슬', color: '#a3703f', asset: null },
}

export const OUTFITS: Record<string, PartDefinition> = {
  outfit_sweater_yellow: {
    id: 'outfit_sweater_yellow',
    label: '노란 스웨터',
    color: '#f7e7a6',
    accent: '#e8d488',
    bottom: '#8fa2c6',
    asset: null,
  },
  outfit_tee_blue: {
    id: 'outfit_tee_blue',
    label: '파란 스웨터',
    color: '#a6c0e4',
    accent: '#88a6ce',
    bottom: '#6f7f9e',
    asset: null,
  },
  outfit_hoodie_mint: {
    id: 'outfit_hoodie_mint',
    label: '민트 후드',
    color: '#aadfcb',
    accent: '#8cc6b0',
    bottom: '#8a9a86',
    asset: null,
  },
  outfit_dress_pink: {
    id: 'outfit_dress_pink',
    label: '분홍 스웨터',
    color: '#f8c5d2',
    accent: '#e5a6b6',
    bottom: '#b2889a',
    asset: null,
  },
}

export const ACCESSORIES: Record<string, PartDefinition> = {
  acc_cap: { id: 'acc_cap', label: '캡모자', color: '#6d7a55', asset: null },
  acc_backpack: { id: 'acc_backpack', label: '크로스백', color: '#5b4036', asset: null },
  acc_glasses: { id: 'acc_glasses', label: '안경', color: '#5a4b44', asset: null },
}

export const DEFAULT_APPEARANCE = {
  body: 'body_default',
  hair: 'hair_short',
  outfit: 'outfit_sweater_yellow',
  accessories: ['acc_cap'] as string[],
}
