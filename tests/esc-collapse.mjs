// Regression: pressing Esc while the Moon pile is active must restore scrolling and tidy the page.
import { enterChaos } from './enter-chaos.mjs'
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
await p.goto(url, { waitUntil: 'networkidle' })
await enterChaos(p)
await p.waitForTimeout(2500)
await p.getByRole('button', { name: /Do not press/ }).click()
await p.waitForTimeout(1500)
await p.keyboard.press('Escape')
await p.waitForTimeout(1500)
const r = await p.evaluate(() => ({ overflow: document.body.style.overflow, stuck: [...document.querySelectorAll('main .card, main h2')].some((e) => e.style.transform && e.style.transform !== 'none'), mode: document.documentElement.dataset.mode }))
console.log(JSON.stringify(r), errs.length ? 'ERRORS ' + errs.join('|') : 'no errors')
await b.close()
process.exit(r.overflow || r.stuck || errs.length ? 1 : 0)
