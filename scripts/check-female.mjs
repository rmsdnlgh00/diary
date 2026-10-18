import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import puppeteer from 'puppeteer-core'

const artifacts = mkdtempSync(join(tmpdir(), 'diary-female-check-'))
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } })
let browser, page
try {
  await server.listen()
  browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--enable-unsafe-swiftshader'] })
  page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error' || /No target node found/.test(m.text())) errors.push(m.text()) })
  await page.setRequestInterception(true)
  page.on('request', (r) => /fonts\.(googleapis|gstatic)\.com/.test(r.url())
    ? r.respond({ status: 200, contentType: 'text/css', body: '' }) : r.continue())
  await page.goto(server.resolvedUrls.local[0], { waitUntil: 'networkidle0' })
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const s = useGameStore.getState()
    s.saveDiary(s.today, '여성 캐릭터 연결 테스트')
  })
  await page.waitForFunction(() => window.__village?.instances.size > 0, { timeout: 60000 })
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    useGameStore.getState().togglePanel('CHARACTER')
  })
  await page.waitForSelector('[aria-label="캐릭터 외형"]')
  await page.select('[aria-label="캐릭터 외형"]', 'female')
  await page.waitForFunction(() => [...window.__village.instances.values()].some((i) => i.model === 'female'), { timeout: 60000 })
  await page.waitForSelector('.character-preview-3d[data-ready="true"]', { timeout: 60000 })
  const inspect = () => page.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { instances } = window.__village
    const i = [...instances.values()].find((i) => i.model === 'female')
    const box = new THREE.Box3().setFromObject(i.object)
    let triangles = 0, meshes = 0
    i.object.traverse((o) => {
      if (o.isMesh) { meshes++; triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 }
    })
    return { triangles, meshes, height: box.max.y - box.min.y, floor: box.min.y,
      walk: i.walk.getClip().name, idle: i.idle.getClip().name, time: i.idle.time,
      worn: i.outfit.length, face: i.face }
  })
  let info = await inspect()
  assert.equal(info.triangles, 9799)
  assert.equal(info.walk, 'Walk'); assert.equal(info.idle, 'Idle')
  assert.ok(info.height > 1.5 && info.height < 1.9, JSON.stringify(info))
  assert.ok(Math.abs(info.floor) < 0.12, JSON.stringify(info))
  assert.equal(info.worn, 0); assert.equal(info.face, null)
  if (process.argv.includes('--clothes')) {
    const clothing = await page.evaluate(async () => {
      const { GLTFLoader } = await import('/node_modules/three/examples/jsm/loaders/GLTFLoader.js')
      const { DRACOLoader } = await import('/node_modules/three/examples/jsm/loaders/DRACOLoader.js')
      const { loadClothes, dressCharacter } = await import('/src/systems/characterClothes.ts')
      const draco = new DRACOLoader().setDecoderPath('/draco/').setDecoderConfig({ type: 'wasm' })
      // public/assets/clothes/…/<id>/female.glb (scripts/export-clothes.py)
      const { clothes } = await loadClothes(new GLTFLoader().setDRACOLoader(draco), 'female')
      const character = [...window.__village.instances.values()].find((i) => i.model === 'female').object
      const ids = [...clothes.keys()]
      const expected = [...clothes.values()].reduce((sum, parts) => sum + parts.length, 0)
      const worn = dressCharacter(character, [], ids, clothes)
      let finite = true
      character.updateMatrixWorld(true)
      for (const o of worn) {
        finite &&= o.matrixWorld.elements.every(Number.isFinite)
        o.removeFromParent()
      }
      draco.dispose()
      return { ids: ids.length, expected, attached: worn.length, finite }
    })
    assert.equal(clothing.ids, 18)
    assert.equal(clothing.attached, clothing.expected)
    assert.ok(clothing.finite)
    console.log('PASS fitted female clothes Draco decode and all parts bind to female game skeleton', clothing)
  }
  // Equipped clothes: the village dresses the female character in her own fitted clothes and hides
  // the body under them.
  const dressed = await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const { emptyEquipment } = await import('/src/data/items.ts')
    const s = useGameStore.getState()
    const saved = { characters: s.characters, inventory: s.inventory }
    const outfit = { ...emptyEquipment(), top: 'striped_tee', bottom: 'denim_shorts', shoes: 'walking_shoes' }
    useGameStore.setState({ inventory: { ...s.inventory, clothes: ['striped_tee', 'denim_shorts', 'walking_shoes'] },
      characters: s.characters.map((c) => c.model === 'female' ? { ...c, equippedItems: outfit } : c) })
    const instance = () => [...window.__village.instances.values()].find((i) => i.model === 'female')
    for (let k = 0; k < 100 && !instance()?.outfit.length; k++) await new Promise((r) => setTimeout(r, 100))
    const i = instance()
    const covered = []
    i.object.traverse((o) => { if (o.isSkinnedMesh && !o.name.startsWith('Cloth')) covered.push(o.material !== o.userData.baseMaterial) })
    const result = { parts: i.outfit.length, skinned: i.outfit.filter((o) => o.isSkinnedMesh).length, covered }
    window.__dressedForScreenshot = saved
    return result
  })
  assert.ok(dressed.parts >= 6 && dressed.skinned >= 3, JSON.stringify(dressed))
  assert.ok(dressed.covered.some(Boolean), 'the body hides what the clothes cover')
  console.log('PASS female wears equipped clothes in the village', dressed)
  await page.screenshot({ path: join(artifacts, 'female-wardrobe.png') })
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    useGameStore.getState().closePanel()
    const b = [...document.querySelectorAll('.village-controls button')].find((b) => b.textContent === '따라가기')
    b.click()
  })
  await new Promise((r) => setTimeout(r, 1500))
  await page.screenshot({ path: join(artifacts, 'female-village.png') })
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    useGameStore.setState(window.__dressedForScreenshot)
  })
  const before = await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const s = useGameStore.getState()
    return { diaries: s.diaries, characters: s.characters }
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForFunction(() => [...(window.__village?.instances.values() ?? [])].some((i) => i.model === 'female'), { timeout: 60000 })
  const after = await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const s = useGameStore.getState()
    return { diaries: s.diaries, characters: s.characters }
  })
  assert.deepEqual(after, before)
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const c = useGameStore.getState().characters.find((c) => c.model === 'female')
    useGameStore.getState().setCharacterModel(c.id, 'male')
  })
  await page.waitForFunction(() => [...window.__village.instances.values()].every((i) => i.model === 'male'))
  assert.deepEqual(errors, [])
  console.log('PASS female selection, preview, 9799 triangles, scale/ground, Walk/Idle binding, persistence, male switch; artifacts:', artifacts, info)
} catch (e) {
  await page?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {})
  console.error('Artifacts:', artifacts)
  throw e
} finally {
  await browser?.close()
  await server.close()
}
