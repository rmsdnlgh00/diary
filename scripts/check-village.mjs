import assert from 'node:assert/strict'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import puppeteer from 'puppeteer-core'

const executablePath = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
assert.ok(existsSync(executablePath), 'Chrome required')
const artifacts = mkdtempSync(join(tmpdir(), 'diary-village-check-'))
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } })
let browser
let page
try {
  await server.listen()
  browser = await puppeteer.launch({ executablePath, headless: true, args: ['--enable-unsafe-swiftshader'] })
  page = await browser.newPage()
  await page.setRequestInterception(true)
  page.on('request', (request) => /https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(request.url())
    ? request.respond({ status: 200, contentType: 'text/css', body: '' }) : request.continue())
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(server.resolvedUrls.local[0], { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => !!window.__village?.scene.getObjectByName('V4_Ground'), { timeout: 30000 })
  const button = async (label) => {
    assert.ok(await page.evaluate((label) => {
      const b = [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === label || el.querySelector('.menu-button__label')?.textContent.trim() === label)
      b?.click()
      return !!b
    }, label), `Button not found: ${label}`)
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  const state = () => page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    return JSON.parse(JSON.stringify(useGameStore.getState()))
  })
  const before = await state()
  await button('30명 미리보기')
  await page.waitForFunction(() => window.__village.instances.size === 30)
  await page.screenshot({ path: join(artifacts, 'mobile-overview.png') })
  const layout = await page.$eval('.stage', (el) => ({ width: el.clientWidth, height: el.clientHeight }))
  assert.ok(Math.abs(layout.width / layout.height - 16 / 9) < 0.01)
  await button('기본 시점')
  await page.screenshot({ path: join(artifacts, 'mobile-basic.png') })
  await button('따라가기')
  await page.screenshot({ path: join(artifacts, 'mobile-follow.png') })
  const afterPreview = await state()
  assert.deepEqual(afterPreview.diaries, before.diaries)
  assert.deepEqual(afterPreview.characters, before.characters)
  await button('30명 미리보기')
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    useGameStore.getState().saveDiary(useGameStore.getState().today, '행복하고 감사한 마을 테스트')
  })
  await page.waitForFunction(() => window.__village.instances.size >= 1)
  await button('마을 전체')
  const clicked = await page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const { scene, camera, renderer, instances } = window.__village
    const id = useGameStore.getState().characters.find((c) => c.diaryDate === useGameStore.getState().today).id
    const instance = instances.get(id)
    const box = new THREE.Box3().setFromObject(instance.object)
    const p = box.getCenter(new THREE.Vector3()).project(camera)
    const rect = renderer.domElement.getBoundingClientRect()
    return { id, x: rect.left + (p.x + 1) / 2 * rect.width, y: rect.top + (1 - p.y) / 2 * rect.height, sceneObjects: scene.children.length }
  })
  await page.mouse.click(clicked.x, clicked.y)
  await page.waitForSelector('.modal__text')
  assert.equal((await state()).selectedCharacterId, clicked.id)
  await button('닫기')
  const movement = await page.evaluate(async () => {
    const { villageGround, villagePoint } = await import('/src/systems/villageLayout.ts')
    const { camera, renderer, instances } = window.__village
    const object = [...instances.values()][0].object
    const start = villagePoint(object.position)
    const x = Math.max(.15, Math.min(.85, start.x + .12))
    const y = Math.max(.12, Math.min(.88, start.y + .05))
    const p = villageGround(x, y).project(camera)
    const rect = renderer.domElement.getBoundingClientRect()
    return { initial: [object.position.x, object.position.z], id: object.userData.characterId,
      screen: [rect.left + (p.x + 1) / 2 * rect.width, rect.top + (1 - p.y) / 2 * rect.height] }
  })
  await page.mouse.click(...movement.screen)
  await page.waitForFunction(({ initial, id }) => {
    const o = window.__village.instances.get(id).object
    return Math.hypot(o.position.x - initial[0], o.position.z - initial[1]) > .05
  }, { timeout: 10000 }, movement)
  await button('오늘 기록')
  await page.waitForSelector('.editor__text')
  const editorSize = await page.$eval('.editor', (el) => ({ width: el.clientWidth, scroll: el.scrollWidth }))
  assert.ok(editorSize.scroll <= editorSize.width + 1)
  await page.keyboard.press('Escape')
  await page.setViewport({ width: 1440, height: 900 })
  await button('마을 전체')
  await page.screenshot({ path: join(artifacts, 'desktop-overview.png') })
  await button('기존 마을')
  await page.waitForSelector('.three-stage')
  assert.equal(await page.$('.village-stage'), null)
  await button('3D 마을')
  await page.waitForFunction(() => !!window.__village)
  assert.equal((await state()).characters.filter((c) => c.diaryDate === before.today).length, 1)
  assert.deepEqual(errors, [])
  console.log('PASS GLB load, 16:9 legacy-view layout, 30-person preview, save preservation, diary picking, ground movement, responsive editor, legacy switch')
  console.log(`Screenshots: ${artifacts}`)
} catch (error) {
  await page?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {})
  console.error(`Failure screenshot: ${artifacts}`)
  throw error
} finally {
  await browser?.close()
  await server.close()
}
