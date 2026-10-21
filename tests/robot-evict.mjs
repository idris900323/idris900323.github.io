// Poking the pet robot: a remark per click, anger grows, then the site explodes and drops back to Calm with a notice.
import { enterChaos } from './enter-chaos.mjs'
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript(() => { sessionStorage.setItem('rolled', '1'); Math.random = () => 0.99 })
await p.goto(process.argv[2] ?? 'http://localhost:5173/', { waitUntil: 'networkidle' })
await enterChaos(p)
await p.waitForTimeout(2200)
await p.evaluate(() => document.querySelector('.scout-dock').click())
const first = await p.locator('.scout-dock .bubble').innerText()
for (let i = 0; i < 8; i++) await p.evaluate(() => document.querySelector('.scout-dock').click())
const mad = await p.evaluate(() => getComputedStyle(document.querySelector('.scout-dock')).getPropertyValue('--anger'))
for (let i = 0; i < 6; i++) await p.evaluate(() => document.querySelector('.scout-dock').click())
await p.evaluate(() => document.querySelector('.scout-dock').click()) // the 15th click
await p.waitForTimeout(400)
const boom = await p.locator('.boom').count()
await p.waitForSelector('.evicted', { timeout: 4000 }).catch(() => {})
const mode = await p.evaluate(() => document.documentElement.dataset.mode)
const note = await p.locator('.evicted').innerText().catch(() => '')
console.log(JSON.stringify({ first, mad, boom, mode, note }))
const ok = first === 'Hi.' && boom === 1 && mode === 'calm' && /evicted by Idris/.test(note) && !errs.length
console.log(ok ? 'ok  ' : 'FAIL', errs.join('|'))
await b.close()
process.exit(ok ? 0 : 1)
