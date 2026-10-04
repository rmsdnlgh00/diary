import { type CSSProperties, useEffect, useRef, useState } from 'react'
import {
  MALE_WALK_FRAME_COUNT,
  MALE_WALK_FRAMES_PER_STEP,
  MALE_WALK_SHEETS,
} from '@/data/maleWalkFrames'
import { MALE_WALK_FPS, MALE_WALK_STRIDE } from '@/systems/walkSystem'
import type { DepthConfig } from '@/systems/depthSystem'
import type { WalkDirection } from '@/types'
import { WorldObject } from './WorldObject'

/**
 * 3D 로 렌더한 걷기를 화면에서 확인하기 위한 임시 컴포넌트.
 *
 * 기존 WalkingCharacter 와 구조는 같지만(시트 한 장을 잘라 쓴다) 표정을
 * 덮어씌우는 레이어가 없다. 3D 렌더에는 얼굴이 이미 들어 있기 때문이다.
 *
 * 확인이 끝나면 이 파일과 WALK_TEST 플래그를 지우고 정식 경로로 합친다.
 */

/**
 * 기존 캐릭터 대신 이 테스트 캐릭터를 그릴지.
 * 확인이 끝나면 false 로 되돌리거나 이 파일과 함께 지운다.
 */
export const WALK_TEST = true

/** 기존 캐릭터와 맞춘 화면상 키 (마을 전체 높이 대비) */
const CHARACTER_HEIGHT_FRACTION = 0.08
/** 16:9 이므로 세로 비율을 가로 단위로 환산한다 */
const HEIGHT_TO_WIDTH_UNITS = 9 / 16

const DIRECTIONS = Object.keys(MALE_WALK_SHEETS) as WalkDirection[]

/** 시트에서 한 칸만 보여주는 배경 스타일 */
function cellStyle(direction: WalkDirection, index: number): CSSProperties {
  const sheet = MALE_WALK_SHEETS[direction]
  const col = index % sheet.cols
  const row = Math.floor(index / sheet.cols)
  return {
    backgroundImage: `url(${sheet.src})`,
    backgroundSize: `${sheet.cols * 100}% ${sheet.rows * 100}%`,
    backgroundPosition: `${(col / (sheet.cols - 1)) * 100}% ${(row / (sheet.rows - 1)) * 100}%`,
    backgroundRepeat: 'no-repeat',
  }
}

/*
 * 시트 네 장을 미리 받아 두고, 다 받기 전에는 재생을 시작하지 않는다.
 *
 * 받아 온 Image 를 배열에 붙들고 있는 것이 중요하다. 참조를 버리면 디코드된
 * 비트맵이 회수될 수 있고, 그러면 방향이 바뀌는 순간 그 시트가 아직
 * 준비되지 않아 화면이 한 칸 비면서 깜빡인다.
 */
const preloadedImages: HTMLImageElement[] = []
let preloadStarted = false
const readyWaiters = new Set<() => void>()
let readyCount = 0

function preload(onReady: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  if (readyCount >= DIRECTIONS.length) {
    onReady()
    return () => {}
  }
  readyWaiters.add(onReady)

  if (!preloadStarted) {
    preloadStarted = true
    for (const direction of DIRECTIONS) {
      const image = new Image()
      const done = () => {
        readyCount += 1
        if (readyCount >= DIRECTIONS.length) {
          for (const waiter of readyWaiters) waiter()
          readyWaiters.clear()
        }
      }
      // 한 장이 실패해도 나머지는 계속 돈다.
      image.onload = done
      image.onerror = done
      image.src = MALE_WALK_SHEETS[direction].src
      preloadedImages.push(image)
    }
  }

  return () => readyWaiters.delete(onReady)
}

/** 멈춘 뒤 두 발을 모으는 데 쓰는 시간. 프레임 수에 비례해서 정한다. */
const settleSeconds = (frames: number) => frames / MALE_WALK_FPS

/** 두 프레임 사이의 최단 거리와 방향. 뒤로 가는 쪽이 가까우면 뒤로 간다. */
function shortestStep(from: number, to: number): { steps: number; sign: number } {
  const forward = (to - from + MALE_WALK_FRAME_COUNT) % MALE_WALK_FRAME_COUNT
  const backward = MALE_WALK_FRAME_COUNT - forward
  return forward <= backward ? { steps: forward, sign: 1 } : { steps: backward, sign: -1 }
}

