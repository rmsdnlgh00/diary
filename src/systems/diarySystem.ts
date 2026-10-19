import { DEFAULT_APPEARANCE } from '@/data/characterParts'
import { emptyEquipment } from '@/data/items'
import type { DiaryCharacterData, DiaryEntry, EmotionId, WorldDefinition } from '@/types'
import { CHARACTER_RADIUS, characterIdForDate, pickSpawnPoint } from './characterSystem'
import { analyzeDiary, type DiaryAnalyzer } from './emotionAnalyzer'

/** Coins for a new day's entry: a base reward, and a little more for a longer one. */
/** `past`: a flat reward for filling in a day gone by (no length bonus). */
export const DIARY_REWARD = { base: 10, bonus: 5, bonusLength: 100, past: 10 }
export const diaryReward = (text: string, past = false): number => past ? DIARY_REWARD.past
  : DIARY_REWARD.base + (text.trim().length >= DIARY_REWARD.bonusLength ? DIARY_REWARD.bonus : 0)

export interface DiaryWriteResult {
  diaries: DiaryEntry[]
  characters: DiaryCharacterData[]
  entry: DiaryEntry
  character: DiaryCharacterData
  /** 새 캐릭터가 생겼는지, 기존 캐릭터가 바뀐 것인지 */
  created: boolean
}

/**
 * 일기 저장 → 감정 분석 → 그 날짜의 캐릭터 생성 또는 갱신.
 *
 * 같은 날짜를 다시 쓰면 캐릭터를 새로 만들지 않고 감정만 바꾼다.
 * 옷이나 위치 같은 나머지 정보는 그대로 둔다.
 *
 * 감정 분석기는 인자로 받으므로 나중에 AI API 구현으로 바꿔 끼울 수 있다.
 */
export function writeDiary(
  world: WorldDefinition,
  diaries: readonly DiaryEntry[],
  characters: readonly DiaryCharacterData[],
  date: string,
  text: string,
  analyze: DiaryAnalyzer = analyzeDiary,
  /** A mood the player chose themselves; it wins over the analysis. */
  picked?: EmotionId,
): DiaryWriteResult {
  const { emotion, confidence } = picked ? { emotion: picked, confidence: 1 } : analyze(text)
  const now = Date.now()
  const characterId = characterIdForDate(date)

  const existingCharacter = characters.find((c) => c.diaryDate === date)
  const existingEntry = diaries.find((d) => d.date === date)

  const entry: DiaryEntry = {
    id: existingEntry?.id ?? `diary-${date}`,
    date,
    text,
    emotion,
    emotionConfidence: confidence,
    ...(picked ? { emotionPicked: true } : {}),
    characterId,
    createdAt: existingEntry?.createdAt ?? now,
    updatedAt: now,
  }

  let character: DiaryCharacterData
  if (existingCharacter) {
    character = { ...existingCharacter, diaryText: text, emotion, emotionConfidence: confidence }
  } else {
    const taken = characters.filter((c) => c.diaryDate.startsWith(world.id))
      .map(({ x, y }) => ({ x, y, radius: CHARACTER_RADIUS }))
    const spawn = pickSpawnPoint(world, date, taken)
    character = {
      id: characterId,
      diaryDate: date,
      diaryText: text,
      emotion,
      emotionConfidence: confidence,
      x: spawn.x,
      y: spawn.y,
      scale: 1,
      ...DEFAULT_APPEARANCE,
      equippedItems: emptyEquipment(),
      createdAt: now,
    }
  }

  const replace = <T extends { id: string }>(list: readonly T[], item: T): T[] => {
    const index = list.findIndex((i) => i.id === item.id)
    if (index === -1) return [...list, item]
    const next = [...list]
    next[index] = item
    return next
  }

  return {
    diaries: replace(diaries, entry),
    characters: replace(characters, character),
    entry,
    character,
    created: !existingCharacter,
  }
}
