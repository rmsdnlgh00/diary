import type { EmotionId, Facing, WorldDefinition } from '@/types'
import { WALK_CONFIG, pickFacing, speedRatio, worldDistance } from './walkSystem'
import { findPath } from './pathSystem'
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
  /**
   * 걷기 시작 후 실제로 나아간 거리. 프레임은 이 값으로 고른다.
   *
   * 시간으로 고르면 가속·감속 중에 다리 속도와 몸 속도가 어긋나 발이
   * 미끄러진다. 거리로 고르면 느리게 움직일 때 다리도 느려져 항상 맞는다.
   */
  walkDistance: number
  /** 사용자가 직접 보낸 목적지면 배회보다 우선한다 */
  commanded: boolean
  /** target 다음에 이어서 걸을 경유지. 장애물을 돌아갈 때 쓴다. */
  path: { x: number; y: number }[]
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
  /**
   * 서로 이만큼은 떨어져 있게 한다.
   *
   * 목적지를 고를 때 다른 캐릭터를 보지 않아서, 그냥 두면 같은 자리에
   * 겹쳐 선다. talkRadius 보다 작게 둬야 대화하러 다가가는 것은 막지 않는다.
   */
  separation: 0.042,
  /** 겹쳤을 때 밀어내는 속도 (초당 거리) */
  separationPush: 0.05,
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
    walkDistance: 0,
    commanded: false,
    path: [],
    partnerId: null,
    talkCooldown: 0,
  }
}

/**
 * 잔디밭 아무 곳으로 길게 산책 갈 경유지. 넓은 마을에서 캐릭터가 한곳에 몰리지 않게 한다.
 * 구역 넓이에 비례해 고르므로 넓은 잔디일수록 자주 간다. 못 찾으면 null.
 */
function pickRoamPath(world: WorldDefinition, agent: Agent, random: () => number): { x: number; y: number }[] | null {
  const ratio = world.groundDepthRatio ?? 9 / 16
  const areas = world.walkableAreas
  const weights = areas.map((a) => (a.x[1] - a.x[0]) * (a.y[1] - a.y[0]) * ratio)
  const total = weights.reduce((sum, w) => sum + w, 0)
  for (let attempt = 0; attempt < 6; attempt += 1) {
    let pick = random() * total
    const area = areas.find((_, i) => (pick -= weights[i]) <= 0) ?? areas[0]
    const target = { x: area.x[0] + (area.x[1] - area.x[0]) * random(), y: area.y[0] + (area.y[1] - area.y[0]) * random() }
    if (!isWalkable(world, target)) continue
    const path = findPath(world, { x: agent.x, y: agent.y }, target)
    if (path?.length) return path
  }
  return null
}

/** 집 주변에서 갈 수 있는 자리를 하나 고른다. 못 찾으면 null. */
function pickWanderTarget(
  world: WorldDefinition,
  agent: Agent,
  random: () => number,
): { x: number; y: number } | null {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const angle = random() * Math.PI * 2
    const radius = (world.wanderRadius ?? AGENT_CONFIG.wanderRadius) * (0.35 + 0.65 * random())
    const candidate = {
      x: agent.homeX + Math.cos(angle) * radius,
      // y 는 화면 세로라 같은 실제 거리를 만들려면 늘려줘야 한다
      y: agent.homeY + Math.sin(angle) * radius / (world.groundDepthRatio ?? 9 / 16),
    }
    if (!isWalkable(world, candidate)) continue
    const reachable = furthestWalkablePoint(world, { x: agent.x, y: agent.y }, candidate)
    if (reachable) return reachable
  }
  return null
}

