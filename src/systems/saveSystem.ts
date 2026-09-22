import type { DiaryCharacterData, DiaryEntry } from '@/types'

const STORAGE_KEY = 'haru-village:v1'

export interface SaveData {
  version: 1
  diaries: DiaryEntry[]
  characters: DiaryCharacterData[]
}

const EMPTY: SaveData = { version: 1, diaries: [], characters: [] }

/**
 * 저장은 이 모듈에서만 한다. 나중에 서버 DB로 바꿀 때 여기만 갈아끼우면 된다.
 * 사파리 프라이빗 모드처럼 localStorage 가 막힌 환경에서도 게임은 돌아가야 하므로
 * 실패해도 예외를 밖으로 던지지 않는다.
 */
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as SaveData
    if (parsed.version !== 1) return EMPTY
    return {
      version: 1,
      diaries: parsed.diaries ?? [],
      characters: parsed.characters ?? [],
    }
  } catch {
    return EMPTY
  }
}

export function persistSave(data: Omit<SaveData, 'version'>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ...data }))
  } catch {
    // 저장 못 해도 진행은 계속한다
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 무시
  }
}
