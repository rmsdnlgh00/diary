import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import puppeteer from 'puppeteer-core'

const artifacts = mkdtempSync(join(tmpdir(), 'haru-side-check-'))
console.log(`검증 화면 저장 위치: ${artifacts}`)
const server = await createServer({ server: { host: '127.0.0.1' } })
let browser
try {
  await server.listen()
  browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 1200 })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(server.resolvedUrls.local[0], { waitUntil: 'networkidle0' })
  await page.evaluate(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js')
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js')
    const { WalkingCharacter } = await import('/src/components/game/WalkingCharacter.tsx')
    const { WALK_SHEETS } = await import('/src/data/characterFrames.ts')
    const emotions = ['NORMAL', 'HAPPY', 'JOYFUL', 'SAD', 'ANGRY', 'ANNOYED']
    const host = document.createElement('div')
    host.className = 'stage'
    Object.assign(host.style, { position: 'fixed', inset: '0', width: '1600px', height: '1200px',
      aspectRatio: 'auto', borderRadius: '0', background: '#d8e6bf', zIndex: '100' })
    document.body.append(host)
    const root = ReactDOM.createRoot(host)
    window.renderSideTest = (frame) => root.render(React.createElement('div', {
      style: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', height: '100%' },
    }, ...['right', 'left', 'front', 'back'].flatMap((direction) => emotions.map((emotion) =>
      React.createElement('div', { key: direction + emotion, 'data-case': `${direction}-${emotion}`,
        style: { position: 'relative', height: '300px', border: '1px solid #aab99a' } },
      React.createElement('span', { style: { position: 'absolute', left: '12px', top: '8px', fontSize: '17px' } }, `${direction} · ${emotion} · ${frame}`),
      React.createElement(WalkingCharacter, { x: 0.5, y: 0.88, emotion, direction,
        frameIndex: frame % WALK_SHEETS[direction].frames.length,
        depthConfig: { horizonY: 0.25, frontY: 1, minScale: 1, maxScale: 1 }, zoom: 10 }),
    )))))
    window.renderSideTest(0)
  })
  await page.waitForFunction(() => document.querySelectorAll('.walker__side-face').length >= 10)
  // 모든 표정 이미지가 디코딩된 뒤 화면을 확인한다.
  await page.evaluate(async () => {
    const sources = [...new Set([...document.querySelectorAll('.walker__side-face image')].map((el) => el.getAttribute('href')))]
    await Promise.all(sources.map(async (src) => { const img = new Image(); img.src = src; await img.decode() }))
  })
  for (let frame = 0; frame < 8; frame++) {
    await page.evaluate((index) => window.renderSideTest(index), frame)
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const cases = await page.$$eval('[data-case]', (elements) => elements.map((el) => {
      const head = el.querySelector('.walker__side-face')
      const body = el.querySelector('.walker__body')
      return { name: el.dataset.case, head: !!head, src: head?.querySelector('image')?.getAttribute('href'),
        flip: head?.style.transform, clipped: !!body.style.clipPath, frame: body.style.backgroundPosition,
        normalFace: !!el.querySelector('.walker__face') }
    }))
    for (const entry of cases) {
      const [direction, emotion] = entry.name.split('-')
      const expected = ['left', 'right'].includes(direction) && emotion !== 'NORMAL'
      assert.equal(entry.head, expected, entry.name)
      assert.equal(entry.clipped, expected, entry.name)
      assert.equal(entry.normalFace, direction === 'front')
      if (expected) {
        const expression = ['HAPPY', 'JOYFUL'].includes(emotion) ? 'happy' : emotion === 'SAD' ? 'sad' : 'angry'
        assert.ok(entry.src.includes(`${expression}_side.webp`))
        assert.equal(entry.flip, direction === 'left' ? 'scaleX(-1)' : '')
      }
    }
    if ([0, 5, 6].includes(frame)) await page.screenshot({ path: join(artifacts, `frame-${frame}.png`) })
  }
  // 로드 실패 시 원래 몸을 자르지 않고 기본 걷기 이미지로 폴백한다.
  await page.setRequestInterception(true)
  page.on('request', (request) => request.resourceType() === 'image' && request.url().includes('_side.webp')
    ? request.abort() : request.continue())
  await page.setCacheEnabled(false)
  await page.reload({ waitUntil: 'networkidle0' })
  await page.evaluate(async () => {
    const { useDebugStore } = await import('/src/store/debugStore.ts')
    useDebugStore.getState().set({ direction: 'right' })
  })
  await page.waitForSelector('.walker__body')
  assert.equal(await page.$$eval('.walker__side-face', (els) => els.length), 0)
  assert.equal(await page.$$eval('.walker__body', (els) => els.some((el) => el.style.clipPath)), false)
  assert.deepEqual(errors, [])
  console.log(`PASS 6개 감정 × 4방향 × 8프레임, 좌우 반전, 원래 표정 유지, 로드 실패 폴백\n스크린샷: ${artifacts}`)
} finally {
  await browser?.close()
  await server.close()
}
