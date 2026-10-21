// Every Chaos gag, one by one, in a fresh page each: does it fire, look right, and let the reader out?
// Usage: node tests/gags-all.mjs [url]
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
let fails = 0
const out = (ok, m) => { if (!ok) fails++; console.log(ok ? 'ok  ' : 'FAIL', m) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** a fresh Chaos page; `seed` pins Math.random, `skip` marks once-per-session gags as already seen so they do not interfere */
async function fresh({ w = 1280, h = 800, rand, skip = ['rolled', 'cena', 'cookie'] } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.addInitScript(([s, r]) => { for (const k of s) { try { sessionStorage.setItem(k, '1') } catch { /* ignore */ } } if (r !== undefined) { window.__rand = Math.random; Math.random = () => r } }, [skip, rand])
  await p.goto(url + '?lang=en', { waitUntil: 'networkidle' })
  await enterChaos(p)
  await sleep(1500)
  p.errs = errs
  return p
}
const toasts = (p) => p.locator('.toast').allInnerTexts()
const scrollToId = (p, id, off = 60) => p.evaluate(([i, o]) => { const e = document.getElementById(i); scrollTo({ top: e.getBoundingClientRect().top + scrollY - o, behavior: 'instant' }) }, [id, off])

// 1. comments close with an X; click stamps rotate their words
{
  const p = await fresh({ rand: 0.99 })
  await scrollToId(p, 'pid'); await sleep(5000)
  const t = await toasts(p)
  out(t.length === 1, 'section comment appears after settling: ' + JSON.stringify(t))
  await p.locator('.toast-x').click()
  out((await p.locator('.toast').count()) === 0, 'comment closes with its X')
  // click stamps: three clicks on empty space
  const words = []
  for (let i = 0; i < 3; i++) { await p.mouse.click(30 + i * 5, 400); await sleep(560); words.push((await p.locator('.stamp').allInnerTexts())[0]) }
  out(new Set(words).size >= 2, 'click stamps rotate: ' + words.join(', '))
  out(p.errs.length === 0, 'no page errors ' + p.errs.join(';'))
  await p.context().close()
}

// 2. section comment does NOT come while still scrolling
{
  const p = await fresh({ rand: 0.99 })
  for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 260); await sleep(250) }
  out((await toasts(p)).filter((t) => /servo|leader|space junk/i.test(t)).length === 0, 'no section comment while the reader is still scrolling')
  await p.context().close()
}

// 3. John Cena: text, no synthesised sting, X runs for 40 s, then stands still; Esc always closes
{
  const p = await fresh({ rand: 0.01, skip: ['rolled', 'cookie'] })
  let shown = false
  for (let i = 0; i < 120 && !shown; i++) { await p.mouse.wheel(0, 500); await sleep(50); shown = (await p.locator('.cena').count()) > 0 }
  out(shown, 'cena overlay appears')
  await p.waitForSelector('.cena-x', { timeout: 9000 }).catch(() => {})
  await p.evaluate(() => { if (window.__rand) Math.random = window.__rand })
  const hasVideo = (await p.locator('.cena-video').count()) === 1
  out(hasVideo, 'theme video embedded')
  const pos = async () => { const r = await p.locator('.cena-x').boundingBox(); return r ? [Math.round(r.x), Math.round(r.y)] : null }
  let moved = false
  for (let i = 0; i < 6 && !moved; i++) { const c = await pos(); await p.mouse.move(c[0] + 24, c[1] + 24); await sleep(250); const d = await pos(); moved = Math.abs(d[0] - c[0]) + Math.abs(d[1] - c[1]) > 40 }
  out(moved, 'the X runs away from the pointer')
  await sleep(20000)
  const c1 = await pos(); await p.mouse.move(c1[0] + 24, c1[1] + 24); await sleep(400)
  const d1 = await pos()
  out(Math.abs(d1[0] - c1[0]) + Math.abs(d1[1] - c1[1]) > 40, 'the cena X is still running after 20 s')
  await sleep(21000)
  const c = await pos(); await p.mouse.move(c[0] + 24, c[1] + 24); await sleep(400)
  const d = await pos()
  out(Math.abs(d[0] - c[0]) + Math.abs(d[1] - c[1]) < 4, 'after 40 s the X stands still')
  await p.locator('.cena-x').click()
  out((await p.locator('.cena').count()) === 0, 'the X closes it')
  await p.context().close()
}

