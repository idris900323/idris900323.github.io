import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1366, height: 720 } })
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
for (const id of process.argv.slice(2)) {
  await p.evaluate((i) => document.getElementById(i)?.scrollIntoView(), id); await p.waitForTimeout(2500)
  console.log(id, JSON.stringify(await p.evaluate((i) => {
    const f = document.querySelector(`#${i} .sim`), s = f.querySelector('.sim-screen')
    return { figH: Math.round(f.getBoundingClientRect().height), reserve: s.style.getPropertyValue('--reserve'), share: s.style.getPropertyValue('--share'), kids: [...f.children].map((c) => c.className + ':' + Math.round(c.getBoundingClientRect().height)), canv: [...f.querySelectorAll('canvas,svg')].map((c) => [c.tagName, Math.round(c.getBoundingClientRect().width), Math.round(c.getBoundingClientRect().height), c.style.getPropertyValue('--ar')]) }
  }, id)))
}
await b.close()
