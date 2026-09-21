import type { DecorationType } from '@/types'

const WOOD = '#dda86f'
const WOOD_DARK = '#bd8750'
const METAL = '#9aa7b5'

/** 실제 장식물 에셋이 들어오기 전까지 쓰는 도형. */
export function DecorationPlaceholder({ type }: { type: DecorationType }) {
  switch (type) {
    case 'BENCH':
      return (
        <svg className="sprite" viewBox="0 0 100 70" role="presentation">
          <rect x={10} y={8} width={80} height={9} rx={4.5} fill={WOOD} />
          <rect x={10} y={22} width={80} height={9} rx={4.5} fill={WOOD} />
          <rect x={6} y={36} width={88} height={11} rx={5.5} fill={WOOD_DARK} />
          <rect x={14} y={45} width={9} height={20} rx={4.5} fill={WOOD_DARK} />
          <rect x={77} y={45} width={9} height={20} rx={4.5} fill={WOOD_DARK} />
          <rect x={12} y={6} width={8} height={34} rx={4} fill={WOOD_DARK} />
          <rect x={80} y={6} width={8} height={34} rx={4} fill={WOOD_DARK} />
        </svg>
      )

    case 'TREE':
      return (
        <svg className="sprite" viewBox="0 0 100 120" role="presentation">
          <rect x={44} y={70} width={13} height={46} rx={6} fill={WOOD} />
          <circle cx={34} cy={58} r={20} fill="#6fb85a" />
          <circle cx={66} cy={56} r={21} fill="#6fb85a" />
          <circle cx={50} cy={36} r={27} fill="#8ad06f" />
          <circle cx={38} cy={30} r={7} fill="#a3de8b" opacity={0.8} />
        </svg>
      )

    case 'FLOWER':
      return (
        <svg className="sprite" viewBox="0 0 100 110" role="presentation">
          <path d="M50 100 L50 52" stroke="#6fb85a" strokeWidth={7} strokeLinecap="round" />
          <path d="M50 78 q-18 -8 -22 -22 q18 0 22 18 Z" fill="#7cc45f" />
          <circle cx={50} cy={30} r={13} fill="#ff9ec4" />
          <circle cx={30} cy={40} r={13} fill="#ffb3d2" />
          <circle cx={70} cy={40} r={13} fill="#ffb3d2" />
          <circle cx={38} cy={58} r={12} fill="#ff9ec4" />
          <circle cx={62} cy={58} r={12} fill="#ff9ec4" />
          <circle cx={50} cy={45} r={11} fill="#ffe08a" />
        </svg>
      )

    case 'BICYCLE':
      return (
        <svg className="sprite" viewBox="0 0 100 70" role="presentation">
          <circle cx={24} cy={46} r={18} fill="none" stroke={METAL} strokeWidth={5} />
          <circle cx={76} cy={46} r={18} fill="none" stroke={METAL} strokeWidth={5} />
          <path d="M24 46 L44 46 L56 22 L76 46 M44 46 L56 22" fill="none" stroke="#f2938c" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M56 22 L68 20" stroke="#f2938c" strokeWidth={5} strokeLinecap="round" />
          <rect x={36} y={26} width={16} height={6} rx={3} fill="#6b5a52" />
          <rect x={64} y={14} width={14} height={5} rx={2.5} fill="#6b5a52" />
        </svg>
      )

    case 'LAMP':
      return (
        <svg className="sprite" viewBox="0 0 44 140" role="presentation">
          <ellipse cx={22} cy={132} rx={13} ry={6} fill="#8c9aa8" />
          <rect x={17} y={42} width={10} height={90} rx={5} fill={METAL} />
          <path d="M8 42 L36 42 L30 16 L14 16 Z" fill="#ffe3a8" stroke={METAL} strokeWidth={3.5} strokeLinejoin="round" />
          <rect x={13} y={7} width={18} height={9} rx={4.5} fill={METAL} />
          <circle cx={22} cy={30} r={7} fill="#fff4cf" />
        </svg>
      )

    case 'PICNIC_MAT':
      return (
        <svg className="sprite" viewBox="0 0 100 60" role="presentation">
          <ellipse cx={50} cy={30} rx={48} ry={26} fill="#ffd9dd" />
          <ellipse cx={50} cy={30} rx={40} ry={20} fill="#ffeaec" />
          <path d="M18 30 L82 30 M50 8 L50 52" stroke="#ffc2c9" strokeWidth={5} />
        </svg>
      )
  }
}
