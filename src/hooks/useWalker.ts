import { useCallback, useEffect, useRef, useState } from 'react'
import { WALK_CONFIG, pickFacing, worldDistance } from '@/systems/walkSystem'
import { furthestWalkablePoint } from '@/systems/worldSystem'
import type { Facing, WorldDefinition } from '@/types'

export interface WalkerState {
  x: number
  y: number
  facing: Facing
  moving: boolean
  /** 걷기 시작 후 흐른 시간. 프레임 번호 계산에 쓴다. */
  walkTime: number
}

interface Options {
  world: WorldDefinition
  start: { x: number; y: number }
  /** 초당 이동 거리 (월드 가로 대비) */
  speed?: number
}

/**
 * 목적지까지 걸어가는 캐릭터 하나를 굴린다.
 * 이동량은 프레임률과 무관하게 delta time 으로 계산한다.
 */
export function useWalker({ world, start, speed = WALK_CONFIG.speed }: Options) {
  const [state, setState] = useState<WalkerState>({
    x: start.x,
    y: start.y,
    facing: 'down',
    moving: false,
    walkTime: 0,
  })

  const ref = useRef({ ...state, targetX: 0, targetY: 0, hasTarget: false })
  const speedRef = useRef(speed)
  speedRef.current = speed

  const walkTo = useCallback(
    (point: { x: number; y: number }) => {
      const current = ref.current
      const reachable = furthestWalkablePoint(world, { x: current.x, y: current.y }, point)
      if (!reachable) return
      current.targetX = reachable.x
      current.targetY = reachable.y
      current.hasTarget = true
    },
    [world],
  )

  useEffect(() => {
    let raf = 0
    let previous: number | undefined

    const tick = (now: number) => {
      // 탭이 백그라운드에 있다 돌아왔을 때 순간이동하지 않도록 상한을 둔다
      const delta = previous === undefined ? 0 : Math.min(0.05, (now - previous) / 1000)
      previous = now

      const s = ref.current
      if (s.hasTarget) {
        const dx = s.targetX - s.x
        const dy = s.targetY - s.y
        const distance = worldDistance(s.x, s.y, s.targetX, s.targetY)

        if (distance <= WALK_CONFIG.arriveEpsilon) {
          s.x = s.targetX
          s.y = s.targetY
          s.hasTarget = false
          s.moving = false
          s.walkTime = 0
        } else {
          const step = Math.min(distance, speedRef.current * delta)
          const ratio = step / distance
          s.x += dx * ratio
          s.y += dy * ratio
          s.facing = pickFacing(dx, dy, s.facing)
          s.moving = true
          s.walkTime += delta
        }
      }

      setState((prev) =>
        prev.x === s.x && prev.y === s.y && prev.moving === s.moving && prev.facing === s.facing
          ? prev
          : { x: s.x, y: s.y, facing: s.facing, moving: s.moving, walkTime: s.walkTime },
      )

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return { ...state, walkTime: ref.current.walkTime, walkTo }
}
