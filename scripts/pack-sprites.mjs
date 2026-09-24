/**
 * 캐릭터 걷기 낱장 PNG → 방향별 스프라이트 시트 + 프레임 보정값.
 *
 *   npm run pack-sprites
 *
 * 하는 일
 *   1. src/assets/character/walk/{front,back,left,right}/NN.png 를 읽는다
 *   2. 방향마다 4x2 시트로 묶어 public/assets/character/walk-{dir}.webp 로 저장
 *   3. 칸마다 알파 바운딩 박스를 실측해서 발 기준점·크기 보정값을 구한다
 *   4. 발 위상을 보고 실제로 재생할 프레임(sequence)을 고른다
 *   5. src/data/characterFrames.ts 를 다시 쓴다
 *
 * 왜 필요한가
 *   낱장 원본은 한 장에 800KB 안팎이라 32장이면 25MB다. 그대로 브라우저에
 *   내려보낼 수 없어서 시트로 묶고 WebP 로 줄인다. 또 AI 로 만든 그림은
 *   프레임마다 캐릭터 위치와 크기가 어긋나 있어서, 그냥 재생하면 미끄러지고
 *   들썩인다. 그 편차를 여기서 재서 숫자로 남긴다.
 *
 * 렌더링에 브라우저 캔버스를 쓰므로 시스템에 설치된 Chrome 이 필요하다.
 * (puppeteer-core 는 브라우저를 따로 내려받지 않는다)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer-core'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = `${ROOT}/src/assets/character/walk`
const OUT = `${ROOT}/public/assets/character`
const TARGET = `${ROOT}/src/data/characterFrames.ts`

const DIRECTIONS = ['front', 'back', 'left', 'right']
const COLS = 4
/** 화면에서 키 75px 정도로 그려지므로 이 이상 키워도 낭비다 */
const CELL_H = 512
const WEBP_QUALITY = 0.92

/** 표정 에셋을 붙일 얼굴 기준점 추정값. 방향마다 얼굴이 향한 쪽이 다르다. */
const FACE_TUNE = {
  front: { yRatio: 0.34, dx: 0, wRatio: 0.6 },
  back: { yRatio: 0.34, dx: 0, wRatio: 0.6 },
  left: { yRatio: 0.36, dx: -0.16, wRatio: 0.4 },
  right: { yRatio: 0.36, dx: 0.16, wRatio: 0.4 },
}

const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

