// Break-test the whole page: five widths, both languages. Reports horizontal overflow, elements that run past the screen edge, and clipped text.
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
let bad = 0
for (const lang of ['en', 'ja']) for (const w of [320, 390, 768, 1024, 1366]) {
  const p = await b.newPage({ viewport: { width: w, height: 800 } })
  await p.goto(`${url}?lang=${lang}`, { waitUntil: 'networkidle' })
  const h = await p.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += 600) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(60) }
  await p.waitForTimeout(500)
  const r = await p.evaluate(() => {
    const vw = innerWidth
    const out = { docOverflow: document.documentElement.scrollWidth > vw + 1, past: [], clipped: [] }
    const label = (e) => (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : e.tagName.toLowerCase()) + ':' + (e.textContent || '').trim().slice(0, 28)
    for (const e of document.querySelectorAll('main *, header *')) {
      if (e.closest('.sr-only, nav, .rail, .chaos-layer, canvas, svg, video, .sim-screen, table')) continue
      const rc = e.getBoundingClientRect()
      if (rc.width === 0 || rc.height === 0) continue
      if (rc.right > vw + 1 || rc.left < -1) out.past.push(label(e))
      const cs = getComputedStyle(e)
      if (e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && /(hidden|clip)/.test(cs.overflowX) && e.children.length === 0) out.clipped.push(label(e))
    }
    out.past = [...new Set(out.past)].slice(0, 5); out.clipped = [...new Set(out.clipped)].slice(0, 5)
    return out
  })
  const ok = !r.docOverflow && !r.past.length && !r.clipped.length
  if (!ok) bad++
  console.log(ok ? 'ok  ' : 'FAIL', lang, w, ok ? '' : JSON.stringify(r))
  await p.close()
}
await b.close(); process.exit(bad ? 1 : 0)
