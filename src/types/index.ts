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

export type AssetLayer = 'background' | 'environment' | 'decoration' | 'npc' | 'character' | 'ui'

/**
 * 에셋 한 장의 메타데이터.
 * src 파일이 아직 없어도 예상 경로를 미리 적어둔다.
 * 파일을 public/assets 아래에 넣으면 코드 수정 없이 placeholder가 이미지로 바뀐다.
 */
export interface AssetMeta {
  id: string
  /** placeholder를 고르고 분류하는 데 쓰는 종류 */
  type: string
  src: AssetRef
  /** 원본 픽셀 크기(참고용) */
  width?: number
  height?: number
  /** 이미지 안에서 "바닥에 닿는 지점". 나무 밑동, 캐릭터 발. */
  anchorX: number
  anchorY: number
  defaultScale: number
  /** 월드 가로 길이 대비 기본 폭 */
  worldWidth: number
  layer: AssetLayer
}

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
  equippedItems: EquippedItems
}

export type ClothingCategory = 'hat' | 'top' | 'bottom' | 'shoes' | 'bag' | 'accessory'
export type ItemCategory = ClothingCategory | 'decoration'
export type EquippedItems = Record<ClothingCategory, string | null>

export interface GameItem {
  id: string
  name: string
  category: ItemCategory
  price: number
  /** /src/assets/... 또는 /assets/... (public). 비어 있거나 누락되면 placeholder. */
  assetPath: string
  placeholder: string
  description?: string
  worldWidth?: number
}

export interface Inventory {
  clothes: string[]
  decorations: string[]
}

/** 기존 월드와 동일한 0~1 비율 좌표. 픽셀 값을 저장하지 않는다. */
export interface PlacedDecoration {
  id: string
  itemId: string
  x: number
  y: number
}

export type WorldDecorations = Record<string, PlacedDecoration[]>

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
  /** 에셋의 worldWidth를 덮어쓰고 싶을 때만 */
  width?: number
  scale?: number
  /** 바닥에 붙는 오브젝트는 깊이 정렬에서 제외하고 항상 지면 레이어에 그린다. */
  flat?: boolean
  flipX?: boolean
}

export type NpcType = 'DOG'

export interface NpcData {
  id: string
  type: NpcType
  x: number
  y: number
  scale: number
}

/** normalized 사각 영역 */
export interface AreaRect {
  id: string
  x: [number, number]
  y: [number, number]
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
  /** 배경 이미지가 없을 때 그리는 placeholder 색 */
  palette: WorldPalette
  environment: EnvironmentObject[]
  decorations: DecorationData[]
  npcs: NpcData[]
  /** 캐릭터가 설 수 있는 영역 */
  walkableAreas: AreaRect[]
  /** 연못, 건물 안, 큰 장식물처럼 설 수 없는 영역 */
  blockedAreas: AreaRect[]
}

export type PanelId = 'DIARY' | 'SHOP' | 'CHARACTER' | 'DECORATE'

/** 방향마다 별도의 그림이 있다. 좌우 반전으로 만들어 쓰지 않는다. */
export type WalkDirection = 'front' | 'back' | 'left' | 'right'

/** 화면상 이동 방향. */
export type Facing = 'down' | 'up' | 'right' | 'left'

export interface FrameMeta {
  /** 셀 안에서 캐릭터가 땅을 딛는 지점 (px) */
  footX: number
  footY: number
  /** 프레임 간 크기 편차 보정 */
  scale: number
  /** 눈으로 보고 미세 조정하는 값 */
  offsetX: number
  offsetY: number
  /** 눈 에셋을 붙일 얼굴 기준점 (px) */
  faceX: number
  faceY: number
  /** 얼굴(눈) 폭 (px) */
  faceW: number
  /** 머리(모자 포함) 박스. 표정 그림을 이 자리에 겹쳐 원래 얼굴을 덮는다. (px) */
  headX: number
  headY: number
  headW: number
}

export interface DirectionSheet {
  src: string
  cols: number
  rows: number
  cellW: number
  cellH: number
  /** 프레임별 scale 보정의 기준이 된 콘텐츠 높이 */
  refHeight: number
  /** 이 방향에서 눈을 어떻게 그릴지 */
  eyes: 'both' | 'single' | 'none'
  frames: FrameMeta[]
  /**
   * 실제로 재생할 프레임 번호와 순서.
   * 들어온 그림이 제대로 된 걷기 사이클이 아니면 전부 돌리는 대신
   * 자세 차이가 크고 크기 편차가 작은 몇 장만 골라 쓴다.
   */
  sequence: number[]
}
