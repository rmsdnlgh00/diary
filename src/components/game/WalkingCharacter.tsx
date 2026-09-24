import { type CSSProperties, useRef } from 'react'
import {
  EMOTION_EYE_ORDER,
  EYES_SHEET,
  SIDE_EYES_SHEET,
  WALK_SHEETS,
} from '@/data/characterFrames'
import { EXPRESSION_HEAD_BOX, expressionFor } from '@/data/expressions'
import { SIDE_NECK_ANCHORS, sideExpressionFor } from '@/data/sideExpressions'
import { useAssetSrc } from '@/hooks/useAssetReady'
import type { DepthConfig } from '@/systems/depthSystem'
import { WALK_CONFIG } from '@/systems/walkSystem'
import type { EmotionId, EquippedItems, WalkDirection } from '@/types'
import { CharacterEquipment } from './CharacterEquipment'
import { WorldObject } from './WorldObject'

/** 캐릭터 키를 마을 전체 높이의 몇 %로 보여줄지 */
export const CHARACTER_HEIGHT_FRACTION = 0.08
/** 16:9 이므로 세로 비율을 가로 단위로 환산한다 */
const HEIGHT_TO_WIDTH_UNITS = 9 / 16
/** 걸을 때 몸이 떠오르는 높이. 스프라이트 셀 높이 대비 %. */
const BOB_PERCENT = 1.4
/** 걸을 때 몸이 좌우로 기우는 각도 */
const SWAY_DEGREES = 1.1
/** 방향이 바뀐 뒤 출렁임이 잦아들 때까지의 시간(초) */
const TURN_SECONDS = 0.22
/** 방향이 바뀔 때 몸이 눌리는 정도 */
const TURN_SQUASH = 0.07

