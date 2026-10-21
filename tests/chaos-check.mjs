import { enterChaos } from './enter-chaos.mjs'
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:4173/'
const exe = process.env.CHROME || undefined
const b = await chromium.launch({ executablePath: exe })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
await p.goto(url, { waitUntil: 'networkidle' })
await enterChaos(p)
await p.waitForTimeout(2500)
await p.getByRole('button', { name: /Do not press/ }).click()
await p.waitForTimeout(5500)
await p.screenshot({ path: 'tests/out/chaos-collapse.png' })
console.log('notice visible:', await p.locator('.pile-note').count())
await p.locator('.pile-x').click()
await p.waitForTimeout(4200)
const stuck = await p.evaluate(() => [...document.querySelectorAll('main .card')].some((e) => e.style.transform && e.style.transform !== 'none'))
console.log('elements still transformed after restore:', stuck, 'body overflow:', await p.evaluate(() => document.body.style.overflow || 'ok'))
// Esc returns to Calm
await p.keyboard.press('Escape')
await p.waitForTimeout(500)
console.log('mode after Esc:', await p.evaluate(() => document.documentElement.dataset.mode))
// barrel roll typing in chaos
await enterChaos(p)
await p.waitForTimeout(2200)
await p.keyboard.type('roll')
await p.waitForTimeout(400)
await p.screenshot({ path: 'tests/out/chaos-roll.png' })
console.log(errs.length ? 'ERRORS ' + errs.join('|') : 'no errors')
await b.close()
