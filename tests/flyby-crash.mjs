// Clicking a flying rocket makes it explode and a guilt-trip comment appears.
import { enterChaos } from './enter-chaos.mjs'
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript(() => { Math.random = () => 0.01 })
await p.goto(process.argv[2] ?? 'http://localhost:5173/', { waitUntil: 'networkidle' })
await enterChaos(p)
await p.waitForSelector('.flyby', { timeout: 20000 })
await p.evaluate(() => document.querySelector('.flyby').click())
await p.waitForTimeout(1600)
const boom = await p.locator('.boom').count()
await p.screenshot({ path: 'tests/out/boom.png' })
const toast = await p.locator('.toast').innerText().catch(() => '')
console.log(boom === 1 && toast.length > 20 ? 'ok  ' : 'FAIL', JSON.stringify({ boom, toast: toast.slice(0, 80) }), errs.join('|'))
await b.close()
process.exit(boom === 1 && toast.length > 20 && !errs.length ? 0 : 1)
