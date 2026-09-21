import type { EmotionId } from '@/types'
import { RIG } from './rig'

const INK = '#4c3a32'
const BLUSH = '#ffa9a9'

interface Props {
  emotion: EmotionId
}

function Blush() {
  return (
    <g opacity={0.55}>
      <ellipse cx={RIG.blush.left} cy={RIG.blush.y} rx={RIG.blush.rx} ry={RIG.blush.ry} fill={BLUSH} />
      <ellipse cx={RIG.blush.right} cy={RIG.blush.y} rx={RIG.blush.rx} ry={RIG.blush.ry} fill={BLUSH} />
    </g>
  )
}

function DotEyes() {
  return (
    <>
      <circle cx={RIG.eye.left} cy={RIG.eye.y} r={RIG.eye.r} fill={INK} />
      <circle cx={RIG.eye.right} cy={RIG.eye.y} r={RIG.eye.r} fill={INK} />
    </>
  )
}

function ArcEyes() {
  const stroke = { stroke: INK, strokeWidth: 3, strokeLinecap: 'round' as const, fill: 'none' }
  return (
    <>
      <path d="M34 46 Q39 40 44 46" {...stroke} />
      <path d="M56 46 Q61 40 66 46" {...stroke} />
    </>
  )
}

function LineEyes() {
  const stroke = { stroke: INK, strokeWidth: 3, strokeLinecap: 'round' as const, fill: 'none' }
  return (
    <>
      <path d="M34 46 L44 46" {...stroke} />
      <path d="M56 46 L66 46" {...stroke} />
    </>
  )
}

/**
 * 감정이 바뀌어도 캐릭터 전체를 교체하지 않고 이 레이어만 갈아끼운다.
 * 나중에 emotion/{id}.png 로 교체할 지점이다.
 */
export function EmotionFace({ emotion }: Props) {
  const line = { stroke: INK, strokeWidth: 3, strokeLinecap: 'round' as const, fill: 'none' }

  switch (emotion) {
    case 'HAPPY':
      return (
        <>
          <Blush />
          <ArcEyes />
          <path d="M42 57 Q50 64 58 57" {...line} />
        </>
      )
    case 'JOYFUL':
      return (
        <>
          <Blush />
          <ArcEyes />
          <path d="M40 55 Q50 68 60 55 Z" fill={INK} />
          <path d="M22 32 l2 -5 2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 Z" fill="#ffd76e" />
          <path d="M76 36 l1.5 -4 1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 Z" fill="#ffd76e" />
        </>
      )
    case 'NORMAL':
      return (
        <>
          <DotEyes />
          <path d="M45 58 L55 58" {...line} />
        </>
      )
    case 'SAD':
      return (
        <>
          <DotEyes />
          <path d="M33 38 Q39 35 45 38" {...line} strokeWidth={2.4} />
          <path d="M55 38 Q61 35 67 38" {...line} strokeWidth={2.4} />
          <path d="M43 62 Q50 55 57 62" {...line} />
          <path d="M64 48 q3 6 0 8 q-3 -2 0 -8 Z" fill="#8fc7ef" />
        </>
      )
    case 'ANGRY':
      return (
        <>
          <DotEyes />
          <path d="M33 36 L45 40" {...line} strokeWidth={2.8} />
          <path d="M67 36 L55 40" {...line} strokeWidth={2.8} />
          <path d="M43 61 Q50 56 57 61" {...line} />
          <path d="M70 30 l0 7 M74 32 l-3 5 M66 32 l3 5" stroke="#ff7a6a" strokeWidth={2.4} strokeLinecap="round" />
        </>
      )
    case 'ANNOYED':
      return (
        <>
          <LineEyes />
          <path d="M33 38 L45 36" {...line} strokeWidth={2.4} />
          <path d="M67 38 L55 36" {...line} strokeWidth={2.4} />
          <path d="M43 59 q4 -4 7 0 q3 4 7 0" {...line} />
        </>
      )
  }
}