// 5. rick roll: X runs for 40 seconds, then holds still; Esc always closes
{
  const p = await fresh({ rand: 0.01, skip: ['cena', 'cookie'] })
  for (let i = 0; i < 80 && !(await p.locator('.rick').count()); i++) { await p.mouse.wheel(0, 500); await sleep(60) }
  await p.waitForSelector('.rick-x', { timeout: 8000 }).catch(() => {})
  await p.evaluate(() => { if (window.__rand) Math.random = window.__rand }) // the X picks real random spots from here on
  out((await p.locator('.rick-x').count()) === 1, 'rick roll appears')
  const pos = async () => { const r = await p.locator('.rick-x').boundingBox(); return r ? [Math.round(r.x), Math.round(r.y)] : null }
  let moved = false
  for (let i = 0; i < 6 && !moved; i++) { const c = await pos(); await p.mouse.move(c[0] + 24, c[1] + 24); await sleep(250); const d = await pos(); moved = Math.abs(d[0] - c[0]) + Math.abs(d[1] - c[1]) > 40 }
  out(moved, 'rick X runs away from the pointer')
  await sleep(21000)
  const c0 = await pos(); await p.mouse.move(c0[0] + 24, c0[1] + 24); await sleep(400)
  const d0 = await pos()
  out(Math.abs(d0[0] - c0[0]) + Math.abs(d0[1] - c0[1]) > 40, 'rick X is still running after 20 s')
  await sleep(21000)
  const c = await pos(); await p.mouse.move(c[0] + 24, c[1] + 24); await sleep(400)
  const d = await pos()
  out(Math.abs(d[0] - c[0]) + Math.abs(d[1] - c[1]) < 4, 'after 40 s the rick X stands still')
  await p.keyboard.press('Escape'); await sleep(300)
  out((await p.locator('.rick').count()) === 0, 'Esc closes the rick roll')
  await p.context().close()
}

// 6. cookie banner: appears, is eaten bite by bite, leaves; the Eat it button works
{
  const p = await fresh({ rand: 0.99, skip: ['rolled', 'cena'] })
  await p.waitForSelector('.cookie', { timeout: 20000 }).catch(() => {})
  out((await p.locator('.cookie').count()) === 1, 'cookie banner appears')
  await sleep(4000)
  const cls = await p.evaluate(() => document.querySelector('.cookie-pic')?.className ?? '')
  out(/bites-[2-9]/.test(cls), 'the cookie is being eaten (' + cls + ')')
  await sleep(6500)
  out((await p.locator('.cookie').count()) === 0, 'the banner leaves once the cookie is gone')
  await p.context().close()
}

// 7. typed gags: roll (barrel roll), omae
{
  const p = await fresh({ rand: 0.99 })
  for (let n = 1; n <= 3; n++) {
    await p.keyboard.type('roll'); await sleep(500)
    out(await p.evaluate(() => document.documentElement.classList.contains('rolling')), `typing roll spins the page (time ${n})`)
    await sleep(2200)
  }
  for (let n = 1; n <= 3; n++) {
    await p.keyboard.type('omae'); await sleep(1200)
    out((await p.locator('.omae').count()) === 1, `typing omae shows the verdict (time ${n})`)
    await sleep(3600)
    out((await p.locator('.omae').count()) === 0, `the omae screen goes away by itself (time ${n})`)
  }
  for (let n = 1; n <= 2; n++) {
    await p.keyboard.type('cookie'); await sleep(500)
    out((await p.locator('.cookie').count()) === 1, `typing cookie brings the cookie banner (time ${n})`)
    await p.getByRole('button', { name: 'Eat it' }).click(); await sleep(4800)
    out((await p.locator('.cookie').count()) === 0 && (await p.locator('.cookie-storm').count()) === 0, `Eat it fills the screen with cookies, then they clear (time ${n})`)
  }
  out(p.errs.length === 0, 'no page errors ' + p.errs.join(';'))
  await p.context().close()
}

