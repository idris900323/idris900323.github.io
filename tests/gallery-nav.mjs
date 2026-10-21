// The Next arrow sits on the image, so it stays on screen as the images change size. Click through every gallery without scrolling.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 720 } })
await p.goto(process.argv[2] ?? 'http://localhost:4173/', { waitUntil: 'networkidle' })
let bad = 0, galleries = 0
const count = await p.locator('.gallery').count()
for (let g = 0; g < count; g++) {
  const gal = p.locator('.gallery').nth(g)
  const next = gal.locator('.spot-nav.next')
  if (!(await next.count())) continue
  galleries++
  await gal.evaluate((e) => { const r = e.getBoundingClientRect(); scrollTo({ top: scrollY + r.top - 80, behavior: 'instant' }) })
  await p.waitForTimeout(300)
  const n = await gal.locator('.thumb').count()
  for (let k = 0; k < n; k++) {
    const box = await next.boundingBox()
    const inView = box && box.y >= 0 && box.y + box.height <= 720
    if (!inView) { bad++; console.log('FAIL gallery', g, 'image', k, JSON.stringify(box)); break }
    await next.click()
    await p.waitForTimeout(120)
  }
}
console.log(bad ? 'FAIL' : 'ok  ', galleries, 'galleries')
await b.close(); process.exit(bad ? 1 : 0)
