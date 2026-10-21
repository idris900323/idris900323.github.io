// The achievement count survives leaving Chaos (or being evicted by the robot) and a page reload.
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage()
let fails = 0
const check = (c, m) => { if (!c) { fails++; console.log('FAIL', m) } else console.log('ok  ', m) }
const count = async () => { const t = await p.locator('.ach .btn').first().textContent().catch(() => null); const m = t && t.match(/(\d+)\/(\d+)/); return m ? Number(m[1]) : 0 }
await p.goto(url + '?lang=en', { waitUntil: 'networkidle' })
await enterChaos(p)
await p.waitForTimeout(800)
await p.keyboard.type('roll'); await p.waitForTimeout(1500)
const first = await count()
check(first >= 1, `an achievement was unlocked (${first})`)
// leave Chaos with the header button, come back
await p.getByRole('button', { name: /Back to Calm|Calm/i }).first().click().catch(async () => { await p.keyboard.press('Escape') })
await p.waitForTimeout(600)
check(await p.evaluate(() => document.documentElement.dataset.mode) === 'calm', 'back in Calm')
await enterChaos(p); await p.waitForTimeout(800)
check((await count()) >= first, `count kept after leaving and re-entering (${await count()})`)
await p.reload({ waitUntil: 'networkidle' })
await enterChaos(p); await p.waitForTimeout(800)
check((await count()) >= first, `count kept after a reload (${await count()})`)
await b.close(); process.exit(fails ? 1 : 0)
