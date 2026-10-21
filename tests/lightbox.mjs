// Clicking a gallery image opens a larger view: dialog, big image inside the window, arrows, Esc and X close, focus returns.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1366, height: 720 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto(process.argv[2] ?? 'http://localhost:4173/', { waitUntil: 'networkidle' })
let fails = 0
const check = (c, m) => { if (!c) { fails++; console.log('FAIL', m) } else console.log('ok  ', m) }
for (const idx of [0, 1]) {
  const gal = p.locator('.gallery:has(.spot-nav.next)').nth(idx)
  await gal.evaluate((e) => { const r = e.getBoundingClientRect(); scrollTo({ top: scrollY + r.top - 80, behavior: 'instant' }) })
  await p.waitForTimeout(300)
  const top = () => gal.evaluate((e) => Math.round(e.getBoundingClientRect().top))
  await gal.locator('.spot-open').scrollIntoViewIfNeeded(); await p.waitForTimeout(200)
  const y0 = await top()
  await gal.locator('.spot-open').click()
  await p.waitForSelector('.lightbox')
  await p.waitForTimeout(300)
  const m = await p.evaluate(() => {
    const d = document.querySelector('.lightbox'), im = d.querySelector('img').getBoundingClientRect()
    return { modal: d.getAttribute('aria-modal'), top: im.top, bottom: im.bottom, w: Math.round(im.width), h: Math.round(im.height), vh: innerHeight, focus: document.activeElement?.className, sfx: getComputedStyle(document.querySelector('.sfx-btn') ?? document.body).display }
  })
  check(m.modal === 'true' && m.top >= 0 && m.bottom <= m.vh, `gallery ${idx}: image inside window ${JSON.stringify(m)}`)
  check(String(m.focus).includes('lb-close'), `gallery ${idx}: focus on close button`)
  const first = await p.locator('.lightbox img').getAttribute('src')
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150)
  check((await p.locator('.lightbox img').getAttribute('src')) !== first, `gallery ${idx}: arrow key moves on`)
  await p.locator('.lightbox .spot-nav.prev').click(); await p.waitForTimeout(150)
  check((await p.locator('.lightbox img').getAttribute('src')) === first, `gallery ${idx}: previous button returns`)
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  check((await p.locator('.lightbox').count()) === 0, `gallery ${idx}: Esc closes`)
  check(Math.abs((await top()) - y0) < 4, `gallery ${idx}: gallery stays where it was`)
  await gal.locator('.spot-open').click(); await p.waitForSelector('.lightbox')
  await p.locator('.lb-close').click(); await p.waitForTimeout(150)
  check((await p.locator('.lightbox').count()) === 0, `gallery ${idx}: X closes`)
  await gal.locator('.spot-open').click(); await p.waitForSelector('.lightbox')
  await p.mouse.click(8, 400); await p.waitForTimeout(150)
  check((await p.locator('.lightbox').count()) === 0, `gallery ${idx}: scrim click closes`)
}
check(errs.length === 0, 'no page errors ' + errs.join(';'))
await p.setViewportSize({ width: 390, height: 780 })
const g = p.locator('.gallery').first()
await g.evaluate((e) => { const r = e.getBoundingClientRect(); scrollTo({ top: scrollY + r.top - 80, behavior: 'instant' }) })
await g.locator('.spot-open').click(); await p.waitForSelector('.lightbox'); await p.waitForTimeout(250)
const mm = await p.evaluate(() => { const r = document.querySelector('.lightbox img').getBoundingClientRect(); return { l: r.left, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight } })
check(mm.l >= 0 && mm.r <= mm.vw && mm.b <= mm.vh, 'phone: image inside window ' + JSON.stringify(mm))
await p.screenshot({ path: 'tests/out/lightbox-phone.png' })
await b.close(); process.exit(fails ? 1 : 0)
