import { CHARACTER_ANCHOR, CHARACTER_WORLD_WIDTH } from '@/data/assets'
import type { DepthConfig } from '@/systems/depthSystem'
import type { DiaryCharacterData } from '@/types'
import { CharacterSprite } from './character/CharacterSprite'
import { WorldObject } from './WorldObject'

interface Props {
  character: DiaryCharacterData
  depthConfig: DepthConfig
  selected: boolean
  onSelect: (id: string) => void
}

export function DiaryCharacter({ character, depthConfig, selected, onSelect }: Props) {
  const day = Number(character.diaryDate.slice(8, 10))

  return (
    <WorldObject
      x={character.x}
      y={character.y}
      width={CHARACTER_WORLD_WIDTH}
      anchorX={CHARACTER_ANCHOR.x}
      anchorY={CHARACTER_ANCHOR.y}
      scale={character.scale}
      depthConfig={depthConfig}
      shadow
      className={selected ? 'diary-character diary-character--selected' : 'diary-character'}
      label={`${day}일의 캐릭터`}
      onClick={() => onSelect(character.id)}
    >
      <span className="diary-character__tag">{day}</span>
      <CharacterSprite
        emotion={character.emotion}
        body={character.body}
        hair={character.hair}
        outfit={character.outfit}
        accessories={character.accessories}
      />
    </WorldObject>
  )
}
