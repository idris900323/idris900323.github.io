// Cross-browser smoke: Chromium, Firefox, WebKit. Loads the page, scrolls, presses CHAOS and Restore, switches language.
import { enterChaos } from './enter-chaos.mjs'
import { chromium, firefox, webkit } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:4173/'
let failed = 0
for (const [name, bt, opts] of [['chromium', chromium, { executablePath: process.env.CHROME || undefined }], ['firefox', firefox, {}], ['webkit', webkit, {}]]) {
  const errs = []
  try {
    const b = await bt.launch(opts)
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
    await p.goto(url, { waitUntil: 'networkidle' })
    const h = await p.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y < Math.min(h, 14000); y += 900) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(120) }
    await p.evaluate(() => scrollTo(0, 0))
    await enterChaos(p)
    await p.waitForTimeout(2200)
    const mode = await p.evaluate(() => document.documentElement.dataset.mode)
    await p.getByRole('button', { name: /Restore order/ }).first().click()
    await p.getByRole('button', { name: /日本語/ }).first().click()
    await p.waitForTimeout(500)
    const lang = await p.evaluate(() => document.documentElement.lang)
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
    console.log(name, 'mode', mode, 'lang', lang, 'overflow', overflow, errs.length ? 'ERRORS ' + errs.slice(0, 3).join('|') : 'no errors')
    if (errs.length || mode !== 'chaos' || lang !== 'ja' || overflow) failed++
    await b.close()
  } catch (e) { console.log(name, 'FAILED', String(e).slice(0, 200)); failed++ }
}
process.exit(failed ? 1 : 0)
