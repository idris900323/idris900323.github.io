// Chaos extras: omae overlay, text shatter, dodging button, toast survives scrolling and replays when scrolling up.
import { enterChaos } from './enter-chaos.mjs'
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:5173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript(() => { Math.random = () => 0.01 })
await p.goto(url, { waitUntil: 'networkidle' })
let fails = 0
const check = (name, ok) => { if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', name) }
await enterChaos(p)
await p.waitForTimeout(2200)

// omae
await p.keyboard.type('omae')
await p.waitForSelector('.omae-line', { timeout: 2000 }).catch(() => {})
check('omae line', (await p.locator('.omae-line').count()) === 1)
await p.waitForSelector('.omae-nani', { timeout: 3000 }).catch(() => {})
check('nani', (await p.locator('.omae-nani').count()) === 1)
await p.screenshot({ path: 'tests/out/omae.png' })
await p.waitForTimeout(2800)
check('omae gone', (await p.locator('.omae').count()) === 0)

// shatter
const para = p.locator('#hl ~ * p, article.card p').first()
await para.scrollIntoViewIfNeeded()
await para.click()
await p.waitForTimeout(300)
check('text shatters', (await p.locator('.shard').count()) > 3)
await p.waitForTimeout(3600)
check('text re-forms', (await p.locator('.shard').count()) === 0)

// dodge
const chip = p.locator('main article.card a.btn').first()
await chip.scrollIntoViewIfNeeded()
const before = await chip.boundingBox()
await chip.hover({ force: true })
await p.waitForTimeout(450)
const after = await chip.boundingBox()
check('chip dodges', Math.abs(after.x - before.x) > 20 || Math.abs(after.y - before.y) > 20)

// toast persists over scroll and replays when scrolling up
await p.evaluate(() => scrollTo(0, 3000))
await p.keyboard.press('r'); await p.keyboard.type('oll')
await p.waitForSelector('.toast', { timeout: 3000 }).catch(() => {})
await p.mouse.wheel(0, 500); await p.waitForTimeout(300)
check('toast survives scrolling', (await p.locator('.toast').count()) === 1)

check('no page errors', !errs.length)
if (errs.length) console.log(errs.join('\n'))
await b.close()
process.exit(fails ? 1 : 0)
