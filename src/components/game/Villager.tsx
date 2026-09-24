import { IDLE_FRAME, WALK_SHEETS } from '@/data/characterFrames'
import { chatLineFor } from '@/data/chatLines'
import { type Agent, isSpeaking } from '@/systems/agentSystem'
import type { DepthConfig } from '@/systems/depthSystem'
import { directionOf, frameAt } from '@/systems/walkSystem'
import type { DiaryCharacterData } from '@/types'
import { WalkingCharacter } from './WalkingCharacter'

interface Props {
  agent: Agent
  character: DiaryCharacterData
  depthConfig: DepthConfig
  fps: number
  selected: boolean
  onSelect: (id: string) => void
  zoom?: number
  showAnchors?: boolean
  /** 인스펙터에서 방향을 고정했을 때 */
  directionOverride?: import('@/types').WalkDirection | null
  frameOverride?: number | null
}

export function Villager({
  agent,
  character,
  depthConfig,
  fps,
  selected,
  onSelect,
  zoom = 1,
  showAnchors = false,
  directionOverride = null,
  frameOverride = null,
}: Props) {
  const direction = directionOverride ?? directionOf(agent.facing)
  const sheet = WALK_SHEETS[direction]
  const frameIndex =
    frameOverride !== null
      ? Math.min(frameOverride, sheet.frames.length - 1)
      : agent.phase === 'WALK'
        ? frameAt(agent.walkTime, sheet.sequence, fps)
        : IDLE_FRAME[direction]

  const day = Number(character.diaryDate.slice(8, 10))
  const speaking = isSpeaking(agent)

  return (
    <WalkingCharacter
      x={agent.x}
      y={agent.y}
      emotion={agent.emotion}
      equippedItems={character.equippedItems}
      direction={direction}
      frameIndex={frameIndex}
      walkTime={agent.walkTime}
      moving={agent.phase === 'WALK'}
      depthConfig={depthConfig}
      zoom={zoom}
      showAnchors={showAnchors}
      selected={selected}
      label={`${day}일의 캐릭터`}
      onClick={() => onSelect(character.id)}
      bubble={speaking ? chatLineFor(agent.emotion, character.diaryDate) : null}
      tag={String(day)}
    />
  )
}
