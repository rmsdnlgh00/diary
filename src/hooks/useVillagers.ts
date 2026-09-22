import { useCallback, useEffect, useRef, useState } from 'react'
import { type Agent, createAgent, stepAgents } from '@/systems/agentSystem'
import { WALK_CONFIG } from '@/systems/walkSystem'
import { furthestWalkablePoint } from '@/systems/worldSystem'
import type { DiaryCharacterData, WorldDefinition } from '@/types'

/**
 * 마을 사람 전원을 rAF 한 개로 굴린다.
 * 캐릭터마다 루프를 돌리면 수가 늘수록 감당이 안 되므로 한 곳에서 모아 처리한다.
 */
export function useVillagers(
  world: WorldDefinition,
  characters: readonly DiaryCharacterData[],
  speed: number = WALK_CONFIG.speed,
) {
  const agentsRef = useRef<Agent[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const worldRef = useRef(world)
  const speedRef = useRef(speed)
  worldRef.current = world
  speedRef.current = speed

  // 캐릭터가 늘거나 감정이 바뀌면 에이전트 목록을 맞춰준다.
  // 이미 있는 캐릭터의 현재 위치는 건드리지 않는다.
  useEffect(() => {
    const byId = new Map(agentsRef.current.map((a) => [a.id, a]))
    agentsRef.current = characters.map((character) => {
      const existing = byId.get(character.id)
      if (existing) {
        existing.emotion = character.emotion
        return existing
      }
      return createAgent(character.id, character.emotion, character.x, character.y)
    })
  }, [characters])

  const commandWalk = useCallback((id: string, point: { x: number; y: number }) => {
    const agent = agentsRef.current.find((a) => a.id === id)
    if (!agent) return
    const reachable = furthestWalkablePoint(worldRef.current, { x: agent.x, y: agent.y }, point)
    if (!reachable) return
    agent.targetX = reachable.x
    agent.targetY = reachable.y
    agent.phase = 'WALK'
    agent.commanded = true
    agent.partnerId = null
    agent.walkTime = 0
  }, [])

  useEffect(() => {
    let raf = 0
    let previous: number | undefined

    const tick = (now: number) => {
      // 탭이 백그라운드에 있다 돌아왔을 때 순간이동하지 않도록 상한을 둔다
      const delta = previous === undefined ? 0 : Math.min(0.05, (now - previous) / 1000)
      previous = now

      if (delta > 0 && agentsRef.current.length > 0) {
        stepAgents(agentsRef.current, worldRef.current, delta, speedRef.current)
        // 렌더는 얕은 복사본으로. 에이전트 객체는 루프가 계속 들고 쓴다.
        setAgents(agentsRef.current.map((a) => ({ ...a })))
      }

      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return { agents, commandWalk }
}
