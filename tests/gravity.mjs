// Gravity break: everything falls to the bottom of the page and the page scrolls to the floor; Restore order scrolls home.
import { enterChaos } from './enter-chaos.mjs'
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:5173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.addInitScript(() => { try { sessionStorage.setItem('rolled', '1') } catch { /* ignore */ } }) // the random rick roll would interrupt the moon test
await p.goto(url, { waitUntil: 'networkidle' })
await p.evaluate(() => scrollTo(0, 600))
await enterChaos(p)
await p.waitForTimeout(5000)
const start = await p.evaluate(() => Math.round(scrollY))
await p.getByRole('button', { name: /Do not press/ }).click()
await p.waitForTimeout(6500)
const y = await p.evaluate(() => ({ y: Math.round(scrollY), max: document.documentElement.scrollHeight - innerHeight }))
await p.screenshot({ path: 'tests/out/gravity-bottom.png' })
const note1 = await p.locator('.pile-note').innerText()
await p.locator('.pile-x').click()
await p.waitForTimeout(11000) // the page is put back slowly (nine seconds)
const back = await p.evaluate(() => Math.round(scrollY))
const maxBack = await p.evaluate(() => Math.round(document.documentElement.scrollHeight - innerHeight))
// second press: falls upward, page scrolls to the top
await p.getByRole('button', { name: /Do not press/ }).click()
await p.waitForTimeout(6500)
const up = await p.evaluate(() => Math.round(scrollY))
const angry = await p.locator('.pile-note.angry').count()
await p.locator('.pile-x').click()
await p.waitForTimeout(11000)
// third press: the song
await p.getByRole('button', { name: /Do not press/ }).click()
await p.waitForSelector('.rick iframe', { timeout: 3000 }).catch(() => {})
const song = await p.locator('.rick iframe').count()
const moonGone = await p.locator('.moon').count()
console.log(JSON.stringify({ ...y, start, back, up, song, moonGone, angry, note1: note1.slice(0, 24) }), errs.length ? 'ERRORS ' + errs.join('|') : 'no errors')
await b.close()
// the view settles on the densest part of the heap (in the lower half of a long page), never on empty sky
process.exit(y.y >= y.max * 0.4 && Math.abs(back - Math.min(start, maxBack)) < 60 && up < y.max * 0.5 && angry === 1 && /Now look at what you did/.test(note1) && song === 1 && !errs.length ? 0 : 1)
