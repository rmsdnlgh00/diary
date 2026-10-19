import { useEffect, useRef, useState } from 'react'
import { DIARY_PROMPTS, promptIndexFor } from '@/data/diaryPrompts'
import { EMOTIONS, EMOTION_IDS } from '@/data/emotions'
import { portraitFor } from '@/data/expressions'
import { diaryForDate, useGameStore } from '@/store/gameStore'
import { useProfileStore } from '@/store/profileStore'
import { DIARY_REWARD, diaryReward } from '@/systems/diarySystem'
import { analyzeDiary } from '@/systems/emotionAnalyzer'
import type { EmotionId } from '@/types'
import { formatKoreanDate, koreanWeekday } from '@/utils/date'

interface Props {
  date: string
}

/** A comfortable length for a day's entry; only a guide, never a limit. */
const GOAL = 100
const draftKey = (date: string) => `haru-village:draft:${date}`

/** Unsaved text survives closing the editor; it is per date and dropped once saved. */
function readDraft(date: string): string | null {
  try { return localStorage.getItem(draftKey(date)) } catch { return null }
}
function writeDraft(date: string, text: string | null) {
  try {
    if (text) localStorage.setItem(draftKey(date), text)
    else localStorage.removeItem(draftKey(date))
  } catch {
    // Without storage the draft just isn't kept.
  }
}

/**
 * The day's diary: a lined notebook page with a gentle question to start from, a live
 * preview of the character's face (the text decides the mood, or the player picks one),
 * a soft length guide and a draft that survives closing. Saving a new day sends its character in by
 * boat (see VillageStage); saving an edit shows the card below.
 */
