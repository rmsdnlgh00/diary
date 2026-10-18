import { useEffect, useState, type ReactNode } from 'react'
import { useSettingsStore, type FrameRate, type GraphicsQuality } from '@/store/settingsStore'

type Tab = 'graphics' | 'motion' | 'sound'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'graphics', label: '그래픽' },
  { id: 'motion', label: '모션' },
  { id: 'sound', label: '사운드' },
]

const QUALITY: Array<{ id: GraphicsQuality; label: string; note: string }> = [
  { id: 'auto', label: '자동', note: '기기에 맞춰 알아서 골라요' },
  { id: 'low', label: '낮음', note: '그림자 없이 가볍게 · 배터리를 아껴요' },
  { id: 'medium', label: '보통', note: '부드러운 그림자' },
  { id: 'high', label: '높음', note: '선명한 화면과 깊은 그림자' },
]

function Row({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  return (
    <div className="settings-row">
      <div className="settings-row__text">
        <span className="settings-row__label">{label}</span>
        {note && <small className="settings-row__note">{note}</small>}
      </div>
      {children}
    </div>
  )
}

function Choice<T extends string | number>({ label, value, options, onChange }:
  { label: string; value: T; options: Array<{ id: T; label: string }>; onChange: (value: T) => void }) {
  return (
    <div className="settings-choice" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button key={option.id} type="button" role="radio" aria-checked={value === option.id}
          onClick={() => onChange(option.id)}>{option.label}</button>
      ))}
    </div>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" className="settings-switch" aria-checked={on} aria-label={label}
      onClick={() => onChange(!on)}>
      <span className="settings-switch__knob" />
    </button>
  )
}

function Volume({ label, value, disabled, onChange }:
  { label: string; value: number; disabled?: boolean; onChange: (value: number) => void }) {
  const percent = Math.round(value * 100)
  return (
    <div className="settings-volume">
      <input type="range" min={0} max={100} step={5} value={percent} disabled={disabled} aria-label={label}
        style={{ ['--fill' as string]: `${percent}%` }}
        onChange={(event) => onChange(Number(event.target.value) / 100)} />
      <output>{percent}</output>
    </div>
  )
}

/** A game-style settings window over the village: graphics, motion and sound. */
export function SettingsDialog() {
  const s = useSettingsStore()
  const [tab, setTab] = useState<Tab>('graphics')
  const close = () => s.setOpen(false)

  useEffect(() => {
    if (!s.open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') s.setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s.open, s.setOpen])
  if (!s.open) return null

  const quality = QUALITY.find((q) => q.id === s.quality) ?? QUALITY[0]

  return (
    <div className="settings-backdrop" onClick={close}>
      <section className="settings" role="dialog" aria-modal="true" aria-labelledby="settings-title"
        onClick={(event) => event.stopPropagation()}>
        <header className="settings__head">
          <h2 id="settings-title">설정</h2>
          <button type="button" className="settings__close" aria-label="닫기" onClick={close}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="settings__tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} data-tab={t.id}
              onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        <div className="settings__body" role="tabpanel">
          {tab === 'graphics' && <>
            <Row label="화질" note={quality.note}>
              <Choice label="화질" value={s.quality} options={QUALITY} onChange={(v) => s.set('quality', v)} />
            </Row>
            <Row label="프레임" note={s.frameRate === 30 ? '배터리를 아껴요' : '부드럽게 움직여요'}>
              <Choice<FrameRate> label="프레임" value={s.frameRate}
                options={[{ id: 30, label: '30' }, { id: 60, label: '60' }]} onChange={(v) => s.set('frameRate', v)} />
            </Row>
          </>}

          {tab === 'motion' && <>
            <Row label="움직임 줄이기" note="창이 열리고 닫힐 때 움직임 없이 바로 보여요">
              <Toggle label="움직임 줄이기" on={s.reduceMotion} onChange={(v) => s.set('reduceMotion', v)} />
            </Row>
            <Row label="물결 움직임" note="연못과 바다의 일렁이는 물결">
              <Toggle label="물결 움직임" on={s.waterMotion} onChange={(v) => s.set('waterMotion', v)} />
            </Row>
          </>}

          {tab === 'sound' && <>
            <p className="settings__soon">소리는 곧 마을에 찾아와요. 지금 맞춰 두면 그대로 들려요.</p>
            <Row label="음소거">
              <Toggle label="음소거" on={s.muted} onChange={(v) => s.set('muted', v)} />
            </Row>
            <Row label="전체 음량">
              <Volume label="전체 음량" value={s.masterVolume} disabled={s.muted} onChange={(v) => s.set('masterVolume', v)} />
            </Row>
            <Row label="배경 음악">
              <Volume label="배경 음악" value={s.musicVolume} disabled={s.muted} onChange={(v) => s.set('musicVolume', v)} />
            </Row>
            <Row label="효과음">
              <Volume label="효과음" value={s.effectsVolume} disabled={s.muted} onChange={(v) => s.set('effectsVolume', v)} />
            </Row>
          </>}
        </div>

        <footer className="settings__foot">
          <button type="button" className="settings__reset" onClick={s.reset}>기본값으로</button>
        </footer>
      </section>
    </div>
  )
}
