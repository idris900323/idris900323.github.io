import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:5173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 1100 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto(url, { waitUntil: 'networkidle' })
await p.evaluate(() => document.querySelector('#vehicles')?.scrollIntoView())
await p.waitForTimeout(1500)
await p.evaluate(() => document.querySelector('#vehicles .interactive')?.scrollIntoView())
await p.waitForTimeout(2500)
for (const name of [/2-wheel/, /^4-wheel/, /Tracked/]) {
  await p.locator('#vehicles .interactive').getByRole('button', { name }).first().click()
  await p.getByRole('button', { name: /Pivot test/ }).click()
  await p.waitForTimeout(1200)
  await p.locator('#vehicles canvas').evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await p.waitForTimeout(300)
  await p.screenshot({ path: `tests/out/arena-${String(name).replace(/[^a-z0-9]/gi, '')}.png` })
  await p.waitForTimeout(2500)
  console.log(await p.locator('#vehicles [role=status]').last().innerText())
}
console.log(errs.length ? 'ERRORS ' + errs.join('|') : 'no errors')
await b.close()
