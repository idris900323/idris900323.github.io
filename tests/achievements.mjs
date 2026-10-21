// Achievements start again on a refresh and after a normal exit; they are kept only when the robot evicts you.
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
await p.addInitScript(() => { try { sessionStorage.setItem('rolled', '1'); sessionStorage.setItem('cena', '1'); sessionStorage.setItem('cookie', '1') } catch { /* ignore */ } })
let fails = 0
const check = (c, m) => { if (!c) { fails++; console.log('FAIL', m) } else console.log('ok  ', m) }
const count = async () => { const t = await p.locator('.ach .btn').first().textContent().catch(() => null); const m = t && t.match(/(\d+)\/(\d+)/); return m ? Number(m[1]) : 0 }
await p.goto(url + '?lang=en', { waitUntil: 'networkidle' })
await enterChaos(p); await p.waitForTimeout(1500)
await p.keyboard.type('roll'); await p.waitForTimeout(1200)
await p.keyboard.type('omae'); await p.waitForTimeout(1200)
const first = await count()
check(first >= 2, `two achievements unlocked (${first})`)
// 1. evicted by the robot: the count is kept
for (let i = 0; i < 16; i++) await p.evaluate(() => document.querySelector('.scout-dock')?.click())
await p.waitForSelector('.evicted', { timeout: 6000 })
await enterChaos(p); await p.waitForTimeout(1200)
const afterEvict = await count()
check(afterEvict >= first, `kept after the eviction (${afterEvict}, was ${first})`)
// 2. normal exit with Restore order: the count starts again
await p.getByRole('button', { name: /Restore order/ }).click(); await p.waitForTimeout(600)
await enterChaos(p); await p.waitForTimeout(1200)
check((await count()) === 0, `reset after a normal exit (${await count()})`)
// 3. refresh: starts again
await p.keyboard.type('roll'); await p.waitForTimeout(1200)
check((await count()) >= 1, 'one unlocked again')
await p.reload({ waitUntil: 'networkidle' })
await enterChaos(p); await p.waitForTimeout(1200)
check((await count()) === 0, `reset after a refresh (${await count()})`)
await b.close(); process.exit(fails ? 1 : 0)
