/**
 * 3D 로 렌더한 걷기 낱장 PNG → 방향별 스프라이트 시트 + 좌표 상수.
 *
 *   npm run pack-male
 *
 * 하는 일
 *   1. src/assets/character/male/walk/{front,back,left,right}/*.png 를 읽는다
 *   2. 네 방향 전체의 알파 경계를 합쳐 공통 잘라내기 영역을 구한다
 *   3. 그 영역만 잘라 8x4 시트로 묶고 public/assets/characters/male/walk-{dir}.webp 로 저장
 *   4. src/data/maleWalkFrames.ts 를 다시 쓴다
 *
 * 왜 pack-sprites 와 따로 두는가
 *   pack-sprites 는 AI 낱장 그림의 프레임별 위치·크기 편차를 실측해 보정하고,
 *   표정을 덮어씌울 얼굴 박스를 추정하는 것이 일의 대부분이다. 3D 렌더는
 *   카메라가 고정돼 편차가 1% 이내이고 표정도 이미 렌더에 들어 있어서
 *   그 보정이 통째로 필요 없다. 옛 캐릭터 경로를 건드리지 않기 위해서도
 *   출력 위치와 데이터 파일을 분리한다.
 *
 * 왜 잘라내는가
 *   렌더 캔버스는 1024x1024 인데 캐릭터는 세로 50%, 가로 21% 만 차지한다.
 *   나머지는 투명 여백이다. 그대로 묶으면 시트가 쓸데없이 커진다.
 *   네 방향·전 프레임의 경계를 합쳐서 한 번에 자르므로, 자른 뒤에도
 *   방향끼리 발 위치와 중심이 어긋나지 않는다.
 *
 * 렌더링에 브라우저 캔버스를 쓰므로 시스템에 설치된 Chrome 이 필요하다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = `${ROOT}/public/assets/characters/male`
const TARGET = `${ROOT}/src/data/maleWalkFrames.ts`

/*
 * 동작별 낱장 폴더.
 *
 * 걷기와 서 있기를 같은 잘라내기 영역으로 묶는 것이 중요하다. 영역이 다르면
 * 셀 안에서 발 위치가 달라져 멈추는 순간 캐릭터가 위아래로 튄다.
 */
const CLIPS = [
  { name: 'walk', src: `${ROOT}/src/assets/character/male/walk` },
  { name: 'idle', src: `${ROOT}/src/assets/character/idle` },
]

const DIRECTIONS = ['front', 'back', 'left', 'right']
const COLS = 8
/** 화면에서 키 75px 정도로 그려지므로 이 이상 키워도 낭비다 */
const CELL_H = 256
/** 잘라낸 영역 둘레에 남길 여백 (원본 픽셀) */
const MARGIN = 8
const WEBP_QUALITY = 0.92

const CHROME =
  process.env.CHROME_PATH ??
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((p) => fs.existsSync(p))

if (!CHROME) throw new Error('Chrome 이 필요합니다. CHROME_PATH 로 경로를 지정해 주세요.')

const readFrames = (src, dir) => {
  const folder = `${src}/${dir}`
  if (!fs.existsSync(folder)) return []
  return fs
    .readdirSync(folder)
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => `${folder}/${f}`)
    .filter((f) => fs.statSync(f).size > 0)
}

