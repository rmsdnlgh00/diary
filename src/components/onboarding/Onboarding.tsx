import { useEffect, useRef, useState } from 'react'
import { portraitFor } from '@/data/expressions'
import { CharacterPreview3D } from '@/components/ui/CharacterPreview3D'
import { NAME_LIMIT, useProfileStore } from '@/store/profileStore'
import { useGameStore } from '@/store/gameStore'
import type { CharacterModel } from '@/types'

type Step = 'welcome' | 'look' | 'name'
const STEPS: Step[] = ['welcome', 'look', 'name']

const LOOKS: Array<{ id: CharacterModel; label: string }> = [
  { id: 'male', label: '남자' },
  { id: 'female', label: '여자' },
]

/**
 * First run: a welcome over the village, then the look the day's characters will have and the
 * name the village uses. Shown until a profile exists.
 */
export function Onboarding() {
  const profile = useProfileStore((s) => s.profile)
  const setProfile = useProfileStore((s) => s.setProfile)
  const [step, setStep] = useState<Step>('welcome')
  const [model, setModel] = useState<CharacterModel | null>(null)
  const [name, setName] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => { if (step === 'name') nameRef.current?.focus() }, [step])
  if (profile) return null

  const index = STEPS.indexOf(step)
  const finish = () => {
    if (!model || !name.trim()) return
    // Straight on to the first diary, unless today is already written (then just the tour).
    const game = useGameStore.getState()
    const written = game.characters.some((c) => c.diaryDate === game.today)
    setProfile({ name, model, guide: written ? 'tour' : 'diary' })
    if (!written) game.togglePanel('DIARY')
  }

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <section className={`onboarding__card onboarding__card--${step}`} key={step}>
        <ol className="onboarding__dots" aria-label={`${STEPS.length}단계 중 ${index + 1}단계`}>
          {STEPS.map((s, i) => <li key={s} data-on={i <= index || undefined} data-current={i === index || undefined} />)}
        </ol>

        {step === 'welcome' && <>
          <h1 id="onboarding-title" className="onboarding__title">하루마을</h1>
          <p className="onboarding__lead">
            하루를 적으면, 그날의 내가<br />배를 타고 마을에 와요.
          </p>
          <p className="onboarding__sub">하루하루가 모여 나만의 마을이 돼요.</p>
          <button type="button" className="onboarding__next" onClick={() => setStep('look')}>시작하기</button>
        </>}

        {step === 'look' && <>
          <h2 id="onboarding-title" className="onboarding__question">어떤 모습으로 올까요?</h2>
          <div className="onboarding__looks" role="radiogroup" aria-label="캐릭터 모습">
            {LOOKS.map((look) => (
              <button key={look.id} type="button" role="radio" aria-checked={model === look.id}
                className="onboarding__look" data-model={look.id} onClick={() => setModel(look.id)}>
                <CharacterPreview3D model={look.id} emotion="HAPPY" outfit={[]} fallback={portraitFor('HAPPY')}
                  label={`${look.label} 캐릭터`} />
                <span>{look.label}</span>
              </button>
            ))}
          </div>
          <p className="onboarding__hint">옷장에서 날마다 바꿀 수도 있어요.</p>
          <div className="onboarding__actions">
            <button type="button" className="onboarding__back" onClick={() => setStep('welcome')}>이전</button>
            <button type="button" className="onboarding__next" disabled={!model} onClick={() => setStep('name')}>
              이 모습으로
            </button>
          </div>
        </>}

        {step === 'name' && <form onSubmit={(event) => { event.preventDefault(); finish() }}>
          <h2 id="onboarding-title" className="onboarding__question">마을에서 뭐라고 부를까요?</h2>
          <input ref={nameRef} className="onboarding__name" value={name} maxLength={NAME_LIMIT}
            placeholder="이름이나 별명" aria-label="이름" enterKeyHint="done"
            onChange={(event) => setName(event.target.value.replace(/^\s+/, ''))} />
          <p className="onboarding__hint">{name.trim() ? `"${name.trim()}"님, 반가워요!` : `${NAME_LIMIT}자까지 쓸 수 있어요.`}</p>
          <div className="onboarding__actions">
            <button type="button" className="onboarding__back" onClick={() => setStep('look')}>이전</button>
            <button type="submit" className="onboarding__next" disabled={!name.trim()}>좋아요</button>
          </div>
        </form>}
      </section>
    </div>
  )
}
