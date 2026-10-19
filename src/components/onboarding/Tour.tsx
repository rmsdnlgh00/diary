import { useLayoutEffect, useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { useProfileStore } from '@/store/profileStore'
import { useSettingsStore } from '@/store/settingsStore'

/** One stop of the tour: the control it points at (none: the village itself) and what it says. */
const STOPS: Array<{ target: string | null; title: string; text: string }> = [
  { target: '.journal-button', title: '일기장', text: '지난 일기는 여기서 달력으로 다시 볼 수 있어요.' },
  { target: '.shop-button', title: '상점', text: '일기를 쓰면 코인이 생겨요. 옷과 장식물을 사 보세요.' },
  { target: '.more-menu__toggle', title: '옷장 · 마을 꾸미기', text: '캐릭터 옷을 입히고, 마을에 장식물을 놓을 수 있어요.' },
  { target: null, title: '마을 사람들', text: '마을 사람을 누르면 그날의 일기를 볼 수 있어요. 내일도 하루를 적어 주세요!' },
]
const PAD = 8

interface Spot { x: number; y: number; width: number; height: number }

/**
 * The short tour after the first arrival: a spotlight walks over the journal, the shop and the
 * menu, then ends on the village. Shown while the first-run guide is at 'tour' and nothing else
 * is open.
 */
export function Tour() {
  const touring = useProfileStore((s) => s.profile?.guide === 'tour')
  const setGuide = useProfileStore((s) => s.setGuide)
  const busy = useGameStore((s) => !!s.activePanel || !!s.selectedCharacterId || !!s.arrivingId)
  const settingsOpen = useSettingsStore((s) => s.open)
  const [index, setIndex] = useState(0)
  const [spot, setSpot] = useState<Spot | null>(null)
  const [stage, setStage] = useState({ width: 0, height: 0 })
  const showing = touring && !busy && !settingsOpen
  const stop = STOPS[index]

  useLayoutEffect(() => {
    if (!showing) return
    const measure = () => {
      const frame = document.querySelector('.stage')?.getBoundingClientRect()
      if (!frame) return
      setStage({ width: frame.width, height: frame.height })
      const target = stop.target ? document.querySelector(stop.target)?.getBoundingClientRect() : null
      setSpot(target ? { x: target.left - frame.left - PAD, y: target.top - frame.top - PAD,
        width: target.width + PAD * 2, height: target.height + PAD * 2 } : null)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [showing, stop.target])

  if (!showing) return null
  const last = index === STOPS.length - 1
  const finish = () => { setGuide(null); setIndex(0) }
  // The bubble sits on the far side of the spotlight from the nearest edge, kept on screen.
  const below = spot ? spot.y + spot.height / 2 < stage.height / 2 : false
  const bubbleWidth = Math.min(300, stage.width - 32)
  const bubbleLeft = spot ? Math.max(16, Math.min(stage.width - bubbleWidth - 16, spot.x + spot.width / 2 - bubbleWidth / 2)) : undefined
  const bubbleStyle = !spot ? undefined : below
    ? { top: spot.y + spot.height + 14, left: bubbleLeft, width: bubbleWidth }
    : { bottom: stage.height - spot.y + 14, left: bubbleLeft, width: bubbleWidth }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="하루마을 둘러보기">
      {spot
        ? <div className="tour__spot" style={{ left: spot.x, top: spot.y, width: spot.width, height: spot.height }} />
        : <div className="tour__shade" />}
      <section className={`tour__bubble${spot ? '' : ' tour__bubble--center'}`} style={bubbleStyle} key={index}>
        <p className="tour__step">{index + 1} / {STOPS.length}</p>
        <h2>{stop.title}</h2>
        <p>{stop.text}</p>
        <div className="tour__actions">
          {!last && <button type="button" className="tour__skip" onClick={finish}>건너뛰기</button>}
          <button type="button" className="tour__next" onClick={() => (last ? finish() : setIndex(index + 1))}>
            {last ? '시작할게요' : '다음'}
          </button>
        </div>
      </section>
    </div>
  )
}
