import { useGameStore } from '@/store/gameStore'
import type { PanelId } from '@/types'

const PANEL_TEXT: Record<PanelId, { title: string; body: string }> = {
  DIARY: { title: '오늘 기록', body: '일기 작성과 감정 분석은 PHASE 2에서 연결됩니다.' },
  SHOP: { title: '상점', body: '아이템 구매와 재화 사용은 PHASE 3에서 연결됩니다.' },
  CHARACTER: { title: '캐릭터 꾸미기', body: '보유한 의상과 액세서리 착용은 PHASE 3에서 연결됩니다.' },
  DECORATE: { title: '공간 꾸미기', body: '장식물 배치와 이동은 PHASE 4에서 연결됩니다.' },
}

export function PanelSheet() {
  const activePanel = useGameStore((state) => state.activePanel)
  const closePanel = useGameStore((state) => state.closePanel)

  if (!activePanel) return null
  const panel = PANEL_TEXT[activePanel]

  return (
    <div className="sheet">
      <div className="sheet__header">
        <h2>{panel.title}</h2>
        <button type="button" className="icon-button" onClick={closePanel} aria-label="닫기">
          ✕
        </button>
      </div>
      <p className="sheet__body">{panel.body}</p>
    </div>
  )
}
