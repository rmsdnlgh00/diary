import type { EnvironmentKind } from '@/types'

const WOOD = '#d9a06b'
const WOOD_DARK = '#b9814f'
const LEAF = '#7cc45f'
const LEAF_DARK = '#63ad49'

/** 실제 환경 에셋이 들어오기 전까지 쓰는 도형. */
export function EnvironmentPlaceholder({ kind }: { kind: EnvironmentKind }) {
  switch (kind) {
    case 'SHOP':
      return (
        <svg className="sprite" viewBox="0 0 100 110" role="presentation">
          <rect x={14} y={44} width={72} height={56} rx={10} fill="#fff3e2" />
          <path d="M6 46 L50 12 L94 46 Z" fill="#f2938c" />
          <path d="M6 46 L50 12 L94 46 Z" fill="none" stroke="#e07c76" strokeWidth={3} strokeLinejoin="round" />
          <rect x={20} y={46} width={60} height={12} rx={6} fill="#ffd9a8" />
          <rect x={20} y={46} width={12} height={12} fill="#f2938c" opacity={0.7} />
          <rect x={44} y={46} width={12} height={12} fill="#f2938c" opacity={0.7} />
          <rect x={68} y={46} width={12} height={12} fill="#f2938c" opacity={0.7} />
          <rect x={40} y={68} width={22} height={32} rx={8} fill={WOOD} />
          <circle cx={57} cy={86} r={2.5} fill={WOOD_DARK} />
          <rect x={18} y={66} width={16} height={16} rx={6} fill="#bfe6f5" stroke="#fff" strokeWidth={2} />
          <rect x={68} y={66} width={16} height={16} rx={6} fill="#bfe6f5" stroke="#fff" strokeWidth={2} />
          <rect x={34} y={26} width={32} height={12} rx={6} fill="#fff3e2" />
          <circle cx={50} cy={32} r={3} fill="#f2938c" />
        </svg>
      )

    case 'POND':
      return (
        <svg className="sprite" viewBox="0 0 100 52" role="presentation">
          <ellipse cx={50} cy={26} rx={48} ry={24} fill="#8fd0ea" />
          <ellipse cx={50} cy={24} rx={43} ry={20} fill="#a9dff2" />
          <ellipse cx={34} cy={18} rx={12} ry={4} fill="#ffffff" opacity={0.5} />
          <ellipse cx={66} cy={32} rx={8} ry={3} fill="#ffffff" opacity={0.35} />
        </svg>
      )

    case 'BRIDGE':
      return (
        <svg className="sprite" viewBox="0 0 100 56" role="presentation">
          <path d="M4 50 Q50 6 96 50 L96 56 L4 56 Z" fill={WOOD} />
          <path d="M4 50 Q50 6 96 50" fill="none" stroke={WOOD_DARK} strokeWidth={4} />
          <path d="M8 40 Q50 0 92 40" fill="none" stroke={WOOD_DARK} strokeWidth={3} strokeLinecap="round" />
          <path d="M20 44 L20 32 M40 34 L40 22 M60 34 L60 22 M80 44 L80 32" stroke={WOOD_DARK} strokeWidth={3} strokeLinecap="round" />
        </svg>
      )

    case 'PATH':
      return (
        <svg className="sprite" viewBox="0 0 200 28" preserveAspectRatio="none" role="presentation">
          <rect x={0} y={2} width={200} height={24} rx={12} fill="#eddfba" />
          <rect x={0} y={5} width={200} height={18} rx={9} fill="#f7ead0" />
        </svg>
      )

    case 'FENCE':
      return (
        <svg className="sprite" viewBox="0 0 100 44" role="presentation">
          <rect x={4} y={26} width={92} height={5} rx={2.5} fill={WOOD} />
          <rect x={4} y={14} width={92} height={5} rx={2.5} fill={WOOD} />
          <rect x={10} y={4} width={9} height={38} rx={4.5} fill={WOOD_DARK} />
          <rect x={45} y={4} width={9} height={38} rx={4.5} fill={WOOD_DARK} />
          <rect x={80} y={4} width={9} height={38} rx={4.5} fill={WOOD_DARK} />
        </svg>
      )

    case 'BIG_TREE':
      return (
        <svg className="sprite" viewBox="0 0 100 130" role="presentation">
          <rect x={42} y={72} width={16} height={54} rx={7} fill={WOOD} />
          <circle cx={30} cy={62} r={24} fill={LEAF_DARK} />
          <circle cx={70} cy={60} r={26} fill={LEAF_DARK} />
          <circle cx={50} cy={38} r={32} fill={LEAF} />
          <circle cx={30} cy={56} r={20} fill={LEAF} />
          <circle cx={70} cy={54} r={22} fill={LEAF} />
          <circle cx={40} cy={28} r={8} fill="#96d47c" opacity={0.7} />
        </svg>
      )

    case 'BUSH':
      return (
        <svg className="sprite" viewBox="0 0 100 60" role="presentation">
          <circle cx={26} cy={38} r={20} fill={LEAF_DARK} />
          <circle cx={74} cy={38} r={20} fill={LEAF_DARK} />
          <circle cx={50} cy={28} r={26} fill={LEAF} />
          <circle cx={30} cy={34} r={16} fill={LEAF} />
        </svg>
      )
  }
}
