/**
 * 측면 표정 원본 PNG → public 으로 내보낼 WebP.
 *
 *   npm run pack-side
 *
 * 하는 일
 *   src/assets/character/expressions/{감정}_side.png 를 읽어
 *   public/assets/character/expressions/{감정}_side.webp 로 줄여 저장한다.
 *
 * 왜 필요한가
 *   원본은 1024x1536 PNG 로 한 장에 1.6MB 다. 셋이면 4.8MB 로, 빌드 산출물
 *   전체의 4분의 3을 차지했다. 화면에서 이 그림은 캐릭터 머리 크기로만
 *   쓰이므로(가장 큰 화면·고해상도에서도 240px 안쪽) 원본 해상도가 필요 없다.
 *
 *   정면 표정은 이미 public 의 WebP 를 경로로 참조하고 있다. 측면만 src 의
 *   PNG 를 직접 import 하고 있어서 번들에 원본이 그대로 실렸다. 같은 방식으로
 *   맞춘다.
 *
 * 좌표는 건드리지 않아도 된다.
 *   sideExpressions.ts 의 width/height/head 는 그림을 그릴 좌표계일 뿐이고,
 *   SVG 가 실제 파일을 그 좌표계에 맞춰 늘린다. 그래서 파일 픽셀 수를 줄여도
 *   머리·목 정렬은 그대로다.
 *
 * 렌더링에 브라우저 캔버스를 쓰므로 시스템에 설치된 Chrome 이 필요하다.
 */
import fs from 'node:fs'
import puppeteer from 'puppeteer-core'

const SRC = 'src/assets/character/expressions'
const OUT = 'public/assets/character/expressions'
const NAMES = ['happy_side', 'sad_side', 'angry_side']
/** 내보낼 크기. 원본 1024x1536 의 절반. */
const WIDTH = 512
const HEIGHT = 768
const QUALITY = 0.9

const CHROME =
  process.env.CHROME_PATH ??
  [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((p) => fs.existsSync(p))

if (!CHROME) throw new Error('Chrome 이 필요합니다. CHROME_PATH 로 경로를 지정해 주세요.')

fs.mkdirSync(OUT, { recursive: true })

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.goto('about:blank')

for (const name of NAMES) {
  const source = `${SRC}/${name}.png`
  if (!fs.existsSync(source)) {
    console.log(`${name}  원본이 없어 건너뜀`)
    continue
  }

  const url = `data:image/png;base64,${fs.readFileSync(source).toString('base64')}`
  const encoded = await page.evaluate(
    async ({ url, width, height, quality }) => {
      const image = await new Promise((resolve, reject) => {
        const i = new Image()
        i.onload = () => resolve(i)
        i.onerror = reject
        i.src = url
      })
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(image, 0, 0, width, height)
      return {
        source: `${image.width}x${image.height}`,
        webp: canvas.toDataURL('image/webp', quality).split(',')[1],
      }
    },
    { url, width: WIDTH, height: HEIGHT, quality: QUALITY },
  )

  const target = `${OUT}/${name}.webp`
  fs.writeFileSync(target, Buffer.from(encoded.webp, 'base64'))

  const before = (fs.statSync(source).size / 1024).toFixed(0)
  const after = (fs.statSync(target).size / 1024).toFixed(0)
  console.log(
    `${name}  ${encoded.source} ${before}KB  →  ${WIDTH}x${HEIGHT} ${after}KB  ` +
      `(${(100 - (after / before) * 100).toFixed(1)}% 감소)`,
  )
}

await browser.close()
