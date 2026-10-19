import assert from 'node:assert/strict'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'vite'
import puppeteer from 'puppeteer-core'

// 기존 puppeteer-core와 로컬 Chrome 사용. 사용자 브라우저/저장 데이터에 접근하지 않는다.
const executablePath = process.env.CHROME_PATH ?? [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find(existsSync)
assert.ok(executablePath, 'Chrome이 필요합니다. CHROME_PATH로 실행 파일 경로를 지정해 주세요.')
const artifacts = mkdtempSync(join(tmpdir(), 'haru-game-check-'))
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } })
let browser
let page
const checks = []
try {
  await server.listen()
  browser = await puppeteer.launch({ executablePath, headless: true })
  page = await browser.newPage()
  await page.setRequestInterception(true)
  page.on('request', (request) => /https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(request.url())
    ? request.respond({ status: 200, contentType: 'text/css', body: '' }) : request.continue())
  await page.setViewport({ width: 1440, height: 900 })
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(server.resolvedUrls.local[0] + '?village=legacy', { waitUntil: 'networkidle0' })
  const settle = () => page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const state = () => page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    return JSON.parse(JSON.stringify(useGameStore.getState()))
  })
  const action = async (name, ...args) => {
    await page.evaluate(async ({ name, args }) => {
      const { useGameStore } = await import('/src/store/gameStore.ts')
      useGameStore.getState()[name](...args)
    }, { name, args })
    await settle()
  }
  const click = async (selector) => { await page.click(selector); await settle() }
  // The arrow menu slides open left to right; tap once it has finished opening.
  const openMore = async (panel) => {
    await click('.more-menu__toggle')
    await page.waitForFunction(() => document.querySelector('.more-menu__list')?.getAnimations().every((a) => a.playState === 'finished'))
    await click(`.more-menu__item[data-panel="${panel}"]`)
  }
  const button = async (text) => {
    const found = await page.evaluate((text) => {
      const target = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === text || b.getAttribute('aria-label') === text)
      if (!target) return false
      target.click()
      return true
    }, text)
    assert.ok(found, `버튼 없음: ${text}`)
    await settle()
  }
  const report = (name) => { checks.push(name); console.log(`PASS ${name}`) }

  // v1 저장 파일로 되돌린 후 마이그레이션: 기존 일기/감정/위치 손실이 없어야 한다.
  const initial = await state()
  const legacy = {
    version: 1, diaries: initial.diaries,
    characters: initial.characters.map(({ equippedItems, ...character }) => character),
  }
  await page.evaluate((data) => localStorage.setItem('haru-village:v1', JSON.stringify(data)), legacy)
  await page.reload({ waitUntil: 'networkidle0' })
  let s = await state()
  assert.deepEqual(s.diaries, legacy.diaries)
  assert.deepEqual(s.characters.map(({ equippedItems, ...c }) => c), legacy.characters)
  assert.equal(s.coins, 1000)
  assert.deepEqual(s.inventory, { clothes: [], decorations: [] })
  assert.equal(Object.values(s.characters[0].equippedItems).filter(Boolean).length, 0)
  const month = s.characters[0].diaryDate.slice(0, 7)
  await action('setWorld', month)
  report('기존 v1 일기·캐릭터 보존 및 저장 필드 마이그레이션')

  // The purchase checks below count from 100 coins and real prices (the shop is free for now).
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const { SHOP } = await import('/src/data/items.ts')
    SHOP.free = false
    useGameStore.setState({ coins: 100 })
  })
  await click('.shop-button')
  await click('[data-item-id="winter_coat"] button')
  assert.equal((await state()).feedback, '코인이 부족해요')
  assert.equal((await state()).coins, 100)
  await page.screenshot({ path: join(artifacts, 'shop.png') })
  const clothing = ['basic_hat', 'hoodie_gray', 'basic_pants', 'walking_shoes', 'backpack', 'scarf']
  for (const id of clothing) await click(`[data-item-id="${id}"] button`)
  assert.equal((await state()).coins, 25)
  // Clothes are counted pieces: an owned one can be bought again for another character.
  assert.equal(await page.$eval('[data-item-id="hoodie_gray"] button', (el) => el.disabled), false)
  assert.equal(await page.$eval('[data-item-id="hoodie_gray"] button', (el) => el.textContent.trim()), '하나 더 사기')
  assert.equal(await page.$eval('[data-item-id="hoodie_gray"] .shop-card__ribbon', (el) => el.textContent), '보유 1')
  assert.equal((await state()).inventory.clothes.length, 6)
  report('정확한 코인 차감·잔액 부족·옷은 여러 벌, 장식물은 한 번')

  await button('장식물')
  await click('[data-item-id="flower_pot"] button')
  await click('[data-item-id="small_lamp"] button')
  assert.equal((await state()).coins, 0)
  // A decoration is owned once.
  assert.equal(await page.$eval('[data-item-id="flower_pot"] button', (el) => el.disabled), true)
  await openMore('CHARACTER')
  const firstCharacter = await page.$eval('.character-picker select', (el) => el.value)
  const categoryItems = [
    ['모자', 'basic_hat'], ['상의', 'hoodie_gray'], ['하의', 'basic_pants'],
    ['신발', 'walking_shoes'], ['가방', 'backpack'], ['액세서리', 'scarf'],
  ]
  for (const [label, id] of categoryItems) {
    await button(label)
    await click(`button[data-item-id="${id}"]`)
  }
  s = await state()
  assert.equal(Object.values(s.characters.find((c) => c.id === firstCharacter).equippedItems).filter(Boolean).length, 6)
  const secondCharacter = s.characters.find((c) => c.id !== firstCharacter && c.diaryDate.startsWith(month)).id
  await page.select('.character-picker select', secondCharacter)
  await settle()
  await button('상의')
  // The only hoodie is on the first character: the second can't wear it, only try it on.
  assert.ok(await page.$('button[data-item-id="hoodie_gray"][data-taken]'), 'a worn piece shows as taken')
  await click('button[data-item-id="hoodie_gray"]')
  assert.equal((await state()).characters.find((c) => c.id === secondCharacter).equippedItems.top, null)
  await action('equipItem', secondCharacter, 'top', 'hoodie_gray')
  assert.equal((await state()).feedback, '다른 캐릭터가 입고 있어요')
  // A second hoodie lets both wear one.
  await page.evaluate(async () => { (await import('/src/data/items.ts')).SHOP.free = true })
  await action('buyItem', 'hoodie_gray')
  await page.evaluate(async () => { (await import('/src/data/items.ts')).SHOP.free = false })
  await action('equipItem', secondCharacter, 'top', 'hoodie_gray')
  assert.equal((await state()).characters.find((c) => c.id === secondCharacter).equippedItems.top, 'hoodie_gray')
  await click('[aria-label="상의 장착 해제"]')
  await action('equipItem', secondCharacter, 'top', 'winter_coat')
  await action('equipItem', secondCharacter, 'top', 'basic_hat')
  s = await state()
  assert.equal(s.characters.find((c) => c.id === secondCharacter).equippedItems.top, null)
  assert.equal(s.characters.find((c) => c.id === firstCharacter).equippedItems.top, 'hoodie_gray')
  await page.select('.character-picker select', firstCharacter)
  await settle()
  assert.equal(await page.$$eval('.wardrobe-preview .equipment-summary > span', (els) => els.length), 6)
  await page.screenshot({ path: join(artifacts, 'wardrobe.png') })
  report('6개 의상 슬롯·날짜별 장착 분리·해제·한 벌은 한 캐릭터만·미보유/잘못된 분류 차단')

  // Try on clothes not owned yet: only the preview changes until "받고 입기".
  await page.evaluate(async () => { (await import('/src/data/items.ts')).SHOP.free = true })
  const beforeTry = await state()
  await button('모자')
  await click('button[data-item-id="bear_hat"]')
  let tried = await state()
  assert.deepEqual(tried.inventory, beforeTry.inventory)
  assert.deepEqual(tried.characters, beforeTry.characters)
  assert.ok(await page.$('.try-on__row'), 'the try-on bar shows the item')
  await page.screenshot({ path: join(artifacts, 'try-on.png') })
  await button('벗기')
  assert.equal(await page.$('.try-on__row'), null)
  await click('button[data-item-id="bear_hat"]')
  await button('받고 입기')
  tried = await state()
  assert.ok(tried.inventory.clothes.includes('bear_hat'))
  assert.equal(tried.characters.find((c) => c.id === firstCharacter).equippedItems.hat, 'bear_hat')
  assert.equal(tried.coins, beforeTry.coins)
  assert.equal(await page.$('.try-on__row'), null)
  report('입어보기: 미리보기만 바뀌고 받고 입기로 보유·장착')

  // The shop's fitting room: tap a stand to try clothes on, then get and wear them.
  await action('togglePanel', 'SHOP')
  const beforeShopTry = await state()
  assert.equal(await page.$('.fitting-room'), null)
  await click('[aria-label="방울 털모자 입어보기"]')
  await click('[aria-label="체크 반바지 입어보기"]')
  assert.ok(await page.$('.fitting-room'), 'the fitting room opens')
  assert.equal(await page.$$eval('.fitting-room .try-on__row', (rows) => rows.length), 2)
  assert.deepEqual((await state()).inventory, beforeShopTry.inventory)
  await page.waitForSelector('.fitting-room .character-preview-3d[data-ready]', { timeout: 30000 })
  await page.screenshot({ path: join(artifacts, 'shop-fitting-room.png') })
  await click('[aria-label="체크 반바지 입어보기"]')
  assert.equal(await page.$$eval('.fitting-room .try-on__row', (rows) => rows.length), 1)
  await page.click('.fitting-room .try-on__get')
  await settle()
  const afterShopTry = await state()
  assert.ok(afterShopTry.inventory.clothes.includes('beanie'))
  assert.ok(afterShopTry.characters.some((c) => c.equippedItems.hat === 'beanie' && c.diaryDate.startsWith(afterShopTry.worldId)))
  assert.equal(await page.$('.fitting-room'), null, 'the fitting room closes when nothing is tried on')
  await action('closePanel')
  report('상점 탈의실: 입어보기·벗기·받고 입기')

  await openMore('DECORATE')
  const ground = async (x, y) => {
    const box = await page.$eval('.game-world', (el) => {
      const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }
    })
    await page.mouse.click(box.x + box.width * x, box.y + box.height * y)
    await settle()
  }
  await click('[data-item-id="flower_pot"]')
  // 연못을 실제 클릭, 나머지 금지 영역은 같은 store 진입점으로 검증.
  await ground(0.2, 0.4)
  assert.equal((await state()).worldDecorations[month]?.length ?? 0, 0)
  for (const point of [{ x: 0.65, y: 0.2 }, { x: 0.91, y: 0.32 }, { x: 0.95, y: 0.75 }, { x: 0.5, y: 0.9 }, { x: 0.391, y: 0.55 }]) {
    await action('placeAt', point)
    assert.equal((await state()).worldDecorations[month]?.length ?? 0, 0)
  }
  await ground(0.5, 0.55)
  s = await state()
  assert.equal(s.worldDecorations[month].length, 1)
  assert.ok(Math.abs(s.worldDecorations[month][0].x - 0.5) < 0.001)
  await button('이동')
  await ground(0.62, 0.68)
  s = await state()
  assert.ok(Math.abs(s.worldDecorations[month][0].x - 0.62) < 0.001)
  await click('[data-item-id="small_lamp"]')
  await action('placeAt', { x: 0.62, y: 0.68 })
  assert.equal((await state()).worldDecorations[month].length, 1)
  await ground(0.72, 0.6)
  assert.equal((await state()).worldDecorations[month].length, 2)
  await click('[aria-label="꽃 화분 선택"]')
  await button('이동')
  await button('이동 취소')
  assert.equal((await state()).placementTool, null)
  await button('회수')
  assert.equal((await state()).worldDecorations[month].length, 1)
  assert.ok((await state()).inventory.decorations.includes('flower_pot'))
  await click('[data-item-id="flower_pot"]')
  await ground(0.5, 0.55)
  await page.screenshot({ path: join(artifacts, 'decorate.png') })
  report('클릭 배치·이동·취소·회수·재배치와 금지 영역/겹침 제한')

  // 화면 크기가 달라도 normalized 위치와 편집 패널의 배치 영역 분리를 유지한다.
  await page.setViewport({ width: 900, height: 650 })
  await settle()
  const layout = await page.evaluate(() => {
    const world = document.querySelector('.game-world').getBoundingClientRect()
    const panel = document.querySelector('.commerce-sheet')
    return { panelLeft: (panel.getBoundingClientRect().left - world.left) / world.width,
      scroll: panel.scrollWidth, width: panel.clientWidth }
  })
  assert.ok(layout.panelLeft >= 0.8)
  assert.ok(layout.scroll <= layout.width + 1)
  await page.screenshot({ path: join(artifacts, 'decorate-small.png') })
  await page.setViewport({ width: 1440, height: 900 })
  await button('꾸미기 완료')
  assert.equal((await state()).activePanel, null)
  assert.equal(await page.$('.game-world--editing'), null)
  const before = await state()
  await page.reload({ waitUntil: 'networkidle0' })
  s = await state()
  for (const key of ['coins', 'inventory', 'characters', 'worldDecorations', 'worldId']) assert.deepEqual(s[key], before[key], key)
  report('화면 크기 변경·편집 종료·새로고침 후 전체 상태 유지')

  await click('.top-hit')   // the month arrows live in the month picker
  await click('[aria-label="다음 달"]')
  const nextMonth = (await state()).worldId
  assert.notEqual(month, nextMonth)
  assert.equal(await page.$('.placed-item'), null)
  await openMore('DECORATE')
  await click('[data-item-id="flower_pot"]')
  await ground(0.55, 0.55)
  s = await state()
  assert.equal(s.worldDecorations[month].length, 2)
  assert.equal(s.worldDecorations[nextMonth].length, 1)
  await page.reload({ waitUntil: 'networkidle0' })
  assert.equal((await state()).worldId, nextMonth)
  await click('.top-hit')
  await click('[aria-label="이전 달"]')
  assert.equal(await page.$$eval('.placed-item', (els) => els.length), 2)
  report('월별 마을·장식물 분리 및 선택한 월 저장')

  // 오늘 일기를 새로 쓰고 고쳐도 구매/장착 정보와 다른 날짜는 보존된다.
  const beforeDiary = await state()
  // Today is still unwritten: the prompt above the menu opens the editor.
  await click('.today-prompt')
  await page.type('.editor__text', '행복하고 감사한 하루였다.')
  await click('.editor__save')
  s = await state()
  const today = s.today
  assert.equal(s.characters.filter((c) => c.diaryDate === today).length, 1)
  // A new day: the notebook closes and the character comes in by boat.
  assert.equal(s.activePanel, null, 'saving a new day closes the editor')
  assert.equal(s.arrivingId, s.characters.find((c) => c.diaryDate === today).id, 'the new character is on its way')
  await action('saveDiary', today, '슬프고 눈물이 났다.')
  s = await state()
  assert.equal(s.characters.filter((c) => c.diaryDate === today).length, 1)
  assert.equal(s.characters.find((c) => c.diaryDate === today).emotion, 'SAD')
  assert.deepEqual(s.inventory, beforeDiary.inventory)
  assert.deepEqual(s.worldDecorations, beforeDiary.worldDecorations)
  // A new day's entry pays 10 coins (short text); rewriting it pays nothing more.
  assert.equal(s.coins, beforeDiary.coins + 10)
  // A draft survives closing the editor; a mood the player picks wins over the text.
  await action('closePanel')
  assert.equal(await page.$('.today-prompt'), null, 'the prompt is gone once today is written')
  await action('togglePanel', 'DIARY')
  await page.type('.editor__text', ' 그래도 저녁은 맛있었다.')
  await action('closePanel')
  await action('togglePanel', 'DIARY')
  assert.ok((await page.$eval('.editor__text', (el) => el.value)).endsWith('그래도 저녁은 맛있었다.'), 'draft kept')
  await page.evaluate(() => [...document.querySelectorAll('.editor__moods button')].find((b) => b.textContent === '화남').click())
  await settle()
  await click('.editor__save')
  s = await state()
  assert.equal(s.characters.find((c) => c.diaryDate === today).emotion, 'ANGRY')
  assert.equal(s.diaries.find((d) => d.date === today).emotionPicked, true)
  assert.ok(await page.$('.editor--done'), 'an edit shows the card after saving')
  assert.equal(await page.evaluate((d) => localStorage.getItem(`haru-village:draft:${d}`), today), null, 'draft cleared')
  await button('마을에서 보기')
  assert.equal((await state()).activePanel, null)
  report('일기장: 새 일기는 배 도착으로, 고친 일기는 카드로·임시 저장·기분 직접 고르기')
  assert.equal((await state()).coins, beforeDiary.coins + 10, 'edits earn no extra coins')

  // Past diaries: the calendar shows today's mood; the entry opens the character's diary.
  await click('.journal-button')
  assert.ok(await page.$(`.journal-day[data-date="${today}"][style]`), 'today is coloured by its mood')
  await click(`.journal-day[data-date="${today}"]`)
  assert.ok((await page.$eval('.journal-entry__text', (el) => el.textContent)).includes('그래도 저녁은 맛있었다.'))
  await page.screenshot({ path: join(artifacts, 'journal.png') })
  await button('마을에서 만나기')
  assert.equal((await state()).activePanel, null)
  assert.ok(await page.$('.diary-sheet__text'), "the day's diary opens in the village")
  await button('닫기')
  report('지난 일기: 달력 기분 색·일기 보기·마을에서 만나기, 일기 코인 보상')
  const walkerPositions = () => page.evaluate(() => window.__three
    ? [...window.__three.instances.values()].map((i) => i.object.position.toArray().join(','))
    : [...document.querySelectorAll('.walker')].map((el) => el.getAttribute('style')))
  const positionBefore = await walkerPositions()
  await page.waitForFunction((before) => window.__three
    ? [...window.__three.instances.values()].some((inst, i) => inst.object.position.toArray().join(',') !== before[i])
    : [...document.querySelectorAll('.walker')].some((el, i) => el.getAttribute('style') !== before[i]),
    { timeout: 20_000 }, positionBefore)
  // The 3D village test covers mesh picking; verify diary detail persistence here.
  await action('selectCharacter', (await state()).characters.find((c) => c.diaryDate.startsWith(month)).id)
  assert.ok(await page.$('.diary-sheet__text'))
  await button('닫기')
  report('기존 일기 작성·감정 수정·날짜 중복 방지·랜덤 이동·일기 상세 유지')

  // 저장소 손상과 실제 월 변경도 확인한다.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('haru-village:v1')))
  assert.equal(saved.version, 2)
  const migration = await page.evaluate(async (data) => {
    const { loadSave } = await import('/src/systems/saveSystem.ts')
    const restore = () => localStorage.setItem('haru-village:v1', JSON.stringify(data))
    try {
      localStorage.setItem('haru-village:v1', '{broken')
      const broken = loadSave()
      localStorage.setItem('haru-village:v1', JSON.stringify({ ...data, coins: -20,
        inventory: { clothes: ['hoodie_gray', 'hoodie_gray', 'missing'], decorations: ['flower_pot'] },
        worldDecorations: { '2026-09': [{ id: 'bad', itemId: 'flower_pot', x: 99, y: 0.5 }] },
        calendarMonth: '2000-01', worldId: '2000-01' }))
      const normalized = loadSave()
      // Older saves let two characters share one piece: loading gives them a copy each.
      const [a, b] = data.characters
      const sharing = { ...data.characters[0].equippedItems, top: 'hoodie_gray' }
      localStorage.setItem('haru-village:v1', JSON.stringify({ ...data,
        inventory: { ...data.inventory, clothes: ['hoodie_gray'] },
        characters: [{ ...a, equippedItems: { ...sharing } }, { ...b, equippedItems: { top: 'hoodie_gray' } },
          ...data.characters.slice(2).map((c) => ({ ...c, equippedItems: { ...c.equippedItems, top: null } }))] }))
      const shared = loadSave()
      return { broken, normalized, shared: { copies: shared.inventory.clothes.filter((id) => id === 'hoodie_gray').length,
        worn: shared.characters.slice(0, 2).map((c) => c.equippedItems.top) } }
    } finally { restore() }
  }, saved)
  assert.equal(migration.broken.coins, 1000)
  assert.equal(migration.normalized.coins, 1000)
  // Two copies stay two (clothes are counted); unknown ids are dropped.
  assert.deepEqual(migration.normalized.inventory.clothes, ['hoodie_gray', 'hoodie_gray'])
  assert.deepEqual(migration.normalized.worldDecorations['2026-09'], [])
  assert.deepEqual(migration.shared, { copies: 2, worn: ['hoodie_gray', 'hoodie_gray'] }, 'nobody is undressed by the copy rule')
  assert.equal(migration.normalized.worldId, today.slice(0, 7))
  const realCalendar = (await state()).calendarMonth
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    useGameStore.setState({ calendarMonth: '2000-01', worldId: '2000-01' })
    useGameStore.getState().syncCalendar()
  })
  assert.equal((await state()).worldId, realCalendar)
  assert.deepEqual((await state()).worldDecorations, saved.worldDecorations)
  report('손상된 저장 데이터 복구·월 변경 자동 전환·과거 공간 보존')

  await page.evaluate(async () => {
    const { getItem } = await import('/src/data/items.ts')
    getItem('basic_hat').assetPath = '/assets/missing-test-item.webp'
  })
  await action('togglePanel', 'SHOP')
  await page.waitForFunction(async () => {
    const { getAssetStatus } = await import('/src/systems/assetSystem.ts')
    return getAssetStatus('/assets/missing-test-item.webp') === 'missing'
  })
  assert.equal(await page.$('[data-item-id="basic_hat"] .item-artwork img'), null)
  await action('closePanel')
  await page.evaluate(async () => {
    const { getItem } = await import('/src/data/items.ts')
    getItem('basic_hat').assetPath = '/assets/worlds/2026-09/background.webp'
  })
  await action('togglePanel', 'SHOP')
  await page.waitForSelector('[data-item-id="basic_hat"] .item-artwork img')
  await page.evaluate(async () => {
    const { getItem } = await import('/src/data/items.ts')
    getItem('basic_hat').assetPath = ''
  })
  await action('closePanel')
  report('없는 이미지의 placeholder 처리·assetPath 변경 시 이미지 연결')

  // localStorage 쓰기 실패를 사용자에게 알리고 앱은 계속 동작한다.
  await page.evaluate(async () => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = () => { throw new DOMException('full', 'QuotaExceededError') }
    try { useGameStore.getState().setWorld(useGameStore.getState().worldId) }
    finally { Storage.prototype.setItem = original }
  })
  await settle()
  assert.ok(await page.$('[role="alert"]'))
  await action('setWorld', realCalendar)
  assert.equal(await page.$('[role="alert"]'), null)
  assert.deepEqual(errors, [])
  // On the current month the picker cannot step into the future.
  await click('.top-hit')
  const locked = await page.evaluate(() => ({
    nextMonth: document.querySelector('[aria-label="다음 달"]').disabled,
    nextYear: document.querySelector('[aria-label="다음 해"]').disabled,
    future: [...document.querySelectorAll('.month-panel__month')].filter((b) => b.disabled).length,
  }))
  assert.ok(locked.nextMonth && locked.nextYear, 'no future month or year')
  assert.equal(locked.future, 12 - Number(realCalendar.slice(5, 7)))
  await click('.top-hit')
  // Sound: unlocked by the taps above; the music plays and opening a panel rings a bell.
  const peak = (ms) => page.evaluate(async (ms) => {
    let max = 0
    for (const end = performance.now() + ms; performance.now() < end;) {
      max = Math.max(max, window.__audio.level())
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    return max
  }, ms)
  assert.equal(await page.evaluate(() => window.__audio?.ctx.state), 'running', 'sound unlocks on the first tap')
  assert.ok(await peak(3000) > 0.01, 'background music plays')
  await page.evaluate(async () => {
    const { useSettingsStore } = await import('/src/store/settingsStore.ts')
    useSettingsStore.getState().set('muted', true)
  })
  await new Promise((resolve) => setTimeout(resolve, 800))
  await click('.shop-button')
  assert.ok(await peak(500) < 0.005, 'muting silences music and effects')
  await page.evaluate(async () => {
    const { useSettingsStore } = await import('/src/store/settingsStore.ts')
    useSettingsStore.getState().reset()
  })
  await click('.shop-button')
  report('저장 실패 피드백·복구, 미래 달 잠금, 소리·음소거, 브라우저 런타임 오류 없음')
  console.log(`\n${checks.length}개 시나리오 통과. 스크린샷: ${artifacts}`)
} catch (error) {
  if (page) await page.screenshot({ path: join(artifacts, 'failure.png') }).catch(() => {})
  console.error(`검증 실패 화면: ${artifacts}`)
  throw error
} finally {
  await browser?.close()
  await server.close()
}