// 8. moon three times: gravity, upward gravity, then the song; the notice always shows and closing it restores slowly
{
  const p = await fresh({ rand: 0.99 })
  const press = async () => { await p.getByRole('button', { name: /Do not press/ }).click(); await sleep(8000) }
  await press()
  out((await p.locator('.pile-note').count()) === 1, 'gravity: the notice is on screen')
  await p.mouse.click(700, 300); await p.mouse.click(300, 500); await sleep(500)
  out((await p.locator('.toast, .stamp, .cookie').count()) === 0, 'gravity: no comments, stamps or banners pop up on top')
  await p.locator('.pile-x').click()
  await sleep(1500)
  out((await p.locator('.moon').count()) === 0, 'no second press while the page is still being put back')
  const mid = await p.evaluate(() => scrollY)
  out((await p.locator('.toast, .stamp, .cookie').count()) === 0, 'while the page is being put back: still no comments')
  await sleep(3000)
  out((await p.evaluate(() => document.documentElement.classList.contains('all-visible'))), 'the restore is still going after 4.5 s (slow)')
  const wait1 = await p.locator('.wait-note').innerText().catch(() => '')
  out(/Yes, you have to wait/.test(wait1) && /because you broke it/.test(wait1) && /do not do it again/i.test(wait1), 'the wait notice is up: ' + wait1.replace(/\s+/g, ' '))
  await sleep(7000)
  const wait2 = await p.locator('.wait-note strong').innerText().catch(() => '')
  out(Number(wait2) < 0, 'the countdown has passed zero (' + wait2 + ')')
  const blank = await p.locator('.blank-site').count()
  out(blank === 1, 'the page is blank while it is being fixed')
  await sleep(10000)
  out(!(await p.evaluate(() => document.documentElement.classList.contains('all-visible'))) && (await p.locator('.moon').count()) === 1 && (await p.locator('.blank-site').count()) === 0, 'restore finished: the page is back, the moon button is back')
  await press()
  out((await p.locator('.pile-note.angry').count()) === 1, 'second press: the angry notice shows')
  await p.locator('.pile-x').click(); await sleep(23000)
  await p.getByRole('button', { name: /Do not press/ }).click(); await sleep(1500)
  out((await p.locator('.rick').count()) === 1, 'third press: the song')
  void mid
  out(p.errs.length === 0, 'no page errors ' + p.errs.join(';'))
  await p.context().close()
}

// 9. gate: Proceed button after 10 s leads to the questions; mute is mentioned in the sound question
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
  const p = await ctx.newPage()
  await p.goto(url + '?lang=en', { waitUntil: 'networkidle' })
  await p.getByRole('button', { name: /CHAOS/ }).click()
  await p.getByRole('button', { name: 'Proceed', exact: true }).click()
  await sleep(9000)
  out((await p.getByRole('button', { name: 'Proceed', exact: true }).count()) === 0, 'no skip button before 10 s')
  await sleep(2500)
  await p.getByRole('button', { name: 'Proceed', exact: true }).click()
  out((await p.locator('.gate-card').count()) === 1, 'the skip button goes to the questions')
  for (let i = 0; i < 4; i++) { await p.locator('.gate-card .chaos-btn').click(); await sleep(150) }
  const q = await p.locator('.gate-card h2').innerText()
  out(/mute button/i.test(q), 'the sound question mentions the mute button: ' + q)
  await ctx.close()
}

await b.close()
console.log(fails ? `\n${fails} FAILED` : '\nall gags ok')
process.exit(fails ? 1 : 0)
