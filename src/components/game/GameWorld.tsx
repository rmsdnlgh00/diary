import { useRef } from 'react'
import { IDLE_FRAME, WALK_SHEETS } from '@/data/characterFrames'
import { getWorld } from '@/data/worlds'
import { useWalker } from '@/hooks/useWalker'
import { useDebugStore } from '@/store/debugStore'
import { useGameStore } from '@/store/gameStore'
import { DEFAULT_DEPTH_CONFIG, sortByDepth } from '@/systems/depthSystem'
import { directionOf, frameAt } from '@/systems/walkSystem'
import { Background } from './Background'
import { DiaryCharacter } from './DiaryCharacter'
import { NPC } from './NPC'
import { PlaceableObject } from './PlaceableObject'
import { SpriteInspector } from './SpriteInspector'
import { StaticEnvironment } from './StaticEnvironment'
import { WalkingCharacter } from './WalkingCharacter'

/** 오늘 날짜의 캐릭터가 걸어다니는 주인공이 된다. */
const TODAY = '2026-09-21'

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

  const player = characters.find((c) => c.diaryDate === TODAY)
  const others = characters.filter((c) => c.diaryDate !== TODAY)

  const stageRef = useRef<HTMLDivElement>(null)
  const walker = useWalker({
    world,
    start: { x: player?.x ?? 0.5, y: player?.y ?? 0.7 },
    speed: debug.speed,
  })

  const liveDirection = directionOf(walker.facing)
  const direction = debug.direction ?? liveDirection
  const sheet = WALK_SHEETS[direction]
  const frameIndex = debug.paused
    ? Math.min(debug.frame, sheet.frames.length - 1)
    : walker.moving
      ? frameAt(walker.walkTime, sheet.frames.length, debug.fps)
      : IDLE_FRAME[direction]

  const handleGroundClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const box = stageRef.current?.getBoundingClientRect()
    if (!box) return
    walker.walkTo({
      x: (event.clientX - box.left) / box.width,
      y: (event.clientY - box.top) / box.height,
    })
  }

  return (
    <div className="game-world" ref={stageRef}>
      <Background world={world} />

      <div className="layer layer--ground">
        <StaticEnvironment world={world} variant="flat" depthConfig={depthConfig} />
        {/* 잔디를 클릭하면 걸어간다. 캐릭터는 이 위 레이어라 클릭이 가려지지 않는다. */}
        <div className="ground-click" onClick={handleGroundClick} />
      </div>

      <div className="layer layer--objects">
        <StaticEnvironment world={world} variant="standing" depthConfig={depthConfig} />

        {sortByDepth(decorations).map((decoration) => (
          <PlaceableObject key={decoration.id} decoration={decoration} depthConfig={depthConfig} />
        ))}

        {world.npcs.map((npc) => (
          <NPC key={npc.id} npc={npc} depthConfig={depthConfig} />
        ))}

        {sortByDepth(others).map((character) => (
          <DiaryCharacter
            key={character.id}
            character={character}
            depthConfig={depthConfig}
            selected={character.id === selectedCharacterId}
            onSelect={selectCharacter}
          />
        ))}

        {player && (
          <WalkingCharacter
            x={walker.x}
            y={walker.y}
            emotion={player.emotion}
            direction={direction}
            facing={walker.facing}
            frameIndex={frameIndex}
            depthConfig={depthConfig}
            zoom={debug.zoom}
            showAnchors={debug.showAnchors}
          />
        )}
      </div>

      <div className="layer layer--effects" />

      {import.meta.env.DEV && <SpriteInspector liveDirection={liveDirection} />}
    </div>
  )
}
