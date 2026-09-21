import { getWorld } from '@/data/worlds'
import { useGameStore } from '@/store/gameStore'
import { DEFAULT_DEPTH_CONFIG, sortByDepth } from '@/systems/depthSystem'
import { Background } from './Background'
import { DiaryCharacter } from './DiaryCharacter'
import { StaticEnvironment } from './StaticEnvironment'

/**
 * 레이어 순서: 배경 → 바닥 장식 → (깊이 정렬되는) 오브젝트 → 이펙트.
 * 오브젝트 레이어 안에서는 y가 클수록 앞에 그려진다.
 */
export function GameWorld() {
  const worldId = useGameStore((state) => state.worldId)
  const characters = useGameStore((state) => state.characters)
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