const toUrl = (file) =>
  `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.goto('about:blank')

/** 한 방향의 알파 경계와 프레임별 발 위치를 잰다. */
const measure = async (urls) =>
  page.evaluate(async (urls) => {
    const box = { minX: Infinity, minY: Infinity, maxX: -1, maxY: -1 }
    const feet = []
    let size = 0
    for (const url of urls) {
      const img = new Image()
      img.src = url
      await img.decode()
      size = img.width
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      const ctx = c.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0)
      const d = ctx.getImageData(0, 0, img.width, img.height).data
      let minX = img.width,
        minY = img.height,
        maxX = -1,
        maxY = -1
      for (let y = 0; y < img.height; y += 1)
        for (let x = 0; x < img.width; x += 1) {
          if (d[(y * img.width + x) * 4 + 3] <= 40) continue
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      if (minX < box.minX) box.minX = minX
      if (minY < box.minY) box.minY = minY
      if (maxX > box.maxX) box.maxX = maxX
      if (maxY > box.maxY) box.maxY = maxY
      // 발이 땅에 닿는 지점. 가장 아래 불투명 줄의 가로 중앙으로 본다.
      let footL = img.width,
        footR = -1
      for (let x = 0; x < img.width; x += 1)
        if (d[(maxY * img.width + x) * 4 + 3] > 40) {
          if (x < footL) footL = x
          if (x > footR) footR = x
        }
      /*
       * 두 발이 벌어진 폭. 발 영역(아래 8%)에서 잰다.
       * 가장 벌어진 프레임의 폭이 한 걸음에 나아가는 거리(보폭)고,
       * 가장 좁은 프레임이 두 발이 모인 자세라 서 있을 때 쓰기 좋다.
       */
      const height = maxY - minY
      let spanL = img.width,
        spanR = -1
      for (let y = maxY - Math.round(height * 0.08); y <= maxY; y += 1)
        for (let x = 0; x < img.width; x += 1)
          if (d[(y * img.width + x) * 4 + 3] > 40) {
            if (x < spanL) spanL = x
            if (x > spanR) spanR = x
          }
      /*
       * 두 발이 같은 높이에 있는지. 좌우 반쪽에서 각각 가장 낮은 지점을 재어
       * 비교한다. 차이가 크면 한 발이 떠 있는 것(스쳐 지나가는 자세)이다.
       *
       * 걷기 사이클에서 두 발이 가장 모이는 순간은 한 발로 서 있는 때라
       * 멈춤 자세로 쓰면 어정쩡해 보인다. 두 발이 다 닿은 프레임 중에서
       * 골라야 서 있는 것으로 읽힌다.
       */
      const mid = (minX + maxX) / 2
      let lowLeft = -1,
        lowRight = -1
      for (let y = maxY; y > maxY - Math.round(height * 0.25); y -= 1)
        for (let x = 0; x < img.width; x += 1) {
          if (d[(y * img.width + x) * 4 + 3] <= 40) continue
          if (x < mid && lowLeft < 0) lowLeft = y
          if (x >= mid && lowRight < 0) lowRight = y
        }
      feet.push({
        x: (footL + footR) / 2,
        /*
         * 몸 전체의 가로 중심.
         *
         * 가로 기준점은 이 값을 쓴다. '가장 낮은 줄의 중앙'(x)으로 잡으면
         * 걸을 때는 디딘 한 발, 서 있을 때는 두 발이 기준이 되어 동작을
         * 바꾸는 순간 캐릭터가 옆으로 튄다. 몸 중심은 둘 다 같은 곳이다.
         */
        cx: (minX + maxX) / 2,
        y: maxY,
        top: minY,
        span: spanR - spanL,
        height,
        // 0 에 가까울수록 두 발이 같은 높이에 있다.
        lift: Math.abs(lowLeft - lowRight) / height,
      })
    }
    return { box, feet, size }
  }, urls)

/** clips[동작][방향] = { urls, feet, count } */
const clips = {}
let union = { minX: Infinity, minY: Infinity, maxX: -1, maxY: -1 }
let canvasSize = 0

for (const clip of CLIPS) {
  clips[clip.name] = {}
  for (const dir of DIRECTIONS) {
    const files = readFrames(clip.src, dir)
    if (files.length === 0) {
      console.log(`${clip.name}/${dir}  낱장이 없어 건너뜀`)
      continue
    }
    const urls = files.map(toUrl)
    const { box, feet, size } = await measure(urls)
    clips[clip.name][dir] = { urls, feet, count: files.length }
    canvasSize = size
    // 동작·방향을 통틀어 하나의 영역으로 자른다.
    union = {
      minX: Math.min(union.minX, box.minX),
      minY: Math.min(union.minY, box.minY),
      maxX: Math.max(union.maxX, box.maxX),
      maxY: Math.max(union.maxY, box.maxY),
    }
  }
}

const perDirection = clips.walk
if (Object.keys(perDirection).length === 0) {
  await browser.close()
  throw new Error('걷기 낱장 PNG 가 없습니다.')
}

// 네 방향 공통 잘라내기 영역. 여백을 조금 남겨 가장자리가 잘리지 않게 한다.
const crop = {
  x: Math.max(0, union.minX - MARGIN),
  y: Math.max(0, union.minY - MARGIN),
}
crop.w = Math.min(canvasSize, union.maxX + MARGIN) - crop.x + 1
crop.h = Math.min(canvasSize, union.maxY + MARGIN) - crop.y + 1

const cellW = Math.round(crop.w * (CELL_H / crop.h))
const scale = CELL_H / crop.h

console.log(
  `캔버스 ${canvasSize}x${canvasSize} → 잘라내기 ${crop.w}x${crop.h} ` +
    `(${((crop.w * crop.h) / (canvasSize * canvasSize) * 100).toFixed(1)}% 만 사용)`,
)

fs.mkdirSync(OUT, { recursive: true })

/** 한 동작·한 방향을 시트로 묶어 저장하고 크기를 돌려준다. */
async function writeSheet(clipName, dir, info) {
  const rows = Math.ceil(info.count / COLS)
  const webp = await page.evaluate(
    async (urls, crop, cellW, CELL_H, COLS, rows, quality) => {
      const sheet = document.createElement('canvas')
      sheet.width = cellW * COLS
      sheet.height = CELL_H * rows
      const g = sheet.getContext('2d')
      g.imageSmoothingQuality = 'high'
      for (let k = 0; k < urls.length; k += 1) {
        const img = new Image()
        img.src = urls[k]
        await img.decode()
        g.drawImage(
          img,
          crop.x, crop.y, crop.w, crop.h,
          (k % COLS) * cellW, Math.floor(k / COLS) * CELL_H, cellW, CELL_H,
        )
      }
      return sheet.toDataURL('image/webp', quality).split(',')[1]
    },
    info.urls, crop, cellW, CELL_H, COLS, rows, WEBP_QUALITY,
  )
  const file = `${OUT}/${clipName}-${dir}.webp`
  fs.writeFileSync(file, Buffer.from(webp, 'base64'))
  console.log(
    `${clipName}-${dir}.webp  ${cellW * COLS}x${CELL_H * rows}  셀 ${cellW}x${CELL_H}  ` +
      `${info.count}장  ${(fs.statSync(file).size / 1024).toFixed(0)}KB`,
  )
  return rows
}

/*
 * 잘라낸 좌표계 기준의 기준점.
 *
 * 가로는 동작·방향을 통틀어 하나의 값을 쓴다. 조금씩 다른 값을 쓰면 방향이
 * 바뀌거나 걷다 멈출 때마다 캐릭터가 옆으로 흔들린다. 실측 편차가 몸 폭의
 * 1.6% 뿐이라 하나로 묶어도 화면에서 1px 이 안 된다.
 *
 * 세로는 동작·방향마다 제 발바닥을 쓴다. 각자 자기 발이 기준선에 놓이므로
 * 어느 동작이든 발이 땅에 붙는다.
 */
const allFeet = Object.values(clips).flatMap((byDir) =>
  Object.values(byDir).flatMap((info) => info.feet),
)
const globalCx = allFeet.reduce((a, f) => a + f.cx, 0) / allFeet.length

const anchors = (info) => {
  const footY = Math.max(...info.feet.map((f) => f.y))
  const top = Math.min(...info.feet.map((f) => f.top))
  return {
    footX: +((globalCx - crop.x) * scale).toFixed(1),
    footY: +((footY - crop.y) * scale).toFixed(1),
    bodyH: +((footY - top) * scale).toFixed(1),
  }
}

const idlePacked = {}
for (const [dir, info] of Object.entries(clips.idle ?? {})) {
  const rows = await writeSheet('idle', dir, info)
  idlePacked[dir] = { rows, count: info.count, ...anchors(info) }
}

const packed = {}

for (const [dir, info] of Object.entries(perDirection)) {
  const rows = await writeSheet('walk', dir, info)

  // 잘라낸 좌표계 기준으로 환산한다.
  const spans = info.feet.map((f) => f.span)
  const bodyPx = info.feet.reduce((a, f) => a + f.height, 0) / info.feet.length
  packed[dir] = {
    rows,
    cellW,
    ...anchors(info),
    // 보폭을 키로 나눈 값. 화면 크기와 무관해서 그대로 속도 계산에 쓸 수 있다.
    strideRatio: +(Math.max(...spans) / bodyPx).toFixed(4),
    /*
     * 서 있을 때 쓸 프레임.
     *
     * 두 발이 다 땅에 닿은 프레임(lift 가 작은 쪽) 중에서 보폭이 가장 좁은
     * 것을 고른다. 단순히 보폭만 보면 한 발로 서 있는 자세가 뽑혀서
     * 멈췄을 때 어정쩡해 보인다.
     */
    idleFrame: (() => {
      const lifts = info.feet.map((f) => f.lift)
      const planted = [...lifts].sort((a, b) => a - b)[Math.floor(lifts.length * 0.3)]
      const candidates = info.feet
        .map((f, i) => ({ i, span: f.span, lift: f.lift }))
        .filter((c) => c.lift <= planted)
      const best = candidates.reduce((a, b) => (b.span < a.span ? b : a))
      return best.i
    })(),
    /*
     * 두 발이 모이는 지점은 한 사이클에 두 번 있다(걸음마다 한 번).
     * 멈출 때 둘 중 가까운 쪽까지만 걸어가면 되므로 최대 반 사이클이면 끝난다.
     * 하나만 쓰면 최악의 경우 한 사이클을 다 돌아야 해서 어색하게 길어진다.
     */
    settleFrames: (() => {
      const half = Math.floor(spans.length / 2)
      const firstHalf = spans.slice(0, half)
      const secondHalf = spans.slice(half)
      return [
        firstHalf.indexOf(Math.min(...firstHalf)),
        half + secondHalf.indexOf(Math.min(...secondHalf)),
      ]
    })(),
  }
}

const first = Object.values(packed)[0]
const lines = [
  '// 이 파일은 `npm run pack-male` 이 만든다. 직접 고치면 다음 실행 때 덮어쓰인다.',
  '// 원본은 src/assets/character/male/walk/{방향}/*.png 이다.',
  '',
  "import type { WalkDirection } from '@/types'",
  '',
  'export interface MaleWalkSheet {',
  '  src: string',
  '  cols: number',
  '  rows: number',
  '  cellW: number',
  '  cellH: number',
  '  /** 셀 안에서 발이 땅에 닿는 지점 (px) */',
  '  footX: number',
  '  footY: number',
  '  /** 셀 안에서 캐릭터 키 (px). 화면 표시 크기 환산에 쓴다. */',
  '  bodyH: number',
  '  /** 두 발이 가장 모인 프레임. 서 있을 때 이 자세로 멈춘다. */',
  '  idleFrame: number',
  '  /** 두 발이 모이는 두 지점. 멈출 때 가까운 쪽까지 걸어가 자세를 정리한다. */',
  '  settleFrames: readonly [number, number]',
  '}',
  '',
  '/** 가만히 서서 숨 쉬는 동작. 걷기와 같은 영역에서 잘라 발 위치가 어긋나지 않는다. */',
  'export interface MaleIdleSheet {',
  '  src: string',
  '  cols: number',
  '  rows: number',
  '  cellW: number',
  '  cellH: number',
  '  frames: number',
  '  footX: number',
  '  footY: number',
  '  bodyH: number',
  '}',
  '',
  `export const MALE_WALK_FRAME_COUNT = ${Object.values(perDirection)[0].count}`,
  '',
  '/**',
  ' * 보폭을 키로 나눈 값. 측면에서 잰 것이 실제 보폭이다.',
  ' * 정면·후면은 발이 화면 안쪽으로 움직여 보폭이 작게 측정된다.',
  ' *',
  ' * 이동 속도를 이 값에 맞춰야 발이 미끄러지지 않는다.',
  ' * walkSystem 의 WALK_CONFIG.speed 가 이 값에서 계산된다.',
  ' */',
  `export const MALE_WALK_STRIDE_RATIO = ${(
    (packed.left?.strideRatio ?? 0) && (packed.right?.strideRatio ?? 0)
      ? (packed.left.strideRatio + packed.right.strideRatio) / 2
      : Math.max(...Object.values(packed).map((p) => p.strideRatio))
  ).toFixed(4)}`,
  '',
  '/** 한 걸음에 쓰이는 프레임 수. 한 사이클은 두 걸음이다. */',
  `export const MALE_WALK_FRAMES_PER_STEP = ${Object.values(perDirection)[0].count / 2}`,
  '',
  'export const MALE_WALK_SHEETS: Record<WalkDirection, MaleWalkSheet> = {',
]
for (const [dir, p] of Object.entries(packed)) {
  lines.push(
    `  ${dir}: {`,
    `    src: '/assets/characters/male/walk-${dir}.webp',`,
    `    cols: ${COLS},`,
    `    rows: ${p.rows},`,
    `    cellW: ${p.cellW},`,
    `    cellH: ${CELL_H},`,
    `    footX: ${p.footX},`,
    `    footY: ${p.footY},`,
    `    bodyH: ${p.bodyH},`,
    `    idleFrame: ${p.idleFrame},`,
    `    settleFrames: [${p.settleFrames.join(', ')}] as const,`,
    '  },',
  )
}
lines.push('}', '')

if (Object.keys(idlePacked).length > 0) {
  lines.push(
    '',
    'export const MALE_IDLE_SHEETS: Record<WalkDirection, MaleIdleSheet> = {',
  )
  for (const [dir, p] of Object.entries(idlePacked)) {
    lines.push(
      `  ${dir}: {`,
      `    src: '/assets/characters/male/idle-${dir}.webp',`,
      `    cols: ${COLS},`,
      `    rows: ${p.rows},`,
      `    cellW: ${cellW},`,
      `    cellH: ${CELL_H},`,
      `    frames: ${p.count},`,
      `    footX: ${p.footX},`,
      `    footY: ${p.footY},`,
      `    bodyH: ${p.bodyH},`,
      '  },',
    )
  }
  lines.push('}', '')
}

fs.writeFileSync(TARGET, lines.join('\n'))
console.log(`\n${path.relative(ROOT, TARGET)} 갱신 완료  (셀 ${first.cellW}x${CELL_H})`)
for (const [dir, p] of Object.entries(packed))
  console.log(`  ${dir.padEnd(6)} 보폭/키 ${p.strideRatio}  서 있는 프레임 ${p.idleFrame}  발 모이는 지점 ${p.settleFrames.join(", ")}`)

await browser.close()
