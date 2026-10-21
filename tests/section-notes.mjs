// A section comment appears only after the reader has settled in that section, not on arrival.
import { enterChaos } from './enter-chaos.mjs'
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
await p.addInitScript(() => { sessionStorage.setItem('rolled', '1'); Math.random = () => 0.99 })
await p.goto(process.argv[2] ?? 'http://localhost:5173/', { waitUntil: 'networkidle' })
await enterChaos(p)
await p.waitForTimeout(2000)
await p.evaluate(() => { const e = document.getElementById('pid'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 60) })
await p.waitForTimeout(600)
const early = (await p.locator('.toast').allInnerTexts()).filter((t) => /servo/i.test(t)).length
await p.waitForTimeout(4600)
const later = (await p.locator('.toast').allInnerTexts()).filter((t) => /servo/i.test(t)).length
const ok = early === 0 && later === 1
console.log(ok ? 'ok  ' : 'FAIL', JSON.stringify({ early, later }))
await b.close()
process.exit(ok ? 0 : 1)
