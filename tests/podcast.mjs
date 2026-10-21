// The emcee and podcast cards link to YouTube (new tab) and load nothing from YouTube on page load.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
const reqs = []
p.on('request', (r) => { if (/youtube|ytimg/.test(r.url())) reqs.push(r.url()) })
await p.goto(process.argv[2] ?? 'http://localhost:4173/', { waitUntil: 'networkidle' })
await p.getByRole('link', { name: /recording on YouTube/ }).scrollIntoViewIfNeeded()
await p.waitForTimeout(500)
await p.screenshot({ path: 'tests/out/podcast.png' })
const hrefs = await p.locator('a[href*="youtu"]').evaluateAll((a) => a.map((x) => x.href + '|' + x.target))
const ok = reqs.length === 0 && hrefs.length === 2 && hrefs.every((h) => h.endsWith('|_blank')) && hrefs.some((h) => h.includes('mXb8H1wp9NQ') && !h.includes('t=')) && hrefs.some((h) => h.includes('Q-IukgMDHOI'))
console.log(ok ? 'ok  ' : 'FAIL', JSON.stringify({ reqs: reqs.length, hrefs }))
await b.close(); process.exit(ok ? 0 : 1)