/** 서로 마주 보게 한다. */
function faceEachOther(a: Agent, b: Agent, groundDepthRatio: number): void {
  a.facing = pickFacing(b.x - a.x, b.y - a.y, a.facing, groundDepthRatio)
  b.facing = pickFacing(a.x - b.x, a.y - b.y, b.facing, groundDepthRatio)
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
      agent.walkDistance = 0
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
      const distance = worldDistance(agent.x, agent.y, agent.targetX, agent.targetY, world.groundDepthRatio)

      if (distance <= WALK_CONFIG.arriveEpsilon && agent.path.length) {
        // 경유지에 닿았다. 멈추지 않고 다음 경유지로 이어 걷는다.
        const next = agent.path.shift()!
        agent.x = agent.targetX
        agent.y = agent.targetY
        agent.targetX = next.x
        agent.targetY = next.y
      } else if (distance <= WALK_CONFIG.arriveEpsilon) {
        agent.x = agent.targetX
        agent.y = agent.targetY
        agent.phase = 'IDLE'
        agent.commanded = false
        agent.walkTime = 0
        agent.walkDistance = 0
        agent.timer = randomBetween(AGENT_CONFIG.idleMin, AGENT_CONFIG.idleMax, random)
      } else {
        // 출발·도착을 부드럽게 한다. walkTime 은 아래에서 더하므로 아직 이번 걸음 이전 값이다.
        // 감속은 최종 도착점까지 남은 거리로 정한다. 경유지마다 느려지지 않게.
        let remaining = distance
        let last = { x: agent.targetX, y: agent.targetY }
        for (const point of agent.path) {
          remaining += worldDistance(last.x, last.y, point.x, point.y, world.groundDepthRatio)
          last = point
        }
        const step = Math.min(distance, speed * speedRatio(agent.walkTime, remaining) * delta)
        const ratio = step / distance
        const next = { x: agent.x + dx * ratio, y: agent.y + dy * ratio }
        if (!isWalkable(world, next)) {
          // 서로 밀어내다 길에서 살짝 벗어났다. 지금 자리에서 길을 다시 찾고, 없으면 멈춘다.
          const goal = agent.path.at(-1) ?? { x: agent.targetX, y: agent.targetY }
          const detour = findPath(world, { x: agent.x, y: agent.y }, goal)
          if (detour?.length) {
            agent.targetX = detour[0].x
            agent.targetY = detour[0].y
            agent.path = detour.slice(1)
          } else {
            agent.phase = 'IDLE'
            agent.commanded = false
            agent.path = []
            agent.timer = randomBetween(AGENT_CONFIG.idleMin, AGENT_CONFIG.idleMax, random)
          }
          continue
        }
        agent.x = next.x
        agent.y = next.y
        agent.facing = pickFacing(dx, dy, agent.facing, world.groundDepthRatio)
        agent.walkTime += delta
        agent.walkDistance += step
      }
      continue
    }

    // IDLE
    agent.walkTime = 0
    agent.timer -= delta
    if (agent.timer <= 0) {
      const roam = world.roamChance && random() < world.roamChance ? pickRoamPath(world, agent, random) : null
      if (roam) {
        // 먼 곳으로 산책을 가면 거기를 새 집으로 삼아 그 주변을 돌아다닌다.
        const [first, ...rest] = roam
        const end = roam[roam.length - 1]
        agent.targetX = first.x
        agent.targetY = first.y
        agent.path = rest
        agent.homeX = end.x
        agent.homeY = end.y
        agent.phase = 'WALK'
        continue
      }
      const target = pickWanderTarget(world, agent, random)
      if (target) {
        agent.targetX = target.x
        agent.targetY = target.y
        agent.path = []
        agent.phase = 'WALK'
      } else {
        agent.timer = randomBetween(AGENT_CONFIG.idleMin, AGENT_CONFIG.idleMax, random)
      }
    }
  }

  separate(agents, world, delta)
  pairForConversation(agents, world.groundDepthRatio ?? 9 / 16)
}

/*
 * 너무 가까이 선 캐릭터를 서로 밀어낸다.
 *
 * 목적지는 다른 캐릭터를 보지 않고 고르기 때문에, 그냥 두면 같은 자리에
 * 겹쳐 선다. 목적지 선택 단계에서 막으려면 "비어 있는 자리"를 찾아야 해서
 * 복잡하고, 걷는 도중에 겹치는 것은 막지 못한다. 매 프레임 조금씩 밀어내면
 * 두 경우가 한 번에 해결되고 움직임도 자연스럽다.
 *
 * 밀어낸 자리가 걸을 수 없는 곳이면(연못·울타리) 되돌린다.
 */
function separate(agents: Agent[], world: WorldDefinition, delta: number): void {
  const { separation, separationPush } = AGENT_CONFIG
  const push = separationPush * delta

  for (let i = 0; i < agents.length; i += 1) {
    for (let j = i + 1; j < agents.length; j += 1) {
      const a = agents[i]
      const b = agents[j]
      // 대화 중인 짝은 마주 보고 서 있어야 하므로 밀지 않는다.
      if (a.partnerId === b.id || b.partnerId === a.id) continue

      const distance = worldDistance(a.x, a.y, b.x, b.y, world.groundDepthRatio)
      if (distance >= separation || distance === 0) continue

      // 가까울수록 세게 민다.
      const strength = (1 - distance / separation) * push
      const dx = ((b.x - a.x) / distance) * strength
      const dy = ((b.y - a.y) / distance) * strength

      nudge(a, -dx, -dy, world)
      nudge(b, dx, dy, world)
    }
  }
}

/** 걸을 수 있는 자리일 때만 옮긴다. */
function nudge(agent: Agent, dx: number, dy: number, world: WorldDefinition): void {
  const next = { x: agent.x + dx, y: agent.y + dy }
  if (!isWalkable(world, next)) return
  agent.x = next.x
  agent.y = next.y
}

/** 가까이 있고 둘 다 한가하면 서로 말을 걸게 한다. */
function pairForConversation(agents: Agent[], groundDepthRatio: number): void {
  const free = agents.filter(
    (a) => a.phase !== 'TALK' && !a.commanded && a.talkCooldown === 0,
  )

  for (let i = 0; i < free.length; i += 1) {
    const a = free[i]
    if (a.phase === 'TALK') continue

    for (let j = i + 1; j < free.length; j += 1) {
      const b = free[j]
      if (b.phase === 'TALK') continue
      if (worldDistance(a.x, a.y, b.x, b.y, groundDepthRatio) > AGENT_CONFIG.talkRadius) continue

      a.phase = 'TALK'
      b.phase = 'TALK'
      a.partnerId = b.id
      b.partnerId = a.id
      a.timer = AGENT_CONFIG.talkDuration
      b.timer = AGENT_CONFIG.talkDuration
      a.walkTime = 0
      b.walkTime = 0
      faceEachOther(a, b, groundDepthRatio)
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
