// Walk the whole page and save viewport screenshots down the page, for a visual review. Usage: node tests/walk.mjs [url] [width] [height] [tag]
import { chromium } from '@playwright/test'
const [url = 'http://localhost:5173/', w = '1366', h = '768', tag = 'd'] = process.argv.slice(2)
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: +w, height: +h } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto(url, { waitUntil: 'networkidle' })
let n = 0
const height = () => p.evaluate(() => document.documentElement.scrollHeight)
for (let y = 0; y < (await height()); y += +h - 80) {
  await p.evaluate((v) => scrollTo(0, v), y)
  await p.waitForTimeout(450)
  await p.screenshot({ path: `tests/out/walk-${tag}-${String(n++).padStart(2, '0')}.png` })
}
console.log('screens', n, 'height', await height(), errs.length ? errs.join('|') : 'no errors')
await b.close()
