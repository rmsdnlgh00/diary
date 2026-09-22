import { useEffect, useState } from 'react'
import { EMOTIONS } from '@/data/emotions'
import { diaryForDate, useGameStore } from '@/store/gameStore'
import { analyzeDiary } from '@/systems/emotionAnalyzer'
import { formatKoreanDate } from '@/utils/date'

interface Props {
  date: string
}

export function DiaryEditor({ date }: Props) {
  const diaries = useGameStore((s) => s.diaries)
  const saveDiary = useGameStore((s) => s.saveDiary)
  const closePanel = useGameStore((s) => s.closePanel)

  const existing = diaryForDate(diaries, date)
  const [text, setText] = useState(existing?.text ?? '')
  // 저장하고 나면 existing 이 생기므로, 저장 시점에 신규였는지를 따로 기억해 둔다
  const [saved, setSaved] = useState<'created' | 'updated' | null>(null)

  // 날짜가 바뀔 때만 입력칸을 다시 채운다.
  // diaries 를 의존성에 넣으면 저장 직후 방금 쓴 내용이 되돌아간다.
  useEffect(() => {
    setText(diaryForDate(diaries, date)?.text ?? '')
    setSaved(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  // 저장 전에도 어떤 감정이 될지 미리 보여준다
  const preview = text.trim() ? analyzeDiary(text) : null
  const emotion = preview ? EMOTIONS[preview.emotion] : null

  const handleSave = () => {
    if (!text.trim()) return
    const isNew = !existing
    saveDiary(date, text.trim())
    setSaved(isNew ? 'created' : 'updated')
  }

  return (
    <div className="editor">
      <div className="editor__header">
        <h2>{formatKoreanDate(date)}의 기록</h2>
        <button type="button" className="icon-button" onClick={closePanel} aria-label="닫기">
          ✕
        </button>
      </div>

      <textarea
        className="editor__text"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setSaved(null)
        }}
        placeholder="오늘 어떤 하루였나요?"
        rows={5}
      />

      <div className="editor__footer">
        {emotion ? (
          <span className="editor__emotion">
            <span className="dot" style={{ background: emotion.color }} />
            {saved ? '오늘의 기분 · ' : '이렇게 기록될 거예요 · '}
            {emotion.label}
          </span>
        ) : (
          <span className="editor__hint">쓰는 내용에 따라 캐릭터 표정이 정해져요</span>
        )}

        <button
          type="button"
          className="primary-button editor__save"
          onClick={handleSave}
          disabled={!text.trim()}
        >
          {existing ? '고쳐 쓰기' : '기록하고 캐릭터 만들기'}
        </button>
      </div>

      {saved && (
        <p className="editor__saved">
          {saved === 'created' ? '오늘의 캐릭터가 마을에 도착했어요!' : '오늘의 캐릭터 표정이 바뀌었어요.'}
        </p>
      )}
    </div>
  )
}
