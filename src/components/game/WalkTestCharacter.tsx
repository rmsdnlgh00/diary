import { type CSSProperties, useEffect, useState } from 'react'
import { MALE_WALK_FRAME_COUNT, MALE_WALK_SHEETS } from '@/data/maleWalkFrames'
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

/** 재생 속도 */
const FPS = 12

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

interface Props {
  x: number
  y: number
  direction: WalkDirection
  depthConfig: DepthConfig
  label?: string
  onClick?: () => void
}

export function WalkTestCharacter({ x, y, direction, depthConfig, label, onClick }: Props) {
  const [frame, setFrame] = useState(0)
  const [ready, setReady] = useState(false)

  // 시트 네 장이 다 준비된 뒤에 돌리기 시작한다. 그 전에는 첫 장으로 서 있는다.
  useEffect(() => preload(() => setReady(true)), [])

  useEffect(() => {
    if (!ready) return
    const timer = window.setInterval(
      () => setFrame((f) => (f + 1) % MALE_WALK_FRAME_COUNT),
      1000 / FPS,
    )
    return () => window.clearInterval(timer)
  }, [ready])

  const sheet = MALE_WALK_SHEETS[direction]
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
        style={{
          aspectRatio: `${sheet.cellW} / ${sheet.cellH}`,
          ...cellStyle(direction, frame),
        }}
      />
    </WorldObject>
  )
}
