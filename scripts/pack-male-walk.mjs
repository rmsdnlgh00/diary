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
const SRC = `${ROOT}/src/assets/character/male/walk`
const OUT = `${ROOT}/public/assets/characters/male`
const TARGET = `${ROOT}/src/data/maleWalkFrames.ts`

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

const readFrames = (dir) => {
  const folder = `${SRC}/${dir}`
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
      feet.push({ x: (footL + footR) / 2, y: maxY, top: minY })
    }
    return { box, feet, size }
  }, urls)

const perDirection = {}
let union = { minX: Infinity, minY: Infinity, maxX: -1, maxY: -1 }
let canvasSize = 0

for (const dir of DIRECTIONS) {
  const files = readFrames(dir)
  if (files.length === 0) {
    console.log(`walk/${dir}  낱장이 없어 건너뜀`)
    continue
  }
  const urls = files.map(toUrl)
  const { box, feet, size } = await measure(urls)
  perDirection[dir] = { urls, feet, count: files.length }
  canvasSize = size
  union = {
    minX: Math.min(union.minX, box.minX),
    minY: Math.min(union.minY, box.minY),
    maxX: Math.max(union.maxX, box.maxX),
    maxY: Math.max(union.maxY, box.maxY),
  }
}

if (Object.keys(perDirection).length === 0) {
  await browser.close()
  throw new Error(`${SRC} 아래에 낱장 PNG 가 없습니다.`)
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
const packed = {}

for (const [dir, info] of Object.entries(perDirection)) {
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

  fs.writeFileSync(`${OUT}/walk-${dir}.webp`, Buffer.from(webp, 'base64'))

  // 잘라낸 좌표계 기준으로 환산한다.
  const footX = info.feet.reduce((a, f) => a + f.x, 0) / info.feet.length
  const footY = Math.max(...info.feet.map((f) => f.y))
  const top = Math.min(...info.feet.map((f) => f.top))
  packed[dir] = {
    rows,
    cellW,
    footX: +(((footX - crop.x) * scale)).toFixed(1),
    footY: +(((footY - crop.y) * scale)).toFixed(1),
    bodyH: +(((footY - top) * scale)).toFixed(1),
  }

  const before = info.urls.reduce((a, _, i) => a + fs.statSync(readFrames(dir)[i]).size, 0)
  const after = fs.statSync(`${OUT}/walk-${dir}.webp`).size
  console.log(
    `walk-${dir}.webp  ${cellW * COLS}x${CELL_H * rows}  셀 ${cellW}x${CELL_H}  ` +
      `${info.count}장  ${(before / 1048576).toFixed(1)}MB → ${(after / 1024).toFixed(0)}KB`,
  )
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
  '}',
  '',
  `export const MALE_WALK_FRAME_COUNT = ${Object.values(perDirection)[0].count}`,
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
    '  },',
  )
}
lines.push('}', '')
fs.writeFileSync(TARGET, lines.join('\n'))
console.log(`\n${path.relative(ROOT, TARGET)} 갱신 완료  (셀 ${first.cellW}x${CELL_H})`)

await browser.close()
