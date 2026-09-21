/**
 * 모든 좌표는 게임 월드 기준 normalized 값(0~1)이다.
 * 브라우저 크기가 바뀌어도 상대 위치가 유지되도록 픽셀 값을 저장하지 않는다.
 */

export type EmotionId = 'HAPPY' | 'JOYFUL' | 'NORMAL' | 'SAD' | 'ANGRY' | 'ANNOYED'

export interface EmotionDefinition {
  id: EmotionId
  label: string
  description: string
  /** placeholder 렌더링과 UI 뱃지에 쓰는 색 */
  color: string
  /** 실제 PNG를 넣으면 이 경로만 채우면 된다. */
  asset: string | null
}

export interface EmotionResult {
  emotion: EmotionId
  confidence: number
}

export type AssetRef = string | null

export interface DiaryEntry {
  id: string
  /** YYYY-MM-DD */
  date: string
  text: string
  emotion: EmotionId
  emotionConfidence: number
  characterId: string
  createdAt: number
  updatedAt: number
}

export interface CharacterAppearance {
  body: string
  hair: string
  outfit: string
  accessories: string[]
}

export interface DiaryCharacterData extends CharacterAppearance {
  id: string
  /** YYYY-MM-DD */
  diaryDate: string
  diaryText: string
  emotion: EmotionId
  emotionConfidence: number
  x: number
  y: number
  /** 깊이 스케일과 별개로 적용되는 개별 보정값 */
  scale: number
  createdAt: number
}

export type DecorationType =
  | 'BENCH'
  | 'TREE'
  | 'FLOWER'
  | 'BICYCLE'
  | 'LAMP'
  | 'PICNIC_MAT'

export interface DecorationData {
  id: string
  type: DecorationType
  x: number
  y: number
  scale: number
  rotation: number
  createdAt: number
}

export type EnvironmentKind =
  | 'SHOP'
  | 'POND'
  | 'BRIDGE'
  | 'PATH'
  | 'FENCE'
  | 'BIG_TREE'
  | 'BUSH'

export interface EnvironmentObject {
  id: string
  kind: EnvironmentKind
  x: number
  y: number
  /** 월드 가로 길이 대비 비율 */
  width: number
  /** 바닥에 붙는 오브젝트는 깊이 정렬에서 제외하고 항상 지면 레이어에 그린다. */
  flat?: boolean
  flipX?: boolean
  asset?: AssetRef
}

export interface SpawnZone {
  id: string
  xRange: [number, number]
  yRange: [number, number]
}

export interface WorldPalette {
  skyTop: string
  skyBottom: string
  hillFar: string
  hillNear: string
  groundBack: string
  groundFront: string
}

export interface WorldDefinition {
  /** YYYY-MM */
  id: string
  year: number
  month: number
  label: string
  /** 이 y값 위쪽은 원경이라 오브젝트를 배치하지 않는다. */
  horizonY: number
  palette: WorldPalette
  backgroundAsset: AssetRef
  environment: EnvironmentObject[]
  spawnZones: SpawnZone[]
}

export type PanelId = 'DIARY' | 'SHOP' | 'CHARACTER' | 'DECORATE'
