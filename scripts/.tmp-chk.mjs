import { existsSync } from 'node:fs'
import { createServer } from 'vite'
import puppeteer from 'puppeteer-core'
const OUT = '/private/tmp/claude-501/-Users-geun-wiho-github-diary/84404bc4-28de-4dbf-a193-1d14073d22a4/scratchpad'
const executablePath = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find(existsSync)
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } })
await server.listen()
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage()
const bad = []
page.on('pageerror', (e) => bad.push(e.message.slice(0, 150)))
page.on('console', (m) => { if (m.type() === 'error') bad.push('console: ' + m.text().slice(0, 150)) })
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 })
await page.goto(server.resolvedUrls.local[0], { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 5000))

const snap = async (label) => {
  const s = await page.evaluate(() => {
    const t = window.__three
    return {
      month: document.body.innerText.split('\n').find((l) => l.includes('년')) ?? '?',
      canvas: !!document.querySelector('.three-stage canvas'),
      modelLoaded: !!t,
      sceneChildren: t ? t.scene.children.length : null,
      drawCalls: t ? t.renderer.info.render.calls : null,
      tris: t ? t.renderer.info.render.triangles : null,
    }
  })
  console.log(label, JSON.stringify(s))
}
await snap('기본(10월):')
await page.screenshot({ path: `${OUT}/oct.png` })

await page.evaluate(async () => {
  const { useGameStore } = await import('/src/store/gameStore.ts')
  useGameStore.getState().setWorld('2026-09')
})
await new Promise((r) => setTimeout(r, 3000))
await snap('9월로 전환:')
console.log('오류:', bad.length ? [...new Set(bad)].slice(0, 3).join(' | ') : '없음')
await browser.close(); await server.close()
