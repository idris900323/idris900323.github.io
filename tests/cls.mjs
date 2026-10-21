// Layout shift while reading: scroll with the wheel at a normal pace and report the biggest shifts and what moved.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1366, height: 768 } })
await p.addInitScript(() => {
  window.__shifts = []; window.__cls = 0
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) { window.__cls += e.value; window.__shifts.push({ v: +e.value.toFixed(3), at: Math.round(scrollY), nodes: (e.sources || []).slice(0, 2).map((s) => (s.node?.className?.toString().slice(0, 30) || s.node?.nodeName || '?') + '#' + (s.node?.id || '')) }) } }).observe({ type: 'layout-shift', buffered: true })
})
await p.goto(process.argv[2] ?? 'http://localhost:4173/', { waitUntil: 'networkidle' })
for (let i = 0; i < 170; i++) { await p.mouse.wheel(0, 180); await p.waitForTimeout(70) }
const r = await p.evaluate(() => ({ cls: +window.__cls.toFixed(3), top: window.__shifts.sort((a, c) => c.v - a.v).slice(0, 8) }))
console.log(JSON.stringify(r, null, 1))
const ok = r.cls < 0.1
console.log(ok ? 'ok  ' : 'FAIL', 'CLS while reading', r.cls)
await b.close(); process.exit(ok ? 0 : 1)
