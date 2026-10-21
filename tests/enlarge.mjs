// Every simulation can be enlarged to a full-window overlay with nothing cut off, and closed with Esc.
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:5173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1366, height: 720 } })
const VIEWS = [[1366, 720], [1920, 930], [1280, 650]]
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto(url, { waitUntil: 'networkidle' })
let fails = 0
for (const [vw, vh] of VIEWS) for (const id of ['pid', 'swarm', 'net', 'gait', 'cpu8', 'pipe', 'vehicles']) {
  await p.setViewportSize({ width: vw, height: vh })
  await p.evaluate((i) => { document.getElementById(i)?.scrollIntoView(); scrollBy(0, 500) }, id)
  await p.waitForTimeout(1500); await p.evaluate((i) => { document.querySelector(`#${i} .sim`)?.scrollIntoView({ block: 'center' }) }, id); await p.waitForTimeout(600)
  const btn = p.locator(`#${id} .sim-enlarge`).first()
  if (!(await btn.count())) { console.log('SKIP', id); continue }
  await btn.click()
  await p.waitForTimeout(500)
  const m = await p.evaluate(() => {
    const f = document.querySelector('.sim-full')
    if (!f) return null
    const r = f.getBoundingClientRect()
    const cs = [...f.querySelectorAll('canvas')].map((c) => c.getBoundingClientRect())
    const bottom = Math.max(...[...f.querySelectorAll('canvas, .sim-screen, .sim-bar, .sim-readout, .sim-caption')].filter((c) => !c.closest('details:not([open])')).map((c) => Math.round(c.getBoundingClientRect().bottom)))
    return { bottom, vh: innerHeight, fw: Math.round(r.width), fh: Math.round(r.height), scrolls: f.scrollHeight > f.clientHeight + 2, canvasMax: Math.max(0, ...cs.map((c) => Math.round(c.height))), canvasW: Math.max(0, ...cs.map((c) => Math.round(c.width))) }
  })
  const ok = !!m && !m.scrolls && m.bottom <= m.vh + 1
  if (!ok) fails++
  console.log(ok ? 'ok  ' : 'FAIL', vw + 'x' + vh, id, JSON.stringify(m))
  if (id === 'pid' || id === 'gait') await p.screenshot({ path: `tests/out/enlarged-${id}.png` })
  await p.keyboard.press('Escape')
  await p.waitForTimeout(200)
  if (await p.locator('.sim-full').count()) { fails++; console.log('FAIL esc did not close', id) }
}
if (errs.length) { fails++; console.log(errs.join('\n')) }
await b.close()
process.exit(fails ? 1 : 0)
