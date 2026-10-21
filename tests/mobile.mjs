import { chromium, devices } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } })
const p = await ctx.newPage()
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto(url + '?lang=ja', { waitUntil: 'networkidle' })
const out = []
for (const id of ['pid', 'swarm', 'cpu8', 'vehicles']) {
  await p.evaluate((i) => (document.querySelector(`#${i} .interactive`) ?? document.getElementById(i))?.scrollIntoView(), id)
  await p.waitForTimeout(1200)
  await p.screenshot({ path: `tests/out/m-${id}.png` })
  out.push(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
}
console.log('overflow per section', out.join(','), errs.length ? errs.join('|') : 'no errors')
await b.close()
