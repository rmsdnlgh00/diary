import { useGameStore } from '@/store/gameStore'
import type { PanelId } from '@/types'

const MENUS: Array<{ id: PanelId; label: string; icon: string }> = [
  { id: 'DIARY', label: '오늘 기록', icon: '📔' },
  { id: 'SHOP', label: '상점', icon: '🏪' },
  { id: 'CHARACTER', label: '캐릭터 꾸미기', icon: '👕' },
  { id: 'DECORATE', label: '공간 꾸미기', icon: '🌷' },
]

export function BottomBar() {
  const activePanel = useGameStore((state) => state.activePanel)
  const togglePanel = useGameStore((state) => state.togglePanel)

  return (
    <div className="bottombar">
      {MENUS.map((menu) => (
        <button
          key={menu.id}
          type="button"
          className={`menu-button${activePanel === menu.id ? ' menu-button--active' : ''}`}
          onClick={() => togglePanel(menu.id)}
        >
          <span className="menu-button__icon">{menu.icon}</span>
          <span className="menu-button__label">{menu.label}</span>
        </button>
      ))}
    </div>
  )
}
