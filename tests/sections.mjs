import { chromium } from '@playwright/test'
const exe = process.env.CHROME || undefined
const b = await chromium.launch({ executablePath: exe })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
for (const id of ['pid', 'swarm', 'net', 'gait', 'cpu8', 'quadrupeds', 'vehicles', 'pipe']) {
  await p.evaluate((i) => document.getElementById(i)?.scrollIntoView(), id)
  await p.waitForTimeout(900)
  await p.evaluate((i) => { const e = document.querySelector(`#${i} .interactive`); if (e) { e.scrollIntoView(); } return !!e }, id)
  await p.waitForTimeout(1200)
  await p.screenshot({ path: `tests/out/sec-${id}.png` })
}
console.log(errs.length ? errs.join('\n') : 'no errors')
await b.close()
