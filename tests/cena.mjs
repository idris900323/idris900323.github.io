// The jumpscare: flashing text first, then the embedded theme with a close button.
import { enterChaos } from './enter-chaos.mjs'
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript(() => { Math.random = () => 0.01; sessionStorage.setItem('rolled', '1') })
await p.goto(process.argv[2] ?? 'http://localhost:5173/', { waitUntil: 'networkidle' })
await enterChaos(p)
await p.waitForTimeout(2000)
for (let i = 0; i < 400; i++) { await p.mouse.wheel(0, 500); await p.waitForTimeout(40); if (await p.locator('.cena').count()) break }
const shown = await p.locator('.cena').count()
await p.waitForTimeout(1300)
const name = await p.locator('.cena-b').count()
await p.screenshot({ path: 'tests/out/cena.png' })
await p.waitForSelector('.cena-video', { timeout: 5000 }).catch(() => {})
const video = await p.locator('.cena-video').count()
await p.evaluate(() => document.querySelector('.cena-x')?.click())
await p.waitForTimeout(200)
const closed = (await p.locator('.cena').count()) === 0
const ok = shown === 1 && name === 1 && video === 1 && closed && !errs.length
console.log(ok ? 'ok  ' : 'FAIL', JSON.stringify({ shown, name, video, closed }), errs.join('|'))
await b.close()
process.exit(ok ? 0 : 1)
