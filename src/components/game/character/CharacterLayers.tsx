import { RIG } from './rig'

const OUTLINE = 'rgba(75, 59, 51, 0.16)'
const SHOE = '#4b3b33'
const SOCK = '#fffaf3'

export function BodyLayer({ skin }: { skin: string }) {
  return (
    <>
      {/* 신발 · 양말 · 다리 */}
      <rect x={38} y={102} width={11} height={18} rx={5} fill={skin} />
      <rect x={51} y={102} width={11} height={18} rx={5} fill={skin} />
      <rect x={37} y={113} width={13} height={10} rx={4.5} fill={SOCK} />
      <rect x={50} y={113} width={13} height={10} rx={4.5} fill={SOCK} />
      <path d="M33 122 q0 -3 4 -3 h12 q2 0 2 3 v3 q0 5 -6 5 h-8 q-4 0 -4 -5 Z" fill={SHOE} />
      <path d="M67 122 q0 -3 -4 -3 h-12 q-2 0 -2 3 v3 q0 5 6 5 h8 q4 0 4 -5 Z" fill={SHOE} />

      {/* 손 */}
      <circle cx={24} cy={95} r={5.5} fill={skin} />
      <circle cx={76} cy={95} r={5.5} fill={skin} />

      {/* 몸통 */}
      <rect
        x={RIG.torso.x}
        y={RIG.torso.y}
        width={RIG.torso.width}
        height={RIG.torso.height}
        rx={RIG.torso.radius}
        fill={skin}
      />

      {/* 귀 */}
      <circle cx={RIG.ear.left} cy={RIG.ear.y} r={RIG.ear.r} fill={skin} />
      <circle cx={RIG.ear.right} cy={RIG.ear.y} r={RIG.ear.r} fill={skin} />

      {/* 머리 */}
      <circle
        cx={RIG.head.cx}
        cy={RIG.head.cy}
        r={RIG.head.r}
        fill={skin}
        stroke={OUTLINE}
        strokeWidth={1.4}
      />
    </>
  )
}

export function OutfitLayer({
  color,
  accent,
  bottom = '#8fa2c6',
}: {
  color: string
  accent?: string
  bottom?: string
}) {
  const trim = accent ?? color

  return (
    <>
      {/* 반바지 */}
      <rect
        x={RIG.shorts.x}
        y={RIG.shorts.y}
        width={RIG.shorts.width}
        height={RIG.shorts.height}
        rx={RIG.shorts.radius}
        fill={bottom}
      />
      <path d="M50 104 L50 110" stroke="rgba(75,59,51,0.16)" strokeWidth={2} strokeLinecap="round" />

      {/* 오버사이즈 스웨터 */}
      <rect x={26} y={66} width={48} height={32} rx={15} fill={color} />
      <rect x={17} y={71} width={15} height={26} rx={7.5} fill={color} />
      <rect x={68} y={71} width={15} height={26} rx={7.5} fill={color} />
      <path d="M40 68 q10 7 20 0" fill="none" stroke={trim} strokeWidth={3} strokeLinecap="round" />
      <path d="M17 92 q7 3 15 0" fill="none" stroke={trim} strokeWidth={2.4} strokeLinecap="round" />
      <path d="M68 92 q7 3 15 0" fill="none" stroke={trim} strokeWidth={2.4} strokeLinecap="round" />
      <path
        d="M50 82 q-3 -4 -6 -1 q-2 3 6 8 q8 -5 6 -8 q-3 -3 -6 1 Z"
        fill={trim}
        opacity={0.55}
      />
    </>
  )
}

/** 보울컷 기준. 위쪽 아치와 앞머리 사이가 머리카락이 된다. */
const BOWL_CUT = 'M17 46 A33 33 0 0 1 83 46 L83 58 Q80 45 71 40 Q61 34 50 35 Q39 34 29 40 Q20 45 17 58 Z'

export function HairLayer({ style, color }: { style: string; color: string }) {
  const base = <path d={BOWL_CUT} fill={color} />
  const sprout = <path d="M56 12 q7 -7 13 -5 q-2 7 -11 8 Z" fill={color} />

  switch (style) {
    case 'hair_bob':
      return (
        <>
          <path d="M18 44 q-4 14 0 22 q5 4 9 0 q-3 -12 -1 -22 Z" fill={color} />
          <path d="M82 44 q4 14 0 22 q-5 4 -9 0 q3 -12 1 -22 Z" fill={color} />
          {base}
          {sprout}
        </>
      )
    case 'hair_bun':
      return (
        <>
          <circle cx={50} cy={12} r={10} fill={color} />
          {base}
        </>
      )
    case 'hair_curly':
      return (
        <>
          <circle cx={22} cy={36} r={11} fill={color} />
          <circle cx={40} cy={22} r={12} fill={color} />
          <circle cx={62} cy={22} r={12} fill={color} />
          <circle cx={79} cy={36} r={11} fill={color} />
          {base}
        </>
      )
    default:
      return (
        <>
          {base}
          {sprout}
        </>
      )
  }
}

export function AccessoryLayer({ ids, colors }: { ids: string[]; colors: Record<string, string> }) {
  return (
    <>
      {ids.includes('acc_backpack') && (
        <>
          <path
            d="M33 70 L63 100"
            stroke={colors.acc_backpack}
            strokeWidth={5}
            strokeLinecap="round"
          />
          <rect x={57} y={94} width={19} height={15} rx={5} fill={colors.acc_backpack} />
          <rect x={57} y={94} width={19} height={5} rx={2.5} fill="rgba(0,0,0,0.12)" />
        </>
      )}

      {ids.includes('acc_glasses') && (
        <g stroke="#5a4b44" strokeWidth={2.2} fill="none">
          <circle cx={RIG.eye.left} cy={RIG.eye.y} r={8} />
          <circle cx={RIG.eye.right} cy={RIG.eye.y} r={8} />
          <path d="M45 50 L55 50" />
        </g>
      )}

      {ids.includes('acc_cap') && (
        <>
          {/* 챙 — 왼쪽으로 뻗는다 */}
          <path
            d="M24 32 C11 31 1 36 1 40 C1 44 13 45 27 42 Z"
            fill={colors.acc_cap}
            opacity={0.92}
          />
          <path d="M19 39 A31 31 0 0 1 81 39 Z" fill={colors.acc_cap} />
          <path
            d="M19 39 q31 7 62 0"
            fill="none"
            stroke="rgba(0,0,0,0.13)"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          <circle cx={50} cy={9.5} r={3.4} fill={colors.acc_cap} />
        </>
      )}
    </>
  )
}
