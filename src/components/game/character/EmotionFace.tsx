import type { EmotionId } from '@/types'
import { RIG } from './rig'

const INK = '#4b3b33'
const BLUSH = '#f4a59b'

interface Props {
  emotion: EmotionId
}

function Blush({ strong = false }: { strong?: boolean }) {
  return (
    <g opacity={strong ? 0.75 : 0.5}>
      <ellipse
        cx={RIG.blush.left}
        cy={RIG.blush.y}
        rx={RIG.blush.rx}
        ry={RIG.blush.ry}
        fill={BLUSH}
      />
      <ellipse
        cx={RIG.blush.right}
        cy={RIG.blush.y}
        rx={RIG.blush.rx}
        ry={RIG.blush.ry}
        fill={BLUSH}
      />
    </g>
  )
}

/** 기본 눈. 작고 둥근 갈색 타원. */
function OvalEyes() {
  return (
    <>
      <ellipse cx={RIG.eye.left} cy={RIG.eye.y} rx={RIG.eye.rx} ry={RIG.eye.ry} fill={INK} />
      <ellipse cx={RIG.eye.right} cy={RIG.eye.y} rx={RIG.eye.rx} ry={RIG.eye.ry} fill={INK} />
    </>
  )
}

const stroke = {
  stroke: INK,
  strokeWidth: 2.8,
  strokeLinecap: 'round' as const,
  fill: 'none',
}

/**
 * 감정이 바뀌면 캐릭터 전체가 아니라 이 레이어만 교체된다.
 * 나중에 characters/emotions/{id}.webp 로 갈아끼울 지점이다.
 */
export function EmotionFace({ emotion }: Props) {
  switch (emotion) {
    // 웃음 — 눈을 접고 살짝 미소
    case 'HAPPY':
      return (
        <>
          <Blush />
          <path d="M31 52 Q37 45 43 52" {...stroke} />
          <path d="M57 52 Q63 45 69 52" {...stroke} />
          <path d="M45 62 Q50 67 55 62" {...stroke} />
        </>
      )

    // 신남 — 눈을 크게 뜨고 입을 벌림
    case 'JOYFUL':
      return (
        <>
          <Blush strong />
          <ellipse cx={RIG.eye.left} cy={RIG.eye.y - 1} rx={5} ry={6.4} fill={INK} />
          <ellipse cx={RIG.eye.right} cy={RIG.eye.y - 1} rx={5} ry={6.4} fill={INK} />
          <circle cx={RIG.eye.left + 1.6} cy={RIG.eye.y - 3.4} r={1.6} fill="#fff" />
          <circle cx={RIG.eye.right + 1.6} cy={RIG.eye.y - 3.4} r={1.6} fill="#fff" />
          <ellipse cx={50} cy={64} rx={5} ry={5.6} fill={INK} />
          <ellipse cx={50} cy={66.5} rx={3} ry={2.6} fill="#f08a92" />
        </>
      )

    // 기본 — 점 눈에 아주 작은 입
    case 'NORMAL':
      return (
        <>
          <Blush />
          <OvalEyes />
          <path d="M47 63 Q50 65.5 53 63" {...stroke} strokeWidth={2.4} />
        </>
      )

    // 슬픔 — 눈썹이 처지고 입꼬리가 내려감
    case 'SAD':
      return (
        <>
          <Blush />
          <path d="M30 38 Q37 34 44 38" {...stroke} strokeWidth={2.4} />
          <path d="M56 38 Q63 34 70 38" {...stroke} strokeWidth={2.4} />
          <OvalEyes />
          <path d="M45 66 Q50 61 55 66" {...stroke} strokeWidth={2.4} />
          <path d="M67 54 q3.4 6 0 8.4 q-3.4 -2.4 0 -8.4 Z" fill="#8cc4e8" />
        </>
      )

    // 화남 — 눈썹이 안쪽으로 모이고 화 표시
    case 'ANGRY':
      return (
        <>
          <Blush />
          <path d="M30 35 L44 40" {...stroke} strokeWidth={2.8} />
          <path d="M70 35 L56 40" {...stroke} strokeWidth={2.8} />
          <OvalEyes />
          <path d="M45 65 Q50 61 55 65" {...stroke} strokeWidth={2.4} />
          <g stroke="#ef7f74" strokeWidth={2.4} strokeLinecap="round">
            <path d="M76 24 l0 7" />
            <path d="M81 26 l-3.4 5.6" />
            <path d="M71 26 l3.4 5.6" />
          </g>
        </>
      )

    // 짜증 — 반쯤 감은 눈에 삐뚤어진 입
    case 'ANNOYED':
      return (
        <>
          <Blush />
          <path d="M30 37 L44 34" {...stroke} strokeWidth={2.4} />
          <path d="M70 37 L56 34" {...stroke} strokeWidth={2.4} />
          <path d="M31 50 Q37 54 43 50" {...stroke} />
          <path d="M57 50 Q63 54 69 50" {...stroke} />
          <path d="M44 63 q3.5 -3.5 6 0 q2.5 3.5 6 0" {...stroke} strokeWidth={2.4} />
        </>
      )
  }
}
