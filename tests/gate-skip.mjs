// Typing "idris" during the warning skips the crawl and every question and goes straight into Chaos.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
let bad = 0
for (const where of ['on the notice', 'during the crawl', 'during the questions']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(process.argv[2] ?? 'http://localhost:4173/', { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: /CHAOS/ }).click()
  if (where !== 'on the notice') await p.getByRole('button', { name: 'Proceed', exact: true }).click()
  await p.waitForTimeout(600)
  if (where === 'during the questions') {
    await p.evaluate(() => document.querySelector('.crawl-inner').dispatchEvent(new Event('animationend', { bubbles: true })))
    await p.getByRole('button', { name: 'OK', exact: true }).click()
  }
  await p.keyboard.type('idris', { delay: 40 })
  await p.waitForTimeout(500)
  const gate = await p.locator('.gate').count()
  const mode = await p.evaluate(() => document.documentElement.dataset.mode)
  const ok = gate === 0 && mode === 'chaos' && !errs.length
  if (!ok) bad++
  console.log(ok ? 'ok  ' : 'FAIL', where, JSON.stringify({ gate, mode }), errs.join('|'))
  await p.close()
}
await b.close(); process.exit(bad ? 1 : 0)
