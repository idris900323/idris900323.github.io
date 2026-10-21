// The Duolingo and LeetCode links: new tab, noopener, at least 44 px tall, with "as of" next to the numbers; Contact has no such links.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
let bad = 0
for (const lang of ['en', 'ja']) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
  await p.goto(`${process.argv[2] ?? 'http://localhost:4173/'}?lang=${lang}`, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.getElementById('japan').scrollIntoView({ behavior: 'instant' }))
  await p.waitForTimeout(900)
  const r = await p.evaluate(() => {
    const links = [...document.querySelectorAll('#japan a[href]')].map((a) => ({ href: a.href, target: a.target, rel: a.rel, h: Math.round(a.getBoundingClientRect().height) }))
    const asOf = (document.getElementById('japan').innerText.match(/as of 2026|2026-\d\d-\d\d\s*時点/g) || []).length
    const contact = [...document.querySelectorAll('#contact a[href]')].map((a) => a.href)
    return { links, asOf, contact }
  })
  const ok = r.links.length === 2 && r.links.some((l) => l.href === 'https://leetcode.com/u/D8V8Bftca1/') && r.links.some((l) => l.href === 'https://www.duolingo.com/profile/idris123_456-789')
    && r.links.every((l) => l.target === '_blank' && /noopener/.test(l.rel) && /noreferrer/.test(l.rel) && l.h >= 44) && r.asOf === 2 && !r.contact.some((h) => /leetcode|duolingo/.test(h))
  if (!ok) bad++
  console.log(ok ? 'ok  ' : 'FAIL', lang, JSON.stringify(r))
  await p.close()
}
await b.close(); process.exit(bad ? 1 : 0)
