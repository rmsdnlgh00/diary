import { getWorld } from '@/data/worlds'
import { useGameStore } from '@/store/gameStore'
import { DEFAULT_DEPTH_CONFIG, sortByDepth } from '@/systems/depthSystem'
import { Background } from './Background'
import { DiaryCharacter } from './DiaryCharacter'
import { NPC } from './NPC'
import { PlaceableObject } from './PlaceableObject'
import { StaticEnvironment } from './StaticEnvironment'

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

  const world = getWorld(worldId)
  const depthConfig = { ...DEFAULT_DEPTH_CONFIG, horizonY: world.horizonY }

  return (
    <div className="game-world">
      <Background world={world} />

      <div className="layer layer--ground">
        <StaticEnvironment world={world} variant="flat" depthConfig={depthConfig} />
      </div>

      <div className="layer layer--objects">
        <StaticEnvironment world={world} variant="standing" depthConfig={depthConfig} />

        {sortByDepth(decorations).map((decoration) => (
          <PlaceableObject key={decoration.id} decoration={decoration} depthConfig={depthConfig} />
        ))}

        {world.npcs.map((npc) => (
          <NPC key={npc.id} npc={npc} depthConfig={depthConfig} />
        ))}

        {sortByDepth(characters).map((character) => (
          <DiaryCharacter
            key={character.id}
            character={character}
            depthConfig={depthConfig}
            selected={character.id === selectedCharacterId}
            onSelect={selectCharacter}
          />
        ))}
      </div>

      <div className="layer layer--effects" />
    </div>
  )
}
