import { WALK_SHEETS } from '@/data/characterFrames'
import { useDebugStore } from '@/store/debugStore'
import type { WalkDirection } from '@/types'

const DIRECTIONS: WalkDirection[] = ['front', 'back', 'left', 'right']

/** 개발 중에만 쓰는 스프라이트 확인 패널. 프로덕션 빌드에서는 렌더되지 않는다. */
export function SpriteInspector({ liveDirection }: { liveDirection: WalkDirection }) {
  const debug = useDebugStore()
  const direction = debug.direction ?? liveDirection
  const frameCount = WALK_SHEETS[direction].frames.length

  if (!debug.open) {
    return (
      <button type="button" className="inspector-toggle" onClick={debug.toggleOpen}>
        스프라이트 확인
      </button>
    )
  }

  return (
    <div className="inspector">
      <div className="inspector__row inspector__row--title">
        <strong>스프라이트 확인</strong>
        <button type="button" className="inspector__x" onClick={debug.toggleOpen}>
          ✕
        </button>
      </div>

      <div className="inspector__row">
        <button type="button" onClick={() => debug.set({ paused: !debug.paused })}>
          {debug.paused ? '▶ 재생' : '⏸ 일시정지'}
        </button>
        <button type="button" onClick={() => debug.stepFrame(-1, frameCount)}>
          ◀ 이전
        </button>
        <button type="button" onClick={() => debug.stepFrame(1, frameCount)}>
          다음 ▶
        </button>
        <span className="inspector__value">
          {debug.paused ? debug.frame : '재생 중'} / {frameCount - 1}
        </span>
      </div>

      <div className="inspector__row">
        <label>방향</label>
        <select
          value={debug.direction ?? 'live'}
          onChange={(e) =>
            debug.set({
              direction: e.target.value === 'live' ? null : (e.target.value as WalkDirection),
            })
          }
        >
          <option value="live">이동 방향 따라가기</option>
          {DIRECTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="inspector__row">
        <label>확대</label>
        <input
          type="range"
          min={1}
          max={6}
          step={0.5}
          value={debug.zoom}
          onChange={(e) => debug.set({ zoom: Number(e.target.value) })}
        />
        <span className="inspector__value">{debug.zoom}x</span>
      </div>

      <div className="inspector__row">
        <label>걷기 fps</label>
        <input
          type="range"
          min={2}
          max={20}
          step={1}
          value={debug.fps}
          onChange={(e) => debug.set({ fps: Number(e.target.value) })}
        />
        <span className="inspector__value">{debug.fps}</span>
      </div>

      <div className="inspector__row">
        <label>이동 속도</label>
        <input
          type="range"
          min={0.03}
          max={0.4}
          step={0.01}
          value={debug.speed}
          onChange={(e) => debug.set({ speed: Number(e.target.value) })}
        />
        <span className="inspector__value">{debug.speed.toFixed(2)}</span>
      </div>

      <div className="inspector__row">
        <label>
          <input
            type="checkbox"
            checked={debug.showAnchors}
            onChange={(e) => debug.set({ showAnchors: e.target.checked })}
          />
          발·얼굴 기준점 표시
        </label>
      </div>
    </div>
  )
}
