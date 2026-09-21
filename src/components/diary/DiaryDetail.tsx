import { CharacterSprite } from '@/components/game/character/CharacterSprite'
import { EMOTIONS } from '@/data/emotions'
import { useGameStore } from '@/store/gameStore'
import { formatKoreanDate } from '@/utils/date'

export function DiaryDetail() {
  const characters = useGameStore((state) => state.characters)
  const selectedCharacterId = useGameStore((state) => state.selectedCharacterId)
  const selectCharacter = useGameStore((state) => state.selectCharacter)

  const character = characters.find((item) => item.id === selectedCharacterId)
  if (!character) return null

  const emotion = EMOTIONS[character.emotion]

  return (
    <div className="modal-backdrop" onClick={() => selectCharacter(null)}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2 className="modal__date">{formatKoreanDate(character.diaryDate)}</h2>

        <div className="modal__portrait">
          <CharacterSprite
            emotion={character.emotion}
            body={character.body}
            hair={character.hair}
            outfit={character.outfit}
            accessories={character.accessories}
          />
        </div>

        <p className="modal__text">{character.diaryText}</p>

        <div className="modal__emotion">
          <span className="dot" style={{ background: emotion.color }} />
          감정 · {emotion.label}
        </div>

        <button type="button" className="primary-button" onClick={() => selectCharacter(null)}>
          닫기
        </button>
      </div>
    </div>
  )
}
