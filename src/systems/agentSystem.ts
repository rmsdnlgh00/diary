import type { EmotionId, Facing, WorldDefinition } from '@/types'
import { pickFacing, worldDistance } from './walkSystem'
import { furthestWalkablePoint, isWalkable } from './worldSystem'

export type AgentPhase = 'IDLE' | 'WALK' | 'TALK'

export interface Agent {
  id: string
  emotion: EmotionId
  x: number
  y: number
  /** 이 캐릭터가 주로 머무는 자리. 너무 멀리 흩어지지 않게 한다. */
  homeX: number
  homeY: number
  facing: Facing
  phase: AgentPhase
  /** 현재 상태가 끝날 때까지 남은 시간(초) */
  timer: number
  targetX: number
  targetY: number
  /** 걷기 프레임 계산용 누적 시간 */
  walkTime: number
  /** 사용자가 직접 보낸 목적지면 배회보다 우선한다 */
  commanded: boolean
  partnerId: string | null
  /** 대화가 끝난 뒤 다시 말 걸기까지 남은 시간 */
  talkCooldown: number
}

export const AGENT_CONFIG = {
  /** 서 있는 시간 범위(초) */
  idleMin: 1.6,
  idleMax: 5.5,
  /** 제자리에서 배회하는 반경 (월드 가로 대비) */
  wanderRadius: 0.13,
  /** 이 거리 안에 들어오면 서로 말을 건다 */
  talkRadius: 0.075,
  talkDuration: 5,
  talkCooldown: 9,
}

const randomBetween = (min: number, max: number, random: () => number) =>
  min + (max - min) * random()

export function createAgent(
  id: string,
  emotion: EmotionId,
  x: number,
  y: number,
  random: () => number = Math.random,
): Agent {
  return {
    id,
    emotion,
    x,
    y,
    homeX: x,
    homeY: y,
    facing: 'down',
    phase: 'IDLE',
    timer: randomBetween(0, AGENT_CONFIG.idleMax, random),
    targetX: x,
    targetY: y,
    walkTime: 0,
    commanded: false,
    partnerId: null,
    talkCooldown: 0,
  }
}

/** 집 주변에서 갈 수 있는 자리를 하나 고른다. 못 찾으면 null. */
function pickWanderTarget(
  world: WorldDefinition,
  agent: Agent,
  random: () => number,
): { x: number; y: number } | null {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const angle = random() * Math.PI * 2
    const radius = AGENT_CONFIG.wanderRadius * (0.35 + 0.65 * random())
    const candidate = {
      x: agent.homeX + Math.cos(angle) * radius,
      // y 는 화면 세로라 같은 실제 거리를 만들려면 늘려줘야 한다
      y: agent.homeY + (Math.sin(angle) * radius * 16) / 9,
    }
    if (!isWalkable(world, candidate)) continue
    const reachable = furthestWalkablePoint(world, { x: agent.x, y: agent.y }, candidate)
    if (reachable) return reachable
  }
  return null
}

/** 서로 마주 보게 한다. */
function faceEachOther(a: Agent, b: Agent): void {
  a.facing = pickFacing(b.x - a.x, b.y - a.y, a.facing)
  b.facing = pickFacing(a.x - b.x, a.y - b.y, b.facing)
}

/**
 * 모든 캐릭터를 한 틱 전진시킨다.
 * delta time 을 받으므로 프레임률과 무관하게 같은 속도로 움직인다.
 */
export function stepAgents(
  agents: Agent[],
  world: WorldDefinition,
  delta: number,
  speed: number,
  random: () => number = Math.random,
): void {
  for (const agent of agents) {
    if (agent.talkCooldown > 0) agent.talkCooldown = Math.max(0, agent.talkCooldown - delta)

    if (agent.phase === 'TALK') {
      agent.timer -= delta
      agent.walkTime = 0
      if (agent.timer <= 0) {
        agent.phase = 'IDLE'
        agent.partnerId = null
        agent.talkCooldown = AGENT_CONFIG.talkCooldown
        agent.timer = randomBetween(AGENT_CONFIG.idleMin, AGENT_CONFIG.idleMax, random)
      }
      continue
    }

    if (agent.phase === 'WALK') {
      const dx = agent.targetX - agent.x
      const dy = agent.targetY - agent.y
      const distance = worldDistance(agent.x, agent.y, agent.targetX, agent.targetY)

      if (distance <= 0.004) {
        agent.x = agent.targetX
        agent.y = agent.targetY
        agent.phase = 'IDLE'
        agent.commanded = false
        agent.walkTime = 0
        agent.timer = randomBetween(AGENT_CONFIG.idleMin, AGENT_CONFIG.idleMax, random)
      } else {
        const step = Math.min(distance, speed * delta)
        const ratio = step / distance
        agent.x += dx * ratio
        agent.y += dy * ratio
        agent.facing = pickFacing(dx, dy, agent.facing)
        agent.walkTime += delta
      }
      continue
    }

    // IDLE
    agent.walkTime = 0
    agent.timer -= delta
    if (agent.timer <= 0) {
      const target = pickWanderTarget(world, agent, random)
      if (target) {
        agent.targetX = target.x
        agent.targetY = target.y
        agent.phase = 'WALK'
      } else {
        agent.timer = randomBetween(AGENT_CONFIG.idleMin, AGENT_CONFIG.idleMax, random)
      }
    }
  }

  pairForConversation(agents)
}

/** 가까이 있고 둘 다 한가하면 서로 말을 걸게 한다. */
function pairForConversation(agents: Agent[]): void {
  const free = agents.filter(
    (a) => a.phase !== 'TALK' && !a.commanded && a.talkCooldown === 0,
  )

  for (let i = 0; i < free.length; i += 1) {
    const a = free[i]
    if (a.phase === 'TALK') continue

    for (let j = i + 1; j < free.length; j += 1) {
      const b = free[j]
      if (b.phase === 'TALK') continue
      if (worldDistance(a.x, a.y, b.x, b.y) > AGENT_CONFIG.talkRadius) continue

      a.phase = 'TALK'
      b.phase = 'TALK'
      a.partnerId = b.id
      b.partnerId = a.id
      a.timer = AGENT_CONFIG.talkDuration
      b.timer = AGENT_CONFIG.talkDuration
      a.walkTime = 0
      b.walkTime = 0
      faceEachOther(a, b)
      break
    }
  }
}

/**
 * 대화 중 지금 말할 차례인지. 두 사람이 번갈아 말하게 한다.
 * id 를 비교해 순서를 고정하므로 매 프레임 결과가 흔들리지 않는다.
 */
export function isSpeaking(agent: Agent): boolean {
  if (agent.phase !== 'TALK' || !agent.partnerId) return false
  const goesFirst = agent.id < agent.partnerId
  const firstHalf = agent.timer > AGENT_CONFIG.talkDuration / 2
  return goesFirst ? firstHalf : !firstHalf
}
