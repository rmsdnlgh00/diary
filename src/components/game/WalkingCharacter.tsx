import type { CSSProperties } from 'react'
import {
  EMOTION_EYE_ORDER,
  EYES_SHEET,
  SIDE_EYES_SHEET,
  WALK_SHEETS,
} from '@/data/characterFrames'
import { EXPRESSION_HEAD_BOX, expressionFor } from '@/data/expressions'
import type { DepthConfig } from '@/systems/depthSystem'
import type { EmotionId, EquippedItems, WalkDirection } from '@/types'
import { CharacterEquipment } from './CharacterEquipment'
import { WorldObject } from './WorldObject'

/** 캐릭터 키를 마을 전체 높이의 몇 %로 보여줄지 */
export const CHARACTER_HEIGHT_FRACTION = 0.08
/** 16:9 이므로 세로 비율을 가로 단위로 환산한다 */
const HEIGHT_TO_WIDTH_UNITS = 9 / 16

interface Props {
  x: number
  y: number
  emotion: EmotionId
  direction: WalkDirection
  frameIndex: number
  depthConfig: DepthConfig
  zoom?: number
  showAnchors?: boolean
  selected?: boolean
  label?: string
  onClick?: () => void
  /** 말풍선에 띄울 짧은 대사 */
  bubble?: string | null
  /** 머리 위 날짜 표시 */
  tag?: string
  equippedItems?: EquippedItems
}

/** 스프라이트 시트에서 한 칸만 보여주는 배경 스타일 */
function cellStyle(src: string, cols: number, rows: number, index: number): CSSProperties {
  const col = index % cols
  const row = Math.floor(index / cols)
  return {
    backgroundImage: `url(${src})`,
    backgroundSize: `${cols * 100}% ${rows * 100}%`,
    backgroundPosition: `${cols > 1 ? (col / (cols - 1)) * 100 : 0}% ${
      rows > 1 ? (row / (rows - 1)) * 100 : 0
    }%`,
    backgroundRepeat: 'no-repeat',
  }
}

export function WalkingCharacter({
  x,
  y,
  emotion,
  direction,
  frameIndex,
  depthConfig,
  zoom = 1,
  showAnchors = false,
  selected = false,
  label,
  onClick,
  bubble = null,
  tag,
  equippedItems,
}: Props) {
  const sheet = WALK_SHEETS[direction]
  const frame = sheet.frames[frameIndex] ?? sheet.frames[0]

  // 셀 픽셀 -> 월드 좌표 환산. 기준 높이가 화면 높이의 8%가 되도록 맞춘다.
  const pxToWorld = (CHARACTER_HEIGHT_FRACTION * HEIGHT_TO_WIDTH_UNITS) / sheet.refHeight
  const widthWorld = sheet.cellW * pxToWorld

  // offsetX 가 양수면 캐릭터가 오른쪽으로 밀린다 (기준점을 왼쪽으로 옮기는 것과 같다)
  const anchorX = (frame.footX - frame.offsetX) / sheet.cellW
  const anchorY = (frame.footY - frame.offsetY) / sheet.cellH

  // 표정은 정면 그림뿐이라 정면을 볼 때만 얼굴을 덮어쓴다.
  // 머리 박스끼리 맞추므로 프레임마다 머리 크기가 달라도 표정은 흔들리지 않는다.
  const expression =
    direction === 'front'
      ? (() => {
          const size = frame.headW / EXPRESSION_HEAD_BOX.w
          return {
            src: expressionFor(emotion),
            left: `${((frame.headX - EXPRESSION_HEAD_BOX.x * size) / sheet.cellW) * 100}%`,
            top: `${((frame.headY - EXPRESSION_HEAD_BOX.y * size) / sheet.cellH) * 100}%`,
            width: `${(size / sheet.cellW) * 100}%`,
          }
        })()
      : null

  const isSide = direction === 'left' || direction === 'right'
  const eyesSheet = isSide ? (SIDE_EYES_SHEET ?? EYES_SHEET) : EYES_SHEET
  const eyeIndex = Math.max(0, EMOTION_EYE_ORDER.indexOf(emotion))
  // 측면용 눈이 아직 없으면 정면 눈의 한쪽만 잘라 쓴다
  const halfEye = isSide && SIDE_EYES_SHEET === null

  const facePercent = {
    left: `${(frame.faceX / sheet.cellW) * 100}%`,
    top: `${(frame.faceY / sheet.cellH) * 100}%`,
  }
  const eyeWidthPercent = (frame.faceW / sheet.cellW) * 100

  // 방향별 그림을 그대로 쓰므로 좌우 반전이 없고, 글자를 되돌릴 일도 없다
  const unflip: CSSProperties = {}

  return (
    <WorldObject
      x={x}
      y={y}
      width={widthWorld}
      anchorX={anchorX}
      anchorY={anchorY}
      scale={frame.scale * zoom}
      depthConfig={depthConfig}
      shadow
      label={label}
      onClick={onClick}
      className={selected ? 'walker walker--selected' : 'walker'}
    >
      <div
        className="walker__body"
        style={{
          aspectRatio: `${sheet.cellW} / ${sheet.cellH}`,
          ...cellStyle(sheet.src, sheet.cols, sheet.rows, frameIndex),
        }}
      />

      {expression && (
        <img
          className="walker__face"
          src={expression.src}
          alt=""
          draggable={false}
          style={{ left: expression.left, top: expression.top, width: expression.width }}
        />
      )}

      {/* 눈 — 몸과 같은 박스 안에 있으므로 위치·크기·반전을 그대로 공유한다 */}
      {sheet.eyes !== 'none' && (
        <div
          className="walker__eyes"
          style={{
            ...facePercent,
            width: `${halfEye ? eyeWidthPercent / 2 : eyeWidthPercent}%`,
            aspectRatio: halfEye
              ? `${eyesSheet.cellW / 2} / ${eyesSheet.cellH}`
              : `${eyesSheet.cellW} / ${eyesSheet.cellH}`,
          }}
        >
          <div
            className="walker__eyes-inner"
            style={{
              width: halfEye ? '200%' : '100%',
              left: halfEye ? '-100%' : '0',
              aspectRatio: `${eyesSheet.cellW} / ${eyesSheet.cellH}`,
              ...cellStyle(eyesSheet.src, eyesSheet.cols, eyesSheet.rows, eyeIndex),
            }}
          />
        </div>
      )}

      {bubble && (
        <span className="walker__bubble" style={unflip}>
          {bubble}
        </span>
      )}

      {tag && (
        <span className="walker__tag" style={unflip}>
          {tag}
        </span>
      )}

      {equippedItems && <CharacterEquipment equippedItems={equippedItems} compact />}

      {showAnchors && (
        <>
          <span
            className="walker__mark walker__mark--foot"
            style={{ left: `${anchorX * 100}%`, top: `${anchorY * 100}%` }}
          />
          <span className="walker__mark walker__mark--face" style={facePercent} />
          <span
            className="walker__facebox"
            style={{
              ...facePercent,
              width: `${eyeWidthPercent}%`,
              aspectRatio: `${eyesSheet.cellW} / ${eyesSheet.cellH}`,
            }}
          />
        </>
      )}
    </WorldObject>
  )
}
