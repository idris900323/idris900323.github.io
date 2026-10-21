// Screenshots + console-error check against the running dev/preview server.
// Usage: node tests/shots.mjs [url] [outDir]   (set CHROME to a chromium executable if the bundled one is missing)
import { enterChaos } from './enter-chaos.mjs'
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const url = process.argv[2] ?? 'http://localhost:5173/'
const out = process.argv[3] ?? 'tests/out'
mkdirSync(out, { recursive: true })
const exe = process.env.CHROME || undefined
const browser = await chromium.launch({ executablePath: exe })
const errors = []

for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport: vp })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror ${e.message}`))
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${out}/${name}-top.png` })
  // scroll through so lazy sims mount, then take a full-page shot
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += 700) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(250) }
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/${name}-full.png`, fullPage: true })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
  if (overflow) errors.push(`[${name}] horizontal overflow`)
  await ctx.close()
}

// chaos + japanese on desktop
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[chaos] ${m.text()}`) })
page.on('pageerror', (e) => errors.push(`[chaos] pageerror ${e.message}`))
await page.goto(url, { waitUntil: 'networkidle' })
await enterChaos(page)
await page.waitForTimeout(3500)
await page.screenshot({ path: `${out}/chaos-top.png` })
await page.getByRole('button', { name: /Restore order/ }).first().click({ timeout: 8000 })
await page.waitForTimeout(600)
await page.getByRole('button', { name: /switch language|言語切替/ }).click()
await page.waitForTimeout(800)
await page.screenshot({ path: `${out}/ja-top.png` })
await browser.close()
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no console errors')
