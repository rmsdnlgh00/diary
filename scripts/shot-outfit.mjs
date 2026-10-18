// Screenshots of the wardrobe's 3D preview with one character wearing given clothes: the front
// (<name>-a.png), the side and the back (<name>-side.png, <name>-b.png), at 4x so seams and skin
// showing through the clothes are easy to spot.
//
//   node scripts/shot-outfit.mjs <male|female> <item id,item id,…> [out dir] [name]
//   node scripts/shot-outfit.mjs female hoodie_gray,denim_shorts,walking_shoes /tmp/shots hoodie
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createServer } from 'vite'
import puppeteer from 'puppeteer-core'

const [model = 'male', list = 'striped_tee,denim_shorts,walking_shoes', out = 'outfit-shots', name = `${model}`] = process.argv.slice(2)
const ids = list.split(',').filter(Boolean)
mkdirSync(out, { recursive: true })
const server = await createServer({ root: resolve(import.meta.dirname, '..'), server: { host: '127.0.0.1', port: 0 } })
await server.listen()
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 4 })
  await page.setRequestInterception(true)
  page.on('request', (r) => /fonts\.(googleapis|gstatic)\.com/.test(r.url())
    ? r.respond({ status: 200, contentType: 'text/css', body: '' }) : r.continue())
  await page.goto(server.resolvedUrls.local[0], { waitUntil: 'networkidle0' })
  await page.evaluate(async (model, ids) => {
    const { useGameStore } = await import('/src/store/gameStore.ts')
    const { emptyEquipment, getItem } = await import('/src/data/items.ts')
    const s = useGameStore.getState()
    s.saveDiary(s.today, '옷 확인')
    const outfit = emptyEquipment()
    for (const id of ids) outfit[getItem(id).category] = id
    const st = useGameStore.getState()
    useGameStore.setState({ inventory: { ...st.inventory, clothes: ids },
      characters: st.characters.map((c) => ({ ...c, model, equippedItems: outfit })) })
    useGameStore.getState().togglePanel('CHARACTER')
  }, model, ids)
  await page.waitForSelector('.character-preview-3d[data-ready="true"]', { timeout: 60000 })
  const preview = await page.$('.character-preview-3d')
  // The preview turns slowly on its own: front, then side, then back.
  await new Promise((r) => setTimeout(r, 2500))
  await preview.screenshot({ path: join(out, `${name}-a.png`) })
  await new Promise((r) => setTimeout(r, 3500))
  await preview.screenshot({ path: join(out, `${name}-side.png`) })
  await new Promise((r) => setTimeout(r, 1500))
  await preview.screenshot({ path: join(out, `${name}-b.png`) })
  console.log(`saved ${join(out, name)}-{a,side,b}.png`)
} finally {
  await browser.close(); await server.close()
}
