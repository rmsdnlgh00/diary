import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { portraitFor } from '@/data/expressions'
import { EMOTIONS } from '@/data/emotions'
import { useGameStore } from '@/store/gameStore'
import { formatKoreanDate } from '@/utils/date'
import { CoinIcon } from '@/components/ui/TopBar'

/** Pulling the sheet down further than this closes it. */
const CLOSE_DRAG = 80

/** A tapped villager's diary, in a sheet that slides up over the village. */
export function DiaryDetail() {
  const characters = useGameStore((state) => state.characters)
  const selectedCharacterId = useGameStore((state) => state.selectedCharacterId)
  const selectCharacter = useGameStore((state) => state.selectCharacter)
  const welcome = useGameStore((state) => state.welcome)
  const [drag, setDrag] = useState(0)
  const start = useRef<number | null>(null)

  const character = characters.find((item) => item.id === selectedCharacterId)
  useEffect(() => setDrag(0), [selectedCharacterId])
  useEffect(() => {
    if (!character) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') selectCharacter(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [character, selectCharacter])
  if (!character) return null

  const emotion = EMOTIONS[character.emotion]
  const close = () => selectCharacter(null)
  const grab = {
    onPointerDown: (event: PointerEvent) => {
      start.current = event.clientY
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    onPointerMove: (event: PointerEvent) => {
      if (start.current !== null) setDrag(Math.max(0, event.clientY - start.current))
    },
    onPointerUp: () => {
      start.current = null
      if (drag > CLOSE_DRAG) close()
      else setDrag(0)
    },
    onPointerCancel: () => { start.current = null; setDrag(0) },
  }

  return (
    <div className="diary-sheet-backdrop" onClick={close}>
      <section className="diary-sheet" role="dialog" aria-label={`${formatKoreanDate(character.diaryDate)} 일기`}
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
        onClick={(event) => event.stopPropagation()}>
        <div className="diary-sheet__grab" {...grab}>
          <span className="diary-sheet__handle" aria-hidden="true" />
          {welcome?.id === character.id && (
            <p className="diary-sheet__welcome" role="status">
              오늘의 내가 마을에 도착했어요
              {welcome.reward > 0 && <span className="diary-sheet__reward"><CoinIcon />+{welcome.reward}</span>}
            </p>
          )}
          <header className="diary-sheet__head">
            <img className="diary-sheet__portrait" src={portraitFor(character.emotion)} alt="" />
            <div className="diary-sheet__title">
              <h2 className="diary-sheet__date">{formatKoreanDate(character.diaryDate)}</h2>
              <span className="diary-sheet__mood" style={{ ['--mood' as string]: emotion.color }}>
                <span className="dot" />
                {emotion.label}
              </span>
            </div>
            <button type="button" className="diary-sheet__close" aria-label="닫기"
              onPointerDown={(event) => event.stopPropagation()} onClick={close}>
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </header>
        </div>
        <p className="diary-sheet__text">{character.diaryText}</p>
      </section>
    </div>
  )
}