interface Props {
  x: number
  y: number
  direction: WalkDirection
  /** 걷기 시작 후 실제로 나아간 거리. 멈춰 있으면 0 이다. */
  walkDistance: number
  /** 걷는 중일 때만 프레임을 돌린다. */
  moving: boolean
  depthConfig: DepthConfig
  label?: string
  onClick?: () => void
}

export function WalkTestCharacter({
  x,
  y,
  direction,
  walkDistance,
  moving,
  depthConfig,
  label,
  onClick,
}: Props) {
  const [ready, setReady] = useState(false)

  // 시트 네 장이 다 준비된 뒤에 보여준다.
  useEffect(() => preload(() => setReady(true)), [])

  const sheet = MALE_WALK_SHEETS[direction]
  const lastWalkFrame = useRef(sheet.idleFrame)
  const settle = useRef<{ at: number; from: number; steps: number; sign: number } | null>(null)

  /*
   * 프레임을 시간이 아니라 '걸은 거리'로 고른다.
   *
   * 시간으로 고르면 가속·감속 중에 다리는 제 속도로 움직이는데 몸은
   * 느려서 발이 미끄러진다. 거리로 고르면 몸이 느려질 때 다리도 같이
   * 느려지므로 어떤 속도에서도 발이 땅을 잡는다.
   */
  const walkFrame =
    Math.floor((walkDistance / MALE_WALK_STRIDE) * MALE_WALK_FRAMES_PER_STEP) %
    MALE_WALK_FRAME_COUNT

  /*
   * 멈출 때 바로 서 있는 자세로 갈아끼우면 그림이 툭 튄다.
   * 멈춘 자리에서 두 발이 모이는 지점까지 마저 걸어가 자세를 정리한다.
   * 앞뒤 중 가까운 쪽으로 가므로 최대 반 걸음이면 끝난다.
   */
  if (moving) {
    lastWalkFrame.current = walkFrame
    settle.current = null
  } else if (!settle.current) {
    const from = lastWalkFrame.current
    const [a, b] = sheet.settleFrames
    const toA = shortestStep(from, a)
    const toB = shortestStep(from, b)
    const pick = toA.steps <= toB.steps ? toA : toB
    settle.current = { at: performance.now(), from, ...pick }
  }

  const settling = settle.current
  let frame: number
  if (!ready) {
    frame = sheet.idleFrame
  } else if (moving) {
    frame = walkFrame
  } else if (settling) {
    const duration = settleSeconds(settling.steps)
    const progress =
      duration > 0 ? Math.min(1, (performance.now() - settling.at) / (duration * 1000)) : 1
    // 끝으로 갈수록 느려진다. 발을 내려놓고 멈추는 느낌을 준다.
    const eased = 1 - (1 - progress) ** 2
    frame =
      (settling.from + settling.sign * Math.round(eased * settling.steps) + MALE_WALK_FRAME_COUNT) %
      MALE_WALK_FRAME_COUNT
  } else {
    frame = sheet.idleFrame
  }
  // 셀 픽셀 -> 월드 좌표 환산. 캐릭터 키가 화면 높이의 8% 가 되도록 맞춘다.
  const pxToWorld = (CHARACTER_HEIGHT_FRACTION * HEIGHT_TO_WIDTH_UNITS) / sheet.bodyH
  const widthWorld = sheet.cellW * pxToWorld

  return (
    <WorldObject
      x={x}
      y={y}
      width={widthWorld}
      anchorX={sheet.footX / sheet.cellW}
      anchorY={sheet.footY / sheet.cellH}
      depthConfig={depthConfig}
      shadow
      label={label}
      onClick={onClick}
      className="walker walk-test"
    >
      <div
        className="walk-test__frame"
        // 걷는 중인지 밖에서 확인할 수 있게 남겨 둔다. 검증용이다.
        data-moving={moving ? '1' : '0'}
        data-frame={frame}
        style={{
          aspectRatio: `${sheet.cellW} / ${sheet.cellH}`,
          ...cellStyle(direction, frame),
        }}
      />
    </WorldObject>
  )
}