function readFrames(dir) {
  const folder = `${SRC}/${dir}`
  if (!fs.existsSync(folder)) return []
  return fs
    .readdirSync(folder)
    .filter((f) => f.endsWith('.png'))
    .sort()
    .map((f) => `${folder}/${f}`)
    .filter((f) => fs.statSync(f).size > 0)
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.goto('about:blank')

const packed = {}

for (const dir of DIRECTIONS) {
  const files = readFrames(dir)
  if (files.length === 0) {
    console.log(`walk/${dir}  낱장이 없어 건너뜀`)
    continue
  }

  const urls = files.map((f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`)
  const rows = Math.ceil(files.length / COLS)

  const result = await page.evaluate(
    async (urls, COLS, rows, CELL_H, quality) => {
      const imgs = []
      for (const u of urls) {
        const i = new Image()
        i.src = u
        await i.decode()
        imgs.push(i)
      }

      // 원본 비율을 유지한 채 셀 높이만 맞춘다
      const cellW = Math.round(imgs[0].width * (CELL_H / imgs[0].height))

      const sheet = document.createElement('canvas')
      sheet.width = cellW * COLS
      sheet.height = CELL_H * rows
      const sg = sheet.getContext('2d')
      sg.imageSmoothingQuality = 'high'

      const frames = []
      for (let k = 0; k < imgs.length; k += 1) {
        sg.drawImage(imgs[k], (k % COLS) * cellW, Math.floor(k / COLS) * CELL_H, cellW, CELL_H)

        const t = document.createElement('canvas')
        t.width = cellW
        t.height = CELL_H
        const tg = t.getContext('2d', { willReadFrequently: true })
        tg.drawImage(imgs[k], 0, 0, cellW, CELL_H)
        const d = tg.getImageData(0, 0, cellW, CELL_H).data
        const at = (x, y) => d[(y * cellW + x) * 4 + 3] > 40

        let minX = cellW, minY = CELL_H, maxX = -1, maxY = -1
        for (let y = 0; y < CELL_H; y += 1)
          for (let x = 0; x < cellW; x += 1)
            if (at(x, y)) {
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }

        const h = maxY - minY + 1
        const cx = Math.round((minX + maxX) / 2)

        // 몸 중심선은 머리(위 45%)로 잡는다. 팔이 흔들려도 흔들리지 않는다.
        const headBottom = minY + Math.round(h * 0.45)
        let hMinX = cellW, hMaxX = -1
        for (let y = minY; y <= headBottom; y += 1)
          for (let x = 0; x < cellW; x += 1)
            if (at(x, y)) {
              if (x < hMinX) hMinX = x
              if (x > hMaxX) hMaxX = x
            }

        // 발 구간에서 좌우 발의 최저점 차이 = 걸음의 위상
        const legTop = maxY - Math.round(h * 0.22)
        let leftLow = -1, rightLow = -1
        for (let y = legTop; y <= maxY; y += 1)
          for (let x = minX; x <= maxX; x += 1)
            if (at(x, y)) {
              if (x < cx) { if (y > leftLow) leftLow = y }
              else if (y > rightLow) rightLow = y
            }

        // 머리 박스: 위에서 내려오다 폭이 최대의 55% 아래로 떨어지는 곳이 목이다.
        // 표정 그림을 이 자리에 겹쳐서 원래 얼굴을 덮는다.
        const rowSpan = []
        for (let y = 0; y < CELL_H; y += 1) {
          let lo = -1, hi = -1
          for (let x = 0; x < cellW; x += 1) if (at(x, y)) { if (lo < 0) lo = x; hi = x }
          rowSpan.push(lo < 0 ? null : { lo, hi, w: hi - lo + 1 })
        }
        let widest = 0, widestY = minY
        for (let y = minY; y < minY + Math.round(h * 0.5); y += 1)
          if (rowSpan[y] && rowSpan[y].w > widest) { widest = rowSpan[y].w; widestY = y }
        let neck = maxY
        for (let y = widestY; y < CELL_H; y += 1)
          if (!rowSpan[y] || rowSpan[y].w < widest * 0.55) { neck = y; break }
        let headLo = cellW, headHi = -1
        for (let y = minY; y <= neck; y += 1)
          if (rowSpan[y]) {
            if (rowSpan[y].lo < headLo) headLo = rowSpan[y].lo
            if (rowSpan[y].hi > headHi) headHi = rowSpan[y].hi
          }

        frames.push({
          footX: Math.round((hMinX + hMaxX) / 2),
          footY: maxY,
          top: minY,
          h,
          headW: hMaxX - hMinX + 1,
          lead: (rightLow - leftLow) / h,
          headBox: { x: headLo, y: minY, w: headHi - headLo + 1 },
        })
      }

      return { cellW, frames, webp: sheet.toDataURL('image/webp', quality).split(',')[1] }
    },
    urls,
    COLS,
    rows,
    CELL_H,
    WEBP_QUALITY,
  )

  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(`${OUT}/walk-${dir}.webp`, Buffer.from(result.webp, 'base64'))

  const { frames, cellW } = result
  const refHeight = Math.round(frames.reduce((a, f) => a + f.h, 0) / frames.length)

  /*
   * 재생할 프레임 고르기.
   *
   * lead 는 좌우 발의 높이 차다. 양수면 오른발이, 음수면 왼발이 아래에 있다.
   * 진짜 걷기 사이클이면 두 발이 번갈아 딛으므로 이 값이 양쪽을 오간다.
   * 한쪽에만 머물면 같은 자세를 여러 장 그린 것이지 사이클이 아니다.
   *
   * 사이클이면 장수에 관계없이 전부 재생한다. 아니면 자세 차이가 크고
   * 크기 편차가 작은 두 장만 골라 떨림을 줄인다.
   */
  const leads = frames.map((f) => f.lead)
  const swing = Math.max(...leads) - Math.min(...leads)
  /** 양쪽으로 이만큼씩 벌어져야 두 발이 실제로 교대하는 것으로 본다 */
  const CYCLE_LEAD = 0.05
  const isCycle = Math.max(...leads) > CYCLE_LEAD && Math.min(...leads) < -CYCLE_LEAD
  let sequence
  if (isCycle || (swing >= 0.04 && frames.length <= 4)) {
    sequence = frames.map((_, i) => i)
  } else {
    let best = null
    for (let a = 0; a < frames.length; a += 1)
      for (let b = a + 1; b < frames.length; b += 1) {
        const pose = Math.abs(leads[b] - leads[a])
        const pulse = Math.abs(refHeight / frames[b].h - refHeight / frames[a].h)
        const score = pose - pulse * 1.5
        if (!best || score > best.score) best = { a, b, score }
      }
    sequence = leads[best.a] <= leads[best.b] ? [best.a, best.b] : [best.b, best.a]
  }

  packed[dir] = { cellW, cellH: CELL_H, rows, refHeight, frames, sequence }

  const size = (fs.statSync(`${OUT}/walk-${dir}.webp`).size / 1024).toFixed(0)
  console.log(
    `walk-${dir}.webp  ${cellW * COLS}x${CELL_H * rows}  셀 ${cellW}x${CELL_H}  ${size}KB  ` +
      `${frames.length}장  위상폭 ${(swing * 100).toFixed(1)}%  재생 [${sequence.join(', ')}]`,
  )
  console.log(
    `   발 위상 ${leads.map((l) => (l * 100).toFixed(1).padStart(5)).join(' ')}  ` +
      (isCycle
        ? '→ 걷기 사이클. 전부 재생'
        : sequence.length === frames.length
          ? '→ 사이클 아님(한쪽 발만 계속 아래). 장수가 적어 전부 재생'
          : '→ 사이클 아님(한쪽 발만 계속 아래). 차이 큰 두 장만 재생'),
  )
}

await browser.close()

// ---- characterFrames.ts 다시 쓰기 ----

const lines = []
lines.push(`import type { DirectionSheet, EmotionId, WalkDirection } from '@/types'`)
lines.push(``)
lines.push(`/**`)
lines.push(` * 걷기 시트의 프레임별 보정값.`)
lines.push(` *`)
lines.push(` * 이 파일은 \`npm run pack-sprites\` 가 만든다. 직접 고치면 다음 실행 때 덮어쓰인다.`)
lines.push(` * 원본은 src/assets/character/walk/{방향}/NN.png 이다.`)
lines.push(` *`)
lines.push(` *  footX/footY : 셀 안에서 캐릭터가 땅을 딛는 지점 (px)`)
lines.push(` *  scale       : 프레임 간 크기 편차 보정 (기준 높이 / 이 프레임 높이)`)
lines.push(` *  offsetX/Y   : 눈으로 보고 미세 조정할 때 쓰는 값 (기본 0)`)
lines.push(` *  faceX/faceY/faceW : 표정 에셋을 붙일 자리`)
lines.push(` *  sequence    : 실제로 재생할 프레임 번호와 순서`)
lines.push(` */`)
lines.push(``)
lines.push(`export const WALK_SHEETS: Record<WalkDirection, DirectionSheet> = {`)

for (const dir of DIRECTIONS) {
  const d = packed[dir]
  if (!d) continue
  const t = FACE_TUNE[dir]
  lines.push(`  ${dir}: {`)
  lines.push(`    src: '/assets/character/walk-${dir}.webp',`)
  lines.push(`    cols: ${COLS},`)
  lines.push(`    rows: ${d.rows},`)
  lines.push(`    cellW: ${d.cellW},`)
  lines.push(`    cellH: ${d.cellH},`)
  lines.push(`    refHeight: ${d.refHeight},`)
  lines.push(`    // 눈·입이 그림에 이미 그려져 있어 눈 레이어는 얹지 않는다`)
  lines.push(`    eyes: 'none',`)
  lines.push(`    sequence: [${d.sequence.join(', ')}],`)
  lines.push(`    frames: [`)
  d.frames.forEach((f, i) => {
    lines.push(
      `      /* ${i} */ { footX: ${f.footX}, footY: ${f.footY}, scale: ${(d.refHeight / f.h).toFixed(4)}, ` +
        `offsetX: 0, offsetY: 0, faceX: ${Math.round(f.footX + t.dx * f.headW)}, ` +
        `faceY: ${Math.round(f.top + f.h * t.yRatio)}, faceW: ${Math.round(f.headW * t.wRatio)}, ` +
        `headX: ${f.headBox.x}, headY: ${f.headBox.y}, headW: ${f.headBox.w} },`,
    )
  })
  lines.push(`    ],`)
  lines.push(`  },`)
}

lines.push(`}`)
lines.push(``)
lines.push(`/** 표정 오버레이용 시트. 지금은 data/expressions.ts 를 쓰므로 비어 있다. */`)
lines.push(`export const EYES_SHEET = {`)
lines.push(`  src: '/assets/character/eyes.webp',`)
lines.push(`  cols: 3,`)
lines.push(`  rows: 2,`)
lines.push(`  cellW: 360,`)
lines.push(`  cellH: 205,`)
lines.push(`}`)
lines.push(``)
lines.push(
  `export const EMOTION_EYE_ORDER: EmotionId[] = ['NORMAL', 'HAPPY', 'JOYFUL', 'SAD', 'ANGRY', 'ANNOYED']`,
)
lines.push(``)
lines.push(`export const SIDE_EYES_SHEET: typeof EYES_SHEET | null = null`)
lines.push(``)
lines.push(`/** 멈춰 있을 때 보여줄 프레임. 각 방향 sequence 의 첫 장을 쓴다. */`)
lines.push(`export const IDLE_FRAME: Record<WalkDirection, number> = {`)
for (const dir of DIRECTIONS) {
  if (packed[dir]) lines.push(`  ${dir}: ${packed[dir].sequence[0]},`)
}
lines.push(`}`)
lines.push(``)

fs.writeFileSync(TARGET, lines.join('\n'))
console.log(`\n${path.relative(ROOT, TARGET)} 갱신 완료`)