export function DiaryEditor({ date }: Props) {
  const diaries = useGameStore((s) => s.diaries)
  const saveDiary = useGameStore((s) => s.saveDiary)
  const closePanel = useGameStore((s) => s.closePanel)
  const startArrival = useGameStore((s) => s.startArrival)
  const name = useProfileStore((s) => s.profile?.name)
  const today = useGameStore((s) => s.today)
  // A past day: the prompts talk about "that day", the entry pays a flat reward and isn't part of the streak.
  const past = date < today
  const firstDiary = useProfileStore((s) => s.profile?.guide === 'diary') && !past
  const setGuide = useProfileStore((s) => s.setGuide)

  const existing = diaryForDate(diaries, date)
  const [text, setText] = useState(() => readDraft(date) ?? existing?.text ?? '')
  const [picked, setPicked] = useState<EmotionId | null>(existing?.emotionPicked ? existing.emotion : null)
  const [promptIndex, setPromptIndex] = useState(() => firstDiary ? 0 : promptIndexFor(date))
  // 저장하고 나면 existing 이 생기므로, 저장 시점에 신규였는지를 따로 기억해 둔다
  const [saved, setSaved] = useState<'created' | 'updated' | null>(null)
  const [reward, setReward] = useState(0)
  const textRef = useRef<HTMLTextAreaElement>(null)

  // 날짜가 바뀔 때만 입력칸을 다시 채운다.
  // diaries 를 의존성에 넣으면 저장 직후 방금 쓴 내용이 되돌아간다.
  useEffect(() => {
    const entry = diaryForDate(diaries, date)
    setText(readDraft(date) ?? entry?.text ?? '')
    setPicked(entry?.emotionPicked ? entry.emotion : null)
    setPromptIndex(firstDiary ? 0 : promptIndexFor(date))
    setSaved(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  // Reopening a page continues where the text ends.
  useEffect(() => {
    const field = textRef.current
    if (field) field.setSelectionRange(field.value.length, field.value.length)
  }, [date, saved])

  const trimmed = text.trim()
  // 저장 전에도 어떤 감정이 될지 미리 보여준다
  const analyzed = trimmed ? analyzeDiary(trimmed).emotion : null
  const mood = picked ?? analyzed
  const emotion = mood ? EMOTIONS[mood] : null
  const prompt = past ? DIARY_PROMPTS[promptIndex].replace(/^오늘/, '그날') : DIARY_PROMPTS[promptIndex]
  const isDraft = !!existing && trimmed !== existing.text

  const change = (next: string) => {
    setText(next)
    setSaved(null)
    // Keep a draft only while it differs from what is saved.
    writeDraft(date, next.trim() && next.trim() !== existing?.text ? next : null)
  }
  const handleSave = () => {
    if (!trimmed) return
    const isNew = !existing
    const earned = saveDiary(date, trimmed, picked ?? undefined)
    setReward(earned)
    writeDraft(date, null)
    if (isNew) {
      // A new day's character comes to the village by boat: close the notebook and watch it arrive.
      const arrived = useGameStore.getState().characters.find((c) => c.diaryDate === date)
      if (arrived) {
        // The first diary is written: next comes the welcome and the short tour.
        if (firstDiary) setGuide('tour')
        startArrival(arrived.id, earned)
        closePanel()
        return
      }
    }
    setSaved(isNew ? 'created' : 'updated')
  }
  const startWithPrompt = () => {
    change(text.trim() ? `${text.trimEnd()}\n${prompt} ` : `${prompt} `)
    textRef.current?.focus()
  }

  if (saved && emotion) {
    return (
      <div className="editor editor--done" role="status">
        <img className="editor__done-face" src={portraitFor(emotion.id)} alt="" />
        <h2>{saved === 'created' ? '오늘의 캐릭터가 마을에 도착했어요!' : '오늘의 캐릭터 표정이 바뀌었어요.'}</h2>
        <p className="editor__done-mood">
          <span className="dot" style={{ background: emotion.color }} />
          {formatKoreanDate(date)}의 기분 · {emotion.label}
        </p>
        {reward > 0 && <p className="editor__reward">🪙 +{reward} 코인을 받았어요!</p>}
        <p className="editor__done-text">{trimmed}</p>
        <div className="editor__done-actions">
          <button type="button" className="item-action" onClick={() => setSaved(null)}>다시 고쳐 쓰기</button>
          <button type="button" className="primary-button" onClick={closePanel}>마을에서 보기</button>
        </div>
      </div>
    )
  }

  return (
    <div className="editor">
      <div className="editor__header">
        <h2>
          {formatKoreanDate(date)}<small>{koreanWeekday(date)}</small>
          {past && <span className="editor__past">지난 날</span>}
        </h2>
        <button type="button" className="icon-button" onClick={closePanel} aria-label="닫기">
          ✕
        </button>
      </div>

      {firstDiary && !existing && (
        <div className="editor__guide" role="note">
          <strong>{name ? `${name}님의 첫 일기예요` : '첫 일기예요'}</strong>
          <span>오늘 있었던 일 하나면 충분해요. 아래 질문을 누르면 그 질문으로 시작해요.</span>
          <span>기분은 글을 보고 알아서 골라요. 저장하면 오늘의 내가 배를 타고 마을에 와요.</span>
        </div>
      )}

      <div className="editor__prompt">
        <span aria-hidden="true">💭</span>
        <button type="button" className="editor__prompt-text" onClick={startWithPrompt} title="질문으로 시작하기">
          {prompt}
        </button>
        <button type="button" className="editor__prompt-next" aria-label="다른 질문"
          onClick={() => setPromptIndex((promptIndex + 1) % DIARY_PROMPTS.length)}>
          다른 질문
        </button>
      </div>

      <div className="editor__page">
        <textarea
          ref={textRef}
          className="editor__text"
          value={text}
          onChange={(e) => change(e.target.value)}
          placeholder={past ? '그날은 어떤 하루였나요? 기억나는 만큼만 써도 괜찮아요.' : '오늘 어떤 하루였나요? 짧게 써도 괜찮아요.'}
          rows={6}
        />
        <span className="editor__count" aria-live="polite">
          {isDraft && <em>저장 안 된 수정</em>}
          {trimmed.length}자{trimmed.length < GOAL ? '' : ' · 충분해요!'}
        </span>
      </div>

      <div className="editor__mood">
        <div className="editor__face" style={{ ['--mood' as string]: emotion?.color ?? '#e9e1d2' }}>
          <img src={portraitFor(mood ?? 'NORMAL')} alt="" />
        </div>
        <div className="editor__mood-body">
          <p className="editor__emotion">
            {emotion
              ? <>{picked ? '내가 고른 기분' : '이렇게 기록될 거예요'} · <strong>{emotion.label}</strong></>
              : <span className="editor__hint">쓰는 내용에 따라 캐릭터 표정이 정해져요</span>}
          </p>
          <div className="editor__moods" role="radiogroup" aria-label="기분 고르기">
            <button type="button" role="radio" aria-checked={!picked} onClick={() => setPicked(null)}>자동</button>
            {EMOTION_IDS.map((id) => (
              <button key={id} type="button" role="radio" aria-checked={picked === id}
                style={{ ['--mood' as string]: EMOTIONS[id].color }} onClick={() => setPicked(picked === id ? null : id)}>
                {EMOTIONS[id].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!existing && (past
        ? <p className="editor__reward-hint">기록하면 🪙 {DIARY_REWARD.past} · 그날의 내가 마을에 와요. 연속 기록에는 들어가지 않아요.</p>
        : <p className="editor__reward-hint">
          기록하면 🪙 {diaryReward(trimmed)}
          {trimmed.length < DIARY_REWARD.bonusLength && ` · ${DIARY_REWARD.bonusLength}자를 넘기면 +${DIARY_REWARD.bonus}`}
        </p>)}

      <button
        type="button"
        className="primary-button editor__save"
        onClick={handleSave}
        disabled={!trimmed}
      >
        {existing ? '고쳐 쓰기' : '기록하고 캐릭터 만들기'}
      </button>
    </div>
  )
}
