import { enterChaos } from './enter-chaos.mjs'
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
await p.addInitScript(() => { sessionStorage.setItem('rolled', '1'); Math.random = () => 0.99 })
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await enterChaos(p)
await p.waitForTimeout(2500)
await p.getByRole('button', { name: /Do not press/ }).click()
for (const [i, ms] of [[1, 1500], [2, 2500], [3, 5000]]) { await p.waitForTimeout(ms); await p.screenshot({ path: `tests/out/grav-${i}.png` }); console.log(i, await p.evaluate(() => Math.round(scrollY))) }
await b.close()
