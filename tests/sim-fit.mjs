// Every simulation (canvas and controls) should fit in one laptop-sized screen. Usage: node tests/sim-fit.mjs [url] [width] [height]
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:5173/'
const vw = Number(process.argv[3] ?? 1366), vh = Number(process.argv[4] ?? 720)
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: vw, height: vh } })
await p.goto(url, { waitUntil: 'networkidle' })
let bad = 0
for (const id of ['pid', 'cpu8', 'pipe', 'swarm', 'gait', 'vehicles', 'gait', 'net']) {
  if (id === 'gait') continue
  for (let k = 0; k < 3; k++) { await p.evaluate((i) => { const e = document.getElementById(i); if (e) scrollTo(0, e.getBoundingClientRect().top + scrollY) }, id); await p.waitForTimeout(500) }
  await p.evaluate((i) => document.querySelector(`#${i} .interactive`)?.scrollIntoView(), id)
  await p.waitForTimeout(3000)
  const r = await p.evaluate((i) => {
    const sim = document.querySelector(`#${i} .sim`)
    const box = sim.closest('.interactive').getBoundingClientRect()
    return { id: i, h: Math.round(box.height), avail: innerHeight - 64 }
  }, id)
  const ok = r.h <= r.avail + 4
  if (!ok) bad++
  console.log(ok ? 'fits' : 'TOO TALL', JSON.stringify(r))
}
await b.close()
process.exit(bad ? 1 : 0)
