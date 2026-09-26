import { useEffect, useState } from 'react'
import type { DepthConfig } from '@/systems/depthSystem'
import { WorldObject } from './WorldObject'

/**
 * 새로 렌더한 걷기 프레임을 화면에서 확인하기 위한 임시 컴포넌트.
 *
 * 기존 WalkingCharacter 는 스프라이트 시트 한 장을 잘라 쓰지만, 여기서는
 * 낱장 PNG 32 장을 그대로 돌린다. pack-sprites 로 시트를 만들기 전에
 * 애니메이션 자체가 제대로 나오는지만 먼저 보기 위한 것이다.
 *
 * 확인이 끝나면 이 파일과 WALK_TEST 플래그를 지우고 정식 경로로 옮긴다.
 */

/**
 * 기존 캐릭터 대신 이 테스트 캐릭터를 그릴지.
 * 확인이 끝나면 false 로 되돌리거나 이 파일과 함께 지운다.
 */
export const WALK_TEST = true

/** 재생 속도 */
const FPS = 12
const FRAME_COUNT = 32

/**
 * 아래 값들은 렌더된 프레임의 알파 경계를 실측한 것이다.
 * 1024x1024 캔버스 안에서 캐릭터가 차지하는 영역이 작아서,
 * 기존 캐릭터와 같은 크기로 보이게 하려면 이 비율만큼 키워야 한다.
 */
/** 캐릭터 키가 캔버스 높이에서 차지하는 비율 */
const BODY_HEIGHT_RATIO = 0.5013
/** 캔버스 위에서 발이 닿는 지점 */
const FOOT_Y_RATIO = 0.7744
/** 캔버스 안에서 캐릭터의 가로 중심 */
const CENTER_X_RATIO = 0.5023

/** 기존 캐릭터와 맞춘 화면상 키 (마을 전체 높이 대비) */
const CHARACTER_HEIGHT_FRACTION = 0.08
/** 16:9 이므로 세로 비율을 가로 단위로 환산한다 */
const HEIGHT_TO_WIDTH_UNITS = 9 / 16

const framePath = (index: number): string =>
  `/assets/characters/male/walk/front/${String(index + 1).padStart(4, '0')}.png`

/*
 * 32 장을 미리 받아 두고, 다 받기 전에는 재생을 시작하지 않는다.
 *
 * 받아 온 Image 를 배열에 붙들고 있는 것이 중요하다. 참조를 버리면
 * 디코드된 비트맵이 회수될 수 있고, 그러면 src 를 바꾸는 순간 그 프레임이
 * 아직 준비되지 않아 화면이 한 칸 비면서 깜빡인다.
 */
const preloadedImages: HTMLImageElement[] = []
let preloadStarted = false
const readyWaiters = new Set<() => void>()
let readyCount = 0

function preload(onReady: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  if (readyCount >= FRAME_COUNT) {
    onReady()
    return () => {}
  }
  readyWaiters.add(onReady)

  if (!preloadStarted) {
    preloadStarted = true
    for (let i = 0; i < FRAME_COUNT; i += 1) {
      const image = new Image()
      const done = () => {
        readyCount += 1
        if (readyCount >= FRAME_COUNT) {
          for (const waiter of readyWaiters) waiter()
          readyWaiters.clear()
        }
      }
      // 한 장이 실패해도 나머지는 계속 돈다.
      image.onload = done
      image.onerror = done
      image.src = framePath(i)
      preloadedImages.push(image)
    }
  }

  return () => readyWaiters.delete(onReady)
}

interface Props {
  x: number
  y: number
  depthConfig: DepthConfig
  label?: string
  onClick?: () => void
}

export function WalkTestCharacter({ x, y, depthConfig, label, onClick }: Props) {
  const [frame, setFrame] = useState(0)
  const [ready, setReady] = useState(false)

  // 32 장이 다 준비된 뒤에 돌리기 시작한다. 그 전에는 첫 장으로 서 있는다.
  useEffect(() => preload(() => setReady(true)), [])

  useEffect(() => {
    if (!ready) return
    const timer = window.setInterval(
      () => setFrame((f) => (f + 1) % FRAME_COUNT),
      1000 / FPS,
    )
    return () => window.clearInterval(timer)
  }, [ready])

  // 캔버스가 아니라 캐릭터 키가 화면에서 8% 가 되도록 환산한다.
  const canvasHeight = CHARACTER_HEIGHT_FRACTION / BODY_HEIGHT_RATIO
  // 캔버스가 정사각형이라 가로 길이는 세로와 같다. 월드 좌표는 가로 기준이다.
  const widthWorld = canvasHeight * HEIGHT_TO_WIDTH_UNITS

  return (
    <WorldObject
      x={x}
      y={y}
      width={widthWorld}
      anchorX={CENTER_X_RATIO}
      anchorY={FOOT_Y_RATIO}
      depthConfig={depthConfig}
      shadow
      label={label}
      onClick={onClick}
      className="walker walk-test"
    >
      <img className="walk-test__frame" src={framePath(frame)} alt="" draggable={false} />
    </WorldObject>
  )
}