interface Props {
  x: number
  y: number
  emotion: EmotionId
  direction: WalkDirection
  frameIndex: number
  /** 걷기 시작 후 흐른 시간(초). 몸을 위아래로 흔드는 데 쓴다. */
  walkTime?: number
  /** 걷는 중일 때만 흔든다. 서 있으면 가만히 둔다. */
  moving?: boolean
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

/**
 * 스프라이트 시트에서 한 칸만 보여주는 배경 스타일.
 *
 * 같은 값을 CSS 변수로도 내보낸다. 실루엣 위에 빛을 얹을 때
 * 이 칸을 그대로 mask 로 다시 써야 하기 때문이다.
 */
function cellStyle(src: string, cols: number, rows: number, index: number): CSSProperties {
  const col = index % cols
  const row = Math.floor(index / cols)
  const image = `url(${src})`
  const size = `${cols * 100}% ${rows * 100}%`
  const position = `${cols > 1 ? (col / (cols - 1)) * 100 : 0}% ${
    rows > 1 ? (row / (rows - 1)) * 100 : 0
  }%`
  return {
    backgroundImage: image,
    backgroundSize: size,
    backgroundPosition: position,
    backgroundRepeat: 'no-repeat',
    '--cell-image': image,
    '--cell-size': size,
    '--cell-position': position,
  } as CSSProperties
}

export function WalkingCharacter({
  x,
  y,
  emotion,
  direction,
  frameIndex,
  walkTime = 0,
  moving = false,
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
  const sideExpression = sideExpressionFor(emotion, direction)
  const sideSrc = useAssetSrc(sideExpression?.src ?? null)
  const neck = direction === 'left' || direction === 'right'
    ? SIDE_NECK_ANCHORS[direction][frameIndex] : undefined
  // 이미지가 준비되기 전에는 기존 캐릭터 전체를 보여주어 빈 머리가 나타나지 않는다.
  const sideHead = sideExpression && sideSrc && neck ? (() => {
    const neckRatio = (sideExpression.neckX - sideExpression.head.x) / sideExpression.head.w
    const anchorRatio = direction === 'left' ? 1 - neckRatio : neckRatio
    return {
      left: `${((neck.x - anchorRatio * frame.headW) / sheet.cellW) * 100}%`,
      top: `${(frame.headY / sheet.cellH) * 100}%`,
      width: `${(frame.headW / sheet.cellW) * 100}%`,
      height: `${((neck.y - frame.headY + 1) / sheet.cellH) * 100}%`,
      transform: direction === 'left' ? 'scaleX(-1)' : undefined,
    }
  })() : null

  // 셀 픽셀 -> 월드 좌표 환산. 기준 높이가 화면 높이의 8%가 되도록 맞춘다.
  const pxToWorld = (CHARACTER_HEIGHT_FRACTION * HEIGHT_TO_WIDTH_UNITS) / sheet.refHeight
  const widthWorld = sheet.cellW * pxToWorld

  // offsetX 가 양수면 캐릭터가 오른쪽으로 밀린다 (기준점을 왼쪽으로 옮기는 것과 같다)
  const anchorX = (frame.footX - frame.offsetX) / sheet.cellW
  const anchorY = (frame.footY - frame.offsetY) / sheet.cellH

  // 정면 표정은 기존 머리 박스에 맞추고, 측면 표정은 아래에서 목 기준으로 맞춘다.
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

  /*
   * 걸을 때 몸을 위아래로 흔든다.
   *
   * 프레임이 바뀌는 순간(t = k/fps)에 phase 가 정확히 0 이 되도록 맞췄다.
   * 그래서 그림이 갈아끼워질 때 몸이 가장 낮고, 프레임 중간에 가장 높다.
   * 지금 걷기 그림이 방향당 2장뿐이라 그것만으로는 토글처럼 보이는데,
   * 이 오르내림이 그 사이를 메워 걷는 것처럼 읽히게 한다.
   */
  const stridePhase = Math.PI * WALK_CONFIG.fps * walkTime
  // 한 걸음에 한 번 오르내린다.
  const lift = moving ? Math.abs(Math.sin(stridePhase)) : 0
  const bobPercent = -lift * BOB_PERCENT
  // 좌우 기울기는 두 걸음에 한 번 왕복한다.
  const swayDegrees = moving ? Math.sin(stridePhase) * SWAY_DEGREES : 0

  /*
   * 방향이 바뀌면 그림이 한 프레임 만에 갈아끼워져 툭 튀어 보인다.
   * 바뀐 직후 몸을 한 번 눌렀다 펴서(스쿼시) 그 순간을 덮는다.
   * 이 컴포넌트는 매 프레임 다시 그려지므로 시각을 직접 읽어 진행도를 구한다.
   */
  const turn = useRef({ direction, at: 0 })
  if (turn.current.direction !== direction) {
    turn.current = { direction, at: performance.now() }
  }
  const turnProgress = Math.min(1, (performance.now() - turn.current.at) / (TURN_SECONDS * 1000))
  // 눌렸다(양수) 펴지는(음수) 한 번의 출렁임. 끝에서는 0 으로 잦아든다.
  const squash = (1 - turnProgress) * Math.cos(turnProgress * Math.PI * 1.5) * TURN_SQUASH

  // 몸은 방향별 그림을 그대로 쓴다. 측면 표정만 반전하므로 말풍선·날짜는 영향받지 않는다.
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
      shadowLift={lift}
      label={label}
      onClick={onClick}
      className={selected ? 'walker walker--selected' : 'walker'}
    >
      {/* 몸·표정·눈을 한 겹으로 묶어 함께 흔든다. 말풍선·날짜·그림자는 밖에 남는다. */}
      <div
        className="walker__art"
        style={{
          // 발 기준점을 축으로 돌고 눌려야 발이 땅에서 떨어지지 않는다.
          transformOrigin: `${anchorX * 100}% ${anchorY * 100}%`,
          transform:
            `translateY(${bobPercent}%) rotate(${swayDegrees}deg) scale(${1 + squash}, ${1 - squash})`,
        }}
      >
        <div
          className="walker__body"
          style={{
            aspectRatio: `${sheet.cellW} / ${sheet.cellH}`,
            ...cellStyle(sheet.src, sheet.cols, sheet.rows, frameIndex),
            clipPath: sideHead && neck ? `inset(${((neck.y - 1) / sheet.cellH) * 100}% 0 0 0)` : undefined,
          }}
        />

        {sideHead && sideExpression && sideSrc && (
          <svg className="walker__side-face" aria-hidden="true" focusable="false"
            data-side-expression={emotion} data-direction={direction}
            viewBox={`${sideExpression.head.x} ${sideExpression.head.y} ${sideExpression.head.w} ${sideExpression.head.h + 2}`}
            preserveAspectRatio="none" style={sideHead}>
            <image href={sideSrc} width={sideExpression.width} height={sideExpression.height} />
          </svg>
        )}

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
      </div>

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
