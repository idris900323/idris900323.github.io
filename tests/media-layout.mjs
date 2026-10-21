// Screenshots of project headers (text + photos) at desktop and phone widths.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
for (const [name, vp] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp })
  await p.goto(process.argv[2] ?? 'http://localhost:5173/', { waitUntil: 'networkidle' })
  for (const id of ['vehicles', 'cpu8', 'gait']) {
    for (let k = 0; k < 3; k++) { await p.evaluate((i) => { const e = document.getElementById(i); if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - 70) }, id); await p.waitForTimeout(600) }
    await p.screenshot({ path: `tests/out/layout-${name}-${id}.png` })
  }
  await p.close()
}
await b.close()
