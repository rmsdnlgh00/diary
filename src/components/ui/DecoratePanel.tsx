import { ITEMS, getItem } from '@/data/items'
import { useGameStore } from '@/store/gameStore'
import { ItemArtwork } from './ItemArtwork'

export function DecoratePanel() {
  const inventory = useGameStore((s) => s.inventory)
  const worldId = useGameStore((s) => s.worldId)
  const worldDecorations = useGameStore((s) => s.worldDecorations)
  const selectedId = useGameStore((s) => s.selectedDecorationId)
  const tool = useGameStore((s) => s.placementTool)
  const choose = useGameStore((s) => s.chooseDecoration)
  const move = useGameStore((s) => s.startMovingDecoration)
  const recall = useGameStore((s) => s.recallDecoration)
  const cancel = useGameStore((s) => s.cancelPlacement)
  const close = useGameStore((s) => s.closePanel)
  const items = ITEMS.filter((item) => inventory.decorations.includes(item.id))
  const placed = worldDecorations[worldId] ?? []
  const selected = placed.find((d) => d.id === selectedId)
  return <>
    <p className="panel-hint">아이템을 고르고 잔디 위를 눌러주세요. 종류마다 이 달에 하나씩 놓을 수 있어요.</p>
    <div className="decoration-inventory">
      {items.map((item) => {
        const existing = placed.find((d) => d.itemId === item.id)
        return <button key={item.id} type="button" className="decoration-choice" data-item-id={item.id}
          aria-pressed={tool?.kind === 'place' ? tool.itemId === item.id : !!existing && selectedId === existing.id}
          onClick={() => choose(item.id)}>
          <ItemArtwork item={item} /><span>{item.name}<small>{existing ? '배치 중' : '배치하기'}</small></span>
        </button>
      })}
    </div>
    {!items.length && <p className="panel-hint">보유한 장식물이 없어요. 상점에서 마음에 드는 아이템을 골라보세요.</p>}
    {selected && <div className="decoration-actions">
      <strong>{getItem(selected.itemId)?.name}</strong>
      <div><button type="button" className="item-action" onClick={move}>이동</button>
        <button type="button" className="item-action" onClick={recall}>회수</button></div>
    </div>}
    {tool && <button type="button" className="item-action" onClick={cancel}>{tool.kind === 'move' ? '이동 취소' : '배치 취소'}</button>}
    <button type="button" className="primary-button decorate-done" onClick={close}>꾸미기 완료</button>
  </>
}
