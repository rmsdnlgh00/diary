import { useRef } from 'react'
import { getWorld } from '@/data/worlds'
import { useVillagers } from '@/hooks/useVillagers'
import { useDebugStore } from '@/store/debugStore'
import { useGameStore } from '@/store/gameStore'
import { DEFAULT_DEPTH_CONFIG } from '@/systems/depthSystem'
import { TODAY } from '@/utils/date'
import { Background } from './Background'
import { NPC } from './NPC'
import { PlaceableObject } from './PlaceableObject'
import { SpriteInspector } from './SpriteInspector'
import { StaticEnvironment } from './StaticEnvironment'
import { Villager } from './Villager'

/**
 * 데이터상 레이어는 Background / Environment / Decoration / NPC / Character 로 나뉘지만,
 * 화면에서는 캐릭터가 나무 앞뒤로 자연스럽게 들어가야 하므로
 * 세워지는 오브젝트는 하나의 컨테이너에 모아 y 기준으로 함께 정렬한다.
 */
export function GameWorld() {
  const worldId = useGameStore((state) => state.worldId)
  const characters = useGameStore((state) => state.characters)
  const decorations = useGameStore((state) => state.decorations)
  const selectedCharacterId = useGameStore((state) => state.selectedCharacterId)
  const selectCharacter = useGameStore((state) => state.selectCharacter)
  const debug = useDebugStore()

  const world = getWorld(worldId)
  const depthConfig = { ...DEFAULT_DEPTH_CONFIG, horizonY: world.horizonY }

  const stageRef = useRef<HTMLDivElement>(null)
  const { agents, commandWalk } = useVillagers(world, characters, debug.speed)
  const charactersById = new Map(characters.map((c) => [c.id, c]))

  const liveDirection = 'front' as const

  /** 잔디를 클릭하면 오늘의 캐릭터가 그리로 걸어간다. */
  const handleGroundClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const box = stageRef.current?.getBoundingClientRect()
    const today = characters.find((c) => c.diaryDate === TODAY)
    if (!box || !today) return
    commandWalk(today.id, {
      x: (event.clientX - box.left) / box.width,
      y: (event.clientY - box.top) / box.height,
    })
  }

  return (
    <div className="game-world" ref={stageRef}>
      <Background world={world} />

      <div className="layer layer--ground">
        <StaticEnvironment world={world} variant="flat" depthConfig={depthConfig} />
        <div className="ground-click" onClick={handleGroundClick} />
      </div>

      <div className="layer layer--objects">
        <StaticEnvironment world={world} variant="standing" depthConfig={depthConfig} />

        {[...decorations]
          .sort((a, b) => a.y - b.y)
          .map((decoration) => (
            <PlaceableObject key={decoration.id} decoration={decoration} depthConfig={depthConfig} />
          ))}

        {world.npcs.map((npc) => (
          <NPC key={npc.id} npc={npc} depthConfig={depthConfig} />
        ))}

        {/* 캐릭터는 매 프레임 움직이므로 z-index 로만 앞뒤를 정한다 (WorldObject 가 처리) */}
        {agents.map((agent) => {
          const character = charactersById.get(agent.id)
          if (!character) return null
          return (
            <Villager
              key={agent.id}
              agent={agent}
              character={character}
              depthConfig={depthConfig}
              fps={debug.fps}
              selected={agent.id === selectedCharacterId}
              onSelect={selectCharacter}
              zoom={debug.zoom}
              showAnchors={debug.showAnchors}
              directionOverride={debug.direction}
              frameOverride={debug.paused ? debug.frame : null}
            />
          )
        })}
      </div>

      <div className="layer layer--effects" />

      {import.meta.env.DEV && <SpriteInspector liveDirection={liveDirection} />}
    </div>
  )
}
