/**
 * The game's line icons: one 24 px grid, round caps and joins, the same stroke everywhere, and a
 * soft tint inside the main shape (`.icon__tint`) so they read like the village's hand-drawn signs.
 * Colour comes from `currentColor`.
 */
export type IconName = 'shop' | 'wardrobe' | 'village' | 'journal' | 'pencil' | 'settings'

const PATHS: Record<IconName, { tint?: string; lines: string[] }> = {
  // A market stall: scalloped awning over a counter.
  shop: {
    tint: 'M4 9.5h16v10.5H4z',
    lines: [
      'M3.5 9.5 5 4.5h14l1.5 5',
      'M3.5 9.5c0 1.3 1 2.2 2.2 2.2s2.1-.9 2.1-2.2c0 1.3 1 2.2 2.1 2.2s2.1-.9 2.1-2.2c0 1.3 1 2.2 2.1 2.2s2.1-.9 2.1-2.2c0 1.3 1 2.2 2.2 2.2s2.1-.9 2.1-2.2',
      'M5 11.7V20h14v-8.3',
      'M10 20v-4.5h4V20',
    ],
  },
  // A little T-shirt.
  wardrobe: {
    tint: 'M7.5 9v11h9V9',
    lines: [
      'M9 3.8 4.2 6.4l1.7 3.7 1.6-.8V20h9V9.3l1.6.8 1.7-3.7L15 3.8c-.5 1.3-1.6 2.1-3 2.1s-2.5-.8-3-2.1z',
    ],
  },
  // A tulip on a patch of ground.
  village: {
    tint: 'M8 5.5c1 .9 1.6 1.6 2 2.3.4-1.3 1.1-2.5 2-3.3.9.8 1.6 2 2 3.3.4-.7 1-1.4 2-2.3.4 2.7-.4 5.5-4 5.5S7.6 8.2 8 5.5z',
    lines: [
      'M8 5.5c1 .9 1.6 1.6 2 2.3.4-1.3 1.1-2.5 2-3.3.9.8 1.6 2 2 3.3.4-.7 1-1.4 2-2.3.4 2.7-.4 5.5-4 5.5S7.6 8.2 8 5.5z',
      'M12 11v8',
      'M12 16c-1.2-1.8-2.8-2.6-4.6-2.4.3 1.9 2 3 4.6 2.9',
      'M4 19.5c2.6-.8 5.3-1.2 8-1.2s5.4.4 8 1.2',
    ],
  },
  // An open diary.
  journal: {
    tint: 'M12 6.5c-2.2-1.4-4.9-1.9-8-1.4v13c3.1-.5 5.8 0 8 1.4',
    lines: [
      'M12 6.5c-2.2-1.4-4.9-1.9-8-1.4v13c3.1-.5 5.8 0 8 1.4 2.2-1.4 4.9-1.9 8-1.4v-13c-3.1-.5-5.8 0-8 1.4z',
      'M12 6.5v13',
      'M6.5 9.2c1.3-.1 2.5.1 3.5.6M6.5 12.2c1.3-.1 2.5.1 3.5.6',
    ],
  },
  pencil: {
    tint: 'M5 19l1-4 9.6-9.6 3 3L9 18z',
    lines: ['M5 19l1-4 9.6-9.6a1.6 1.6 0 0 1 2.3 0l.7.7a1.6 1.6 0 0 1 0 2.3L9 18z', 'M14.2 6.8l3 3'],
  },
  // A soft cog.
  settings: {
    tint: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
    lines: ['M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z', 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'],
  },
}

export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  const { tint, lines } = PATHS[name]
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {tint && <path className="icon__tint" d={tint} fill="currentColor" stroke="none" />}
      {lines.map((d) => <path key={d} d={d} />)}
    </svg>
  )
}
