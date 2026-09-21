import { RIG } from './rig'

const OUTLINE = 'rgba(76, 58, 50, 0.18)'

export function BodyLayer({ skin }: { skin: string }) {
  return (
    <>
      {/* 다리 + 신발 */}
      <rect x={38} y={112} width={10} height={28} rx={5} fill={skin} />
      <rect x={52} y={112} width={10} height={28} rx={5} fill={skin} />
      <rect x={34} y={134} width={16} height={11} rx={5.5} fill="#5f5049" />
      <rect x={50} y={134} width={16} height={11} rx={5.5} fill="#5f5049" />
      {/* 팔 */}
      <rect x={20} y={80} width={10} height={30} rx={5} fill={skin} />
      <rect x={70} y={80} width={10} height={30} rx={5} fill={skin} />
      {/* 몸통 + 목 */}
      <rect x={44} y={64} width={12} height={14} rx={5} fill={skin} />
      <rect
        x={RIG.torso.x}
        y={RIG.torso.y}
        width={RIG.torso.width}
        height={RIG.torso.height}
        rx={RIG.torso.radius}
        fill={skin}
      />
      {/* 머리 */}
      <circle cx={RIG.head.cx} cy={RIG.head.cy} r={RIG.head.r} fill={skin} stroke={OUTLINE} strokeWidth={1.5} />
    </>
  )
}

export function OutfitLayer({ color, accent }: { color: string; accent?: string }) {
  const trim = accent ?? color
  return (
    <>
      <rect x={26} y={72} width={48} height={50} rx={18} fill={color} />
      <rect x={19} y={78} width={12} height={22} rx={6} fill={color} />
      <rect x={69} y={78} width={12} height={22} rx={6} fill={color} />
      <path d="M40 73 Q50 82 60 73" fill="none" stroke={trim} strokeWidth={3.5} strokeLinecap="round" />
      <rect x={26} y={112} width={48} height={10} rx={5} fill={trim} />
    </>
  )
}

export function HairLayer({ style, color }: { style: string; color: string }) {
  const cap = <path d="M22 50 A28 28 0 0 1 78 50 L78 44 Q50 28 22 44 Z" fill={color} />

  switch (style) {
    case 'hair_bob':
      return (
        <>
          <rect x={20} y={38} width={11} height={34} rx={5.5} fill={color} />
          <rect x={69} y={38} width={11} height={34} rx={5.5} fill={color} />
          {cap}
        </>
      )
    case 'hair_bun':
      return (
        <>
          <circle cx={50} cy={16} r={10} fill={color} />
          {cap}
        </>
      )
    case 'hair_curly':
      return (
        <>
          <circle cx={28} cy={38} r={9} fill={color} />
          <circle cx={42} cy={27} r={10} fill={color} />
          <circle cx={58} cy={27} r={10} fill={color} />
          <circle cx={72} cy={38} r={9} fill={color} />
          {cap}
        </>
      )
    default:
      return cap
  }
}

export function AccessoryLayer({ ids, colors }: { ids: string[]; colors: Record<string, string> }) {
  return (
    <>
      {ids.includes('acc_backpack') && (
        <>
          <rect x={35} y={74} width={6} height={36} rx={3} fill={colors.acc_backpack} />
          <rect x={59} y={74} width={6} height={36} rx={3} fill={colors.acc_backpack} />
        </>
      )}
      {ids.includes('acc_glasses') && (
        <g stroke={colors.acc_glasses} strokeWidth={2.2} fill="none">
          <circle cx={RIG.eye.left} cy={RIG.eye.y} r={7} />
          <circle cx={RIG.eye.right} cy={RIG.eye.y} r={7} />
          <path d="M46 45 L54 45" />
        </g>
      )}
      {ids.includes('acc_cap') && (
        <>
          <path d="M23 40 A27 27 0 0 1 77 40 Z" fill={colors.acc_cap} />
          <rect x={20} y={36} width={60} height={8} rx={4} fill={colors.acc_cap} />
          <rect x={14} y={36} width={30} height={7} rx={3.5} fill={colors.acc_cap} opacity={0.85} />
        </>
      )}
    </>
  )
}
