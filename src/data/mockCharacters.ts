import { getDecorationAsset, getNpcAsset } from '@/data/assets'
import { analyzeDiary } from '@/systems/emotionAnalyzer'
import {
  CHARACTER_RADIUS,
  characterIdForDate,
  type Occupant,
  pickSpawnPoint,
} from '@/systems/characterSystem'
import type { DiaryCharacterData, WorldDefinition } from '@/types'

/** PHASE 1 확인용 더미 데이터. 일기 시스템이 붙으면 제거한다. */
const SAMPLE_DIARIES: Array<{
  date: string
  text: string
  hair: string
  outfit: string
  accessories: string[]
}> = [
  {
    date: '2026-09-17',
    text: '오늘 친구와 카페에 가서 즐거운 시간을 보냈다. 날씨가 좋아서 공원도 걸었다.',
    hair: 'hair_bob',
    outfit: 'outfit_tee_blue',
    accessories: ['acc_backpack'],
  },
  {
    date: '2026-09-18',
    text: '일이 너무 많아서 하루 종일 피곤하고 짜증이 났다.',
    hair: 'hair_short',
    outfit: 'outfit_hoodie_mint',
    accessories: [],
  },
  {
    date: '2026-09-19',
    text: '그냥 평범한 하루였다. 특별한 일은 없었다.',
    hair: 'hair_curly',
    outfit: 'outfit_sweater_yellow',
    accessories: ['acc_glasses'],
  },
  {
    date: '2026-09-20',
    text: '비가 와서 조금 우울했고 괜히 외로운 기분이 들었다.',
    hair: 'hair_bun',
    outfit: 'outfit_dress_pink',
    accessories: [],
  },
  {
    date: '2026-09-21',
    text: '오늘 정말 행복했다. 오랜만에 가족들과 저녁을 먹어서 따뜻한 하루였다.',
    hair: 'hair_bob',
    outfit: 'outfit_sweater_yellow',
    accessories: ['acc_cap'],
  },
]

export function createMockCharacters(world: WorldDefinition): DiaryCharacterData[] {
  // 장식물과 NPC가 이미 차지한 자리는 피한다.
  const taken: Occupant[] = [
    ...world.decorations.map(({ type, x, y }) => ({
      x,
      y,
      radius: getDecorationAsset(type).worldWidth / 2,
    })),
    ...world.npcs.map(({ type, x, y }) => ({ x, y, radius: getNpcAsset(type).worldWidth / 2 })),
  ]

  return SAMPLE_DIARIES.map((sample) => {
    const { emotion, confidence } = analyzeDiary(sample.text)
    const spawn = pickSpawnPoint(world, sample.date, taken)
    taken.push({ ...spawn, radius: CHARACTER_RADIUS })

    return {
      id: characterIdForDate(sample.date),
      diaryDate: sample.date,
      diaryText: sample.text,
      emotion,
      emotionConfidence: confidence,
      x: spawn.x,
      y: spawn.y,
      scale: 1,
      body: 'body_default',
      hair: sample.hair,
      outfit: sample.outfit,
      accessories: sample.accessories,
      createdAt: Date.parse(sample.date),
    }
  })
}
