import type { DepthConfig } from '@/systems/depthSystem'
import type { DiaryCharacterData } from '@/types'
import { CharacterSprite } from './character/CharacterSprite'
import { WorldObject } from './WorldObject'

/** 월드 가로 길이 대비 캐릭터 기본 폭 */
const CHARACTER_WIDTH = 0.062

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
      width={CHARACTER_WIDTH}
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
