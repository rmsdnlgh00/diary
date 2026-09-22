import { EMOTION_EYE_ORDER, EYES_SHEET, WALK_SHEETS } from '@/data/characterFrames'
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
  const eyeIndex = Math.max(0, EMOTION_EYE_ORDER.indexOf(character.emotion))
  const sheet = WALK_SHEETS.front
  const frame = sheet.frames[0]

  return (
    <div className="modal-backdrop" onClick={() => selectCharacter(null)}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2 className="modal__date">{formatKoreanDate(character.diaryDate)}</h2>

        <div className="modal__portrait" style={{ aspectRatio: `${sheet.cellW} / ${sheet.cellH}` }}>
          <div
            className="modal__portrait-body"
            style={{
              backgroundImage: `url(${sheet.src})`,
              backgroundSize: `${sheet.cols * 100}% ${sheet.rows * 100}%`,
              backgroundPosition: '0% 0%',
            }}
          />
          <div
            className="modal__portrait-eyes"
            style={{
              left: `${(frame.faceX / sheet.cellW) * 100}%`,
              top: `${(frame.faceY / sheet.cellH) * 100}%`,
              width: `${(frame.faceW / sheet.cellW) * 100}%`,
              aspectRatio: `${EYES_SHEET.cellW} / ${EYES_SHEET.cellH}`,
              backgroundImage: `url(${EYES_SHEET.src})`,
              backgroundSize: `${EYES_SHEET.cols * 100}% ${EYES_SHEET.rows * 100}%`,
              backgroundPosition: `${((eyeIndex % EYES_SHEET.cols) / (EYES_SHEET.cols - 1)) * 100}% ${
                Math.floor(eyeIndex / EYES_SHEET.cols) * 100
              }%`,
            }}
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
