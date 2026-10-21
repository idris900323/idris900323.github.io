// Chaos: shake + rick roll fires after enough scrolling and can be dismissed; rail renders; swarm tabs work.
import { enterChaos } from './enter-chaos.mjs'
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:5173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript(() => { const r = Math.random; void r; Math.random = () => 0.01 }) // every draw is low, so the roll happens
await p.goto(url, { waitUntil: 'networkidle' })
let fails = 0
const check = (name, ok) => { if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', name) }

// swarm tabs
await p.locator('#swarm').scrollIntoViewIfNeeded(); await p.mouse.wheel(0, 900); await p.waitForTimeout(1500)
const tabs = await p.getByRole('button', { name: /^[123]\s+(One robot|Coordination|Docking)/ }).count()
check('swarm wrapper has 3 parts (' + tabs + ')', tabs === 3)

// chaos rick roll
await enterChaos(p)
await p.waitForTimeout(2200)
for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, 400); await p.waitForTimeout(40); if (await p.locator('html.shake').count()) break }
const shook = await p.locator('html.shake').count()
check('page shakes', shook === 1)
await p.waitForSelector('.rick', { timeout: 6000 }).catch(() => {})
check('rick overlay appears', (await p.locator('.rick').count()) === 1)
check('rail present', (await p.locator('.rail-rocket').count()) === 1)
await p.screenshot({ path: 'tests/out/rick.png' })
await p.evaluate(() => document.querySelector('.rick-x').click())
check('rick dismissed', (await p.locator('.rick').count()) === 0)
check('no page errors', !errs.length)
if (errs.length) console.log(errs.join('\n'))
await b.close()
process.exit(fails ? 1 : 0)
