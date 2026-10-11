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
  // Phones fill the viewport in both orientations, without an outer frame.
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForFunction(() => !!window.__village?.scene.getObjectByName('V4_Ground'), { timeout: 30000 })
  assert.equal(await page.$('.rotate-notice'), null)
  assert.deepEqual(await page.$eval('.stage', (el) => ({ width: el.clientWidth, height: el.clientHeight })), { width: 390, height: 844 })
  assert.equal(await page.$eval('.stage', (el) => getComputedStyle(el).visibility), 'visible')
  assert.ok(await page.$$eval('.menu-button', (buttons) => buttons.every((el) => {
    const box = el.getBoundingClientRect()
    return box.left >= 0 && box.right <= innerWidth && box.height >= 44
  })), 'portrait menus fit inside the screen')
  await page.screenshot({ path: join(artifacts, 'phone-portrait.png') })
  const initialCamera = await page.evaluate(async () => {
    const { VILLAGE_CAMERA } = await import('/src/systems/villageLayout.ts')
    return { y: window.__village.camera.position.y, originalY: VILLAGE_CAMERA.position.y }
  })
  assert.ok(Math.abs(initialCamera.y / initialCamera.originalY - 1.45) < 0.01, 'phone starts zoomed out')
  assert.equal(await page.$eval('.village-stage canvas', (el) => getComputedStyle(el).touchAction), 'none')
  const touchClient = await page.createCDPSession()
  const touch = async (type, points) => {
    await touchClient.send('Input.dispatchTouchEvent', {
      type, touchPoints: points.map(([id, x, y]) => ({ id, x, y })),
    })
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  }
  const cameraPosition = () => page.evaluate(() => window.__village.camera.position.toArray())
  const beforePan = await cameraPosition()
  await touch('touchStart', [[1, 140, 440]])
  await new Promise((resolve) => setTimeout(resolve, 400))
  await touch('touchMove', [[1, 220, 470]])
  await touch('touchEnd', [])
  const afterPan = await cameraPosition()
  assert.ok(Math.hypot(afterPan[0] - beforePan[0], afterPan[2] - beforePan[2]) > 1, 'hold and drag pans the village')
  // Spread and close two real emulated fingers, without zooming the browser page.
  await touch('touchStart', [[1, 140, 470], [2, 250, 470]])
  await touch('touchMove', [[1, 80, 470], [2, 310, 470]])
  const zoomedIn = await cameraPosition()
  assert.ok(zoomedIn[1] < afterPan[1] * 0.8, 'spreading fingers zooms in')
  await touch('touchMove', [[1, 155, 470], [2, 235, 470]])
  const zoomedOut = await cameraPosition()
  assert.ok(zoomedOut[1] > zoomedIn[1] * 1.5, `closing fingers zooms out (${zoomedIn[1]} → ${zoomedOut[1]})`)
  await touch('touchEnd', [])
  assert.equal(await page.evaluate(() => window.visualViewport.scale), 1, 'pinch moves the camera rather than magnifying the page')
  await page.screenshot({ path: join(artifacts, 'phone-pan-and-zoom.png') })
  await page.evaluate(() => [...document.querySelectorAll('.village-controls button')]
    .find((b) => b.textContent === '마을 전체').click())
  await page.waitForFunction((y) => Math.abs(window.__village.camera.position.y - y) < 0.01, {}, initialCamera.y)
  const resetPosition = await cameraPosition()
  assert.ok(Math.abs(resetPosition[0] - beforePan[0]) < 0.01 && Math.abs(resetPosition[2] - beforePan[2]) < 0.01, 'overview restores the initial framing')
  await touch('touchStart', [[1, 170, 440]])
  await touch('touchCancel', [])
  await touchClient.detach()
  await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 3, isMobile: true, hasTouch: true })
  await page.waitForFunction(() => document.querySelector('.stage').clientWidth === 844 &&
    window.__village.renderer.getPixelRatio() === 2)
  assert.equal(await page.$eval('.stage', (el) => el.clientHeight), 390)
  assert.equal(await page.$eval('.stage', (el) => getComputedStyle(el).touchAction), 'pan-x pan-y')
  const touchTargets = await page.$$eval('.menu-button, .village-controls button, .month-arrow',
    (buttons) => buttons.every((el) => el.getBoundingClientRect().width >= 44 && el.getBoundingClientRect().height >= 44))
  assert.ok(touchTargets, 'phone navigation has 44px touch targets')
  await page.screenshot({ path: join(artifacts, 'phone-landscape.png') })
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: false, hasTouch: false })
  await page.reload({ waitUntil: 'networkidle0' })
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
  const offLawn = await page.evaluate(async () => {
    const { VILLAGE_WALKABLE_AREAS, villagePoint } = await import('/src/systems/villageLayout.ts')
    const { isInsideAnyArea } = await import('/src/systems/worldSystem.ts')
    return [...window.__village.instances.values()]
      .filter((i) => !isInsideAnyArea(villagePoint(i.object.position), VILLAGE_WALKABLE_AREAS)).length
  })
  assert.equal(offLawn, 0, '30-person preview must stand on the lawn areas')
  await page.screenshot({ path: join(artifacts, 'mobile-overview.png') })
  const layout = await page.$eval('.stage', (el) => ({ width: el.clientWidth, height: el.clientHeight }))
  assert.deepEqual(layout, { width: 390, height: 844 })
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
  // Saved decorations (legacy coordinates) appear as 3D models on the lawn. Not persisted.
  const decorationIds = await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const { ITEMS } = await import('/src/data/items.ts')
    const s = useGameStore.getState()
    const ids = ITEMS.filter((item) => item.category === 'decoration').map((item) => item.id)
    useGameStore.setState({ worldDecorations: { ...s.worldDecorations, [s.worldId]: ids.map((itemId, i) =>
      ({ id: `check-${itemId}`, itemId, x: 0.4 + (i % 4) * 0.1, y: 0.48 + Math.floor(i / 4) * 0.15 })) } })
    return ids
  })
  await page.waitForFunction((count) => {
    let found = 0
    window.__village.scene.traverse((o) => { if (o.userData.decorationId) found += 1 })
    return found === count
  }, { timeout: 10000 }, decorationIds.length)
  await page.screenshot({ path: join(artifacts, 'desktop-overview.png') })
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const s = useGameStore.getState()
    useGameStore.setState({ worldDecorations: { ...s.worldDecorations, [s.worldId]: [] } })
  })

  // Decorating happens in the 3D village: place, reject a stepping stone, select, move, recall.
  const store = (fn, arg) => page.evaluate(async ({ fn, arg }) => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const s = useGameStore.getState()
    if (fn === 'own') useGameStore.setState({ inventory: { ...s.inventory, decorations: [...new Set([...s.inventory.decorations, ...arg])] } })
    else s[fn](arg)
  }, { fn, arg })
  /** Screen point of a free lawn spot (or of `world` = [x, z] if given), in page pixels. */
  const screenOf = (world) => page.evaluate(async (world) => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const layout = await import('/src/systems/villageLayout.ts')
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const { camera, renderer, instances } = window.__village
    let point
    if (world) point = new THREE.Vector3(world[0], 0, world[1])
    else {
      const s = useGameStore.getState()
      const placed = (s.worldDecorations[s.worldId] ?? []).map((d) => ({ id: d.id, itemId: d.itemId, ...layout.fromLegacyPoint(d) }))
      const occupants = [...instances.values()].map((i) => layout.villagePoint(i.object.position))
      const spot = layout.lawnSpots(80).find((p) => layout.canPlaceInVillage('chair', p, placed, occupants) &&
        Math.abs(layout.fromLegacyPoint(layout.toLegacyPoint(p)).x - p.x) < 1e-6)
      point = layout.villageGround(spot.x, spot.y)
    }
    const p = point.project(camera)
    const rect = renderer.domElement.getBoundingClientRect()
    return [rect.left + (p.x + 1) / 2 * rect.width, rect.top + (1 - p.y) / 2 * rect.height]
  }, world ?? null)
  const placedNow = async () => { const s = await state(); return s.worldDecorations[s.worldId] ?? [] }
  const beforeDecorating = await state()
  await store('own', ['chair', 'flower_pot'])
  await store('togglePanel', 'DECORATE')
  await page.waitForSelector('.village-stage')
  await store('chooseDecoration', 'chair')
  const spotA = await screenOf()
  await page.mouse.move(...spotA)
  await new Promise((resolve) => setTimeout(resolve, 300))
  await page.screenshot({ path: join(artifacts, 'decorate-ghost.png') })
  await page.mouse.down()
  await new Promise((resolve) => setTimeout(resolve, 400))
  await page.mouse.up()
  assert.equal((await placedNow()).length, 0, 'holding the canvas does not place a decoration')
  await page.mouse.down()
  await page.mouse.move(spotA[0] + 50, spotA[1] + 20, { steps: 5 })
  await page.mouse.up()
  assert.equal((await placedNow()).length, 0, 'dragging the camera does not place a decoration')
  await button('마을 전체')
  await new Promise((resolve) => setTimeout(resolve, 300))
  await page.mouse.click(...spotA)
  let decorated = await placedNow()
  assert.equal(decorated.length, 1, 'chair placed from the 3D village')
  assert.equal((await state()).feedback, '배치했어요!')
  const chair = decorated[0]
  assert.ok(chair.x >= 0 && chair.x <= 1 && chair.y >= 0 && chair.y <= 1, 'stored in legacy coordinates')
  await store('chooseDecoration', 'flower_pot')
  const { VILLAGE_POND } = await page.evaluate(async () => import('/src/systems/villageLayout.ts').then((m) => ({ VILLAGE_POND: m.VILLAGE_POND })))
  await page.mouse.click(...await screenOf([VILLAGE_POND.x, VILLAGE_POND.z]))
  assert.equal((await placedNow()).length, 1, 'the pond is not a place for decorations')
  assert.match((await state()).feedback, /놓을 수 없어요/)
  await store('cancelPlacement')
  const chairScreen = await page.evaluate(async (id) => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const { scene, camera, renderer } = window.__village
    let target
    scene.traverse((o) => { if (o.userData.decorationId === id) target = o })
    const p = new THREE.Box3().setFromObject(target).getCenter(new THREE.Vector3()).project(camera)
    const rect = renderer.domElement.getBoundingClientRect()
    return [rect.left + (p.x + 1) / 2 * rect.width, rect.top + (1 - p.y) / 2 * rect.height]
  }, chair.id)
  await page.mouse.click(...chairScreen)
  assert.equal((await state()).selectedDecorationId, chair.id, 'tap selects the decoration')
  await page.screenshot({ path: join(artifacts, 'decorate-selected.png') })
  await store('startMovingDecoration')
  await page.mouse.click(...await screenOf())
  decorated = await placedNow()
  assert.equal(decorated.length, 1)
  assert.ok(decorated[0].x !== chair.x || decorated[0].y !== chair.y, 'chair moved')
  assert.equal((await state()).feedback, '옮겼어요!')
  // Long-press a placed mesh, preview under the finger, and commit only on release.
  assert.equal(await page.$eval('.decoration-move', (el) => getComputedStyle(el).display), 'none')
  const dragCoordinates = (invalid = false) => page.evaluate(async ({ id, invalid }) => {
    const THREE = await import('/node_modules/.vite/deps/three.js')
    const layout = await import('/src/systems/villageLayout.ts')
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const { scene, camera, renderer, instances } = window.__village
    let object
    scene.traverse((o) => { if (o.userData.decorationId === id) object = o })
    const rect = renderer.domElement.getBoundingClientRect()
    const screen = (p) => {
      p = p.clone().project(camera)
      return [rect.left + (p.x + 1) * rect.width / 2, rect.top + (1 - p.y) * rect.height / 2]
    }
    const center = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3())
    const start = screen(center)
    const ray = new THREE.Raycaster()
    ray.setFromCamera(new THREE.Vector2((start[0] - rect.left) / rect.width * 2 - 1,
      1 - (start[1] - rect.top) / rect.height * 2), camera)
    const ground = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3())
    const offset = object.position.clone().sub(ground)
    const s = useGameStore.getState()
    const placements = (s.worldDecorations[s.worldId] ?? []).map((d) => ({ ...d, ...layout.fromLegacyPoint(d) }))
    const occupants = [...instances.values()].map((i) => layout.villagePoint(i.object.position))
    const target = invalid ? new THREE.Vector3(layout.VILLAGE_POND.x, 0, layout.VILLAGE_POND.z)
      : layout.lawnSpots(120).filter((p) => layout.canPlaceInVillage('chair', p, placements, occupants, id))
        .map((p) => layout.villageGround(p.x, p.y)).find((p) => {
          const end = screen(p.clone().sub(offset))
          return p.distanceTo(object.position) > 2 && document.elementFromPoint(...end) === renderer.domElement
        })
    return { start, end: screen(target.clone().sub(offset)), target: layout.toLegacyPoint(layout.villagePoint(target)) }
  }, { id: chair.id, invalid })
  const directTouch = await page.createCDPSession()
  await directTouch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 })
  const sendDragTouch = async (type, point) => {
    await directTouch.send('Input.dispatchTouchEvent', { type,
      touchPoints: point ? [{ id: 1, x: point[0], y: point[1] }] : [] })
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  }
  const drag = await dragCoordinates()
  const beforeDirectDrag = await placedNow()
  const cameraBeforeDrag = await cameraPosition()
  await sendDragTouch('touchStart', drag.start)
  await new Promise((resolve) => setTimeout(resolve, 500))
  assert.equal(await page.$eval('.commerce-sheet--decorate', (el) => getComputedStyle(el).visibility), 'hidden', 'holding a decoration hides the panel before moving')
  await sendDragTouch('touchMove', drag.end)
  assert.deepEqual(await placedNow(), beforeDirectDrag, 'preview does not save until release')
  assert.ok(await page.evaluate((id) => {
    let object
    window.__village.scene.traverse((o) => { if (o.userData.decorationId === id) object = o })
    return object.visible === false
  }, chair.id), 'original is hidden while the drag preview follows the finger')
  const cameraDuringDrag = await cameraPosition()
  assert.ok(cameraDuringDrag.every((value, i) => Math.abs(value - cameraBeforeDrag[i]) < 1e-5), 'dragging a decoration does not pan the camera')
  await page.screenshot({ path: join(artifacts, 'decorate-direct-drag.png') })
  await sendDragTouch('touchEnd')
  assert.equal(await page.$eval('.commerce-sheet--decorate', (el) => getComputedStyle(el).visibility), 'visible', 'release restores the decorating panel')
  decorated = await placedNow()
  assert.ok(Math.abs(decorated[0].x - drag.target.x) < 1e-5 && Math.abs(decorated[0].y - drag.target.y) < 1e-5, 'finger release moves the same decoration to the preview position')
  assert.equal(decorated[0].id, chair.id)
  assert.equal((await state()).placementTool, null)
  const savedAfterDrag = await page.evaluate((month) => JSON.parse(localStorage.getItem('haru-village:v1')).worldDecorations[month], (await state()).worldId)
  assert.deepEqual(savedAfterDrag, decorated, 'direct move persists')
  const cancelled = await dragCoordinates()
  await sendDragTouch('touchStart', cancelled.start)
  await new Promise((resolve) => setTimeout(resolve, 500))
  await sendDragTouch('touchMove', cancelled.end)
  await sendDragTouch('touchCancel')
  assert.equal(await page.$eval('.commerce-sheet--decorate', (el) => getComputedStyle(el).visibility), 'visible', 'interrupted drag restores the panel')
  assert.deepEqual(await placedNow(), decorated, 'interrupted touch restores the original position')
  const invalidDrag = await dragCoordinates(true)
  await sendDragTouch('touchStart', invalidDrag.start)
  await new Promise((resolve) => setTimeout(resolve, 500))
  await sendDragTouch('touchMove', invalidDrag.end)
  await sendDragTouch('touchEnd')
  assert.deepEqual(await placedNow(), decorated, 'invalid direct drop restores the original position')
  assert.match((await state()).feedback, /원래 자리/)
  await directTouch.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  await directTouch.detach()
  await store('recallDecoration')
  assert.equal((await placedNow()).length, 0, 'chair recalled')
  await store('closePanel')
  await page.evaluate(async (saved) => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    useGameStore.setState({ inventory: saved.inventory, worldDecorations: saved.worldDecorations })
  }, beforeDecorating)

  // Pathfinding walks around a decoration that blocks the straight line, on clear ground only.
  const pathCheck = await page.evaluate(async () => {
    const layout = await import('/src/systems/villageLayout.ts')
    const { findPath } = await import('/src/systems/pathSystem.ts')
    const { isWalkable, furthestWalkablePoint } = await import('/src/systems/worldSystem.ts')
    const { getWorld } = await import('/src/data/worlds.ts')
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const bench = { id: 'path-bench', itemId: 'bench', x: 0.6, y: 0.62 }
    const world = layout.villageWorld(getWorld(useGameStore.getState().worldId), [bench])
    const gap = (layout.DECORATION_RADIUS.bench + 0.8) / layout.VILLAGE_DEPTH
    const from = { x: bench.x, y: bench.y - gap }
    const to = { x: bench.x, y: bench.y + gap }
    const direct = furthestWalkablePoint(world, from, to)
    const started = performance.now()
    const path = findPath(world, from, to)
    const ms = performance.now() - started
    const clear = (a, b) => { const r = furthestWalkablePoint(world, a, b); return !!r && r.x === b.x && r.y === b.y }
    const legs = path ? [from, ...path].slice(0, -1).map((a, i) => clear(a, path[i])) : []
    return { directBlocked: !direct || direct.y < to.y - 1e-6, found: !!path, waypoints: path?.length ?? 0,
      allWalkable: !!path && path.every((p) => isWalkable(world, p)), legsClear: legs.every(Boolean),
      endsAtTarget: !!path && path.at(-1).x === to.x && path.at(-1).y === to.y, ms }
  })
  assert.ok(pathCheck.directBlocked, 'the bench blocks the straight line')
  assert.ok(pathCheck.found && pathCheck.waypoints >= 2, 'a path goes around the bench')
  assert.ok(pathCheck.allWalkable && pathCheck.legsClear, 'every leg of the path is on walkable ground')
  assert.ok(pathCheck.endsAtTarget, 'the path ends at the clicked point')
  console.log(`path around bench: ${pathCheck.waypoints} waypoints in ${pathCheck.ms.toFixed(1)} ms`)

  // Thirty characters that start bunched in the middle spread over the wide lawn on their own.
  const spread = await page.evaluate(async () => {
    const layout = await import('/src/systems/villageLayout.ts')
    const { createAgent, stepAgents } = await import('/src/systems/agentSystem.ts')
    const { isWalkable } = await import('/src/systems/worldSystem.ts')
    const { WALK_CONFIG } = await import('/src/systems/walkSystem.ts')
    const { getWorld } = await import('/src/data/worlds.ts')
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const world = layout.villageWorld(getWorld(useGameStore.getState().worldId))
    let seed = 7
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const agents = Array.from({ length: 30 }, (_, i) => createAgent(`a${i}`, 'calm', 0.5 + (i % 6 - 2.5) * 0.012, 0.55 + (Math.floor(i / 6) - 2) * 0.01, random))
    const box = () => {
      const xs = agents.map((a) => a.x * layout.VILLAGE_WIDTH)
      const ys = agents.map((a) => a.y * layout.VILLAGE_DEPTH)
      return Math.round((Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)))
    }
    const before = box()
    let offGround = 0
    for (let t = 0; t < 180; t += 1 / 30) {
      stepAgents(agents, world, 1 / 30, WALK_CONFIG.speed, random)
      offGround += agents.filter((a) => !isWalkable(world, a)).length
    }
    return { before, after: box(), offGround }
  })
  assert.equal(spread.offGround, 0, 'characters stay on walkable ground while roaming')
  assert.ok(spread.after > spread.before * 5, `characters spread out (${spread.before} → ${spread.after} m²)`)
  console.log(`30 characters spread over ${spread.before} → ${spread.after} m² in 3 minutes`)
  await button('기존 마을')
  await page.waitForSelector('.three-stage')
  assert.equal(await page.$('.village-stage'), null)
  await button('3D 마을')
  await page.waitForFunction(() => !!window.__village)
  assert.equal((await state()).characters.filter((c) => c.diaryDate === before.today).length, 1)
  assert.deepEqual(errors, [])
  console.log('PASS GLB load, fullscreen portrait/landscape layout, 2x phone resolution, touch targets, 30-person preview on lawn areas, 3D decorations, 3D decorating, pathfinding, roaming spread, save preservation, diary picking, ground movement, responsive editor, legacy switch')
  console.log(`Screenshots: ${artifacts}`)
} catch (error) {
  await page?.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {})
  console.error(`Failure screenshot: ${artifacts}`)
  throw error
} finally {
  await browser?.close()
  await server.close()
}
