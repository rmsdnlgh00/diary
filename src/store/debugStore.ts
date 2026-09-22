import { create } from 'zustand'
import type { WalkDirection } from '@/types'

/** 개발 중 스프라이트를 눈으로 확인하기 위한 상태. 프로덕션 빌드에서는 패널이 렌더되지 않는다. */
interface DebugState {
  open: boolean
  paused: boolean
  /** paused 일 때 강제로 보여줄 프레임 */
  frame: number
  /** paused 일 때 강제로 보여줄 방향 */
  direction: WalkDirection | null
  zoom: number
  showAnchors: boolean
  fps: number
  speed: number
  toggleOpen: () => void
  set: (patch: Partial<DebugState>) => void
  stepFrame: (delta: number, frameCount: number) => void
}

export const useDebugStore = create<DebugState>((setState) => ({
  open: false,
  paused: false,
  frame: 0,
  direction: null,
  zoom: 1,
  showAnchors: false,
  fps: 8,
  speed: 0.032,
  toggleOpen: () => setState((s) => ({ open: !s.open })),
  set: (patch) => setState(patch),
  stepFrame: (delta, frameCount) =>
    setState((s) => ({
      paused: true,
      frame: (s.frame + delta + frameCount) % frameCount,
    })),
}))
