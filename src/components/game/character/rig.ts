/**
 * 모든 캐릭터 레이어가 공유하는 좌표계.
 * 레이어를 따로 그려도 정확히 겹치도록 같은 viewBox를 쓴다.
 *
 * 머리가 몸보다 큰 치비 비율. 머리가 전체 높이의 절반 정도를 차지한다.
 */
export const RIG = {
  viewBox: '0 0 100 132',
  aspectRatio: 100 / 132,
  head: { cx: 50, cy: 44, r: 32 },
  ear: { left: 19, right: 81, y: 47, r: 6 },
  eye: { left: 37, right: 63, y: 50, rx: 4.2, ry: 5.6 },
  blush: { left: 24, right: 76, y: 59, rx: 7.5, ry: 4.6 },
  mouth: { cx: 50, cy: 63 },
  brow: { y: 38 },
  torso: { x: 28, y: 68, width: 44, height: 34, radius: 16 },
  shorts: { x: 31, y: 96, width: 38, height: 16, radius: 7 },
  /** 발이 닿는 y. anchorY 계산에 쓴다. */
  groundY: 130,
} as const
