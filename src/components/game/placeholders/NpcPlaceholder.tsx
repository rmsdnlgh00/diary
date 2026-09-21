import type { NpcType } from '@/types'

const FUR = '#e7b783'
const FUR_DARK = '#cf9a64'
const INK = '#4c3a32'

/** 실제 NPC 에셋이 들어오기 전까지 쓰는 도형. */
export function NpcPlaceholder({ type }: { type: NpcType }) {
  switch (type) {
    case 'DOG':
      return (
        <svg className="sprite" viewBox="0 0 100 80" role="presentation">
          <path d="M18 52 q-12 -6 -10 -18 q8 2 12 12 Z" fill={FUR_DARK} />
          <ellipse cx={46} cy={52} rx={28} ry={17} fill={FUR} />
          <rect x={28} y={60} width={9} height={14} rx={4.5} fill={FUR_DARK} />
          <rect x={56} y={60} width={9} height={14} rx={4.5} fill={FUR_DARK} />
          <circle cx={76} cy={36} r={18} fill={FUR} />
          <path d="M62 24 q-4 -14 6 -16 q4 6 2 16 Z" fill={FUR_DARK} />
          <path d="M90 24 q4 -14 -6 -16 q-4 6 -2 16 Z" fill={FUR_DARK} />
          <circle cx={71} cy={34} r={2.6} fill={INK} />
          <circle cx={83} cy={34} r={2.6} fill={INK} />
          <ellipse cx={78} cy={44} rx={4} ry={3} fill={INK} />
          <path d="M78 47 q-4 4 -7 0" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
        </svg>
      )
  }
}
