import { DiaryEditor } from '@/components/diary/DiaryEditor'
import { useGameStore } from '@/store/gameStore'
import { TODAY } from '@/utils/date'
import type { PanelId } from '@/types'

const PLACEHOLDER: Record<Exclude<PanelId, 'DIARY'>, { title: string; body: string }> = {
  SHOP: { title: '상점', body: '아이템 구매와 재화 사용은 다음 단계에서 연결됩니다.' },
  CHARACTER: {
    title: '캐릭터 꾸미기',
    body: '보유한 의상과 액세서리 착용은 다음 단계에서 연결됩니다.',
  },
  DECORATE: { title: '공간 꾸미기', body: '장식물 배치와 이동은 다음 단계에서 연결됩니다.' },
}

export function PanelSheet() {
  const activePanel = useGameStore((state) => state.activePanel)
  const closePanel = useGameStore((state) => state.closePanel)

  if (!activePanel) return null
  if (activePanel === 'DIARY') return <DiaryEditor date={TODAY} />

  const panel = PLACEHOLDER[activePanel]

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
