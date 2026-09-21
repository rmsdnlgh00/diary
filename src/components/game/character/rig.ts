/**
 * 모든 캐릭터 레이어가 공유하는 좌표계.
 * 레이어를 따로 그려도 정확히 겹치도록 같은 viewBox를 쓴다.
 */
export const RIG = {
  viewBox: '0 0 100 160',
  aspectRatio: 100 / 160,
  head: { cx: 50, cy: 46, r: 27 },
  eye: { left: 39, right: 61, y: 45, r: 3.6 },
  mouth: { cx: 50, cy: 58 },
  blush: { left: 29, right: 71, y: 54, rx: 6, ry: 4 },
  torso: { x: 28, y: 74, width: 44, height: 44, radius: 18 },
} as const
