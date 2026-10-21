// Layout matrix: many viewport sizes x both languages. Looks for horizontal overflow, elements poking past the window,
// clipped text, broken or tiny images, small touch targets, simulations or galleries cut off, and the lightbox / Enlarge views.
// Usage: node tests/layout-matrix.mjs [url] [chaos]
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:4173/'
const chaos = process.argv[3] === 'chaos'
const VIEWS = (process.env.VIEWS ? JSON.parse(process.env.VIEWS) : [[320, 568], [360, 740], [390, 844], [412, 915], [768, 1024], [1024, 768], [1280, 650], [1366, 768], [1440, 900], [1920, 1080], [2560, 1440]])
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const problems = []
const note = (k, m) => { problems.push(`${k}: ${m}`) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

for (const [w, h] of VIEWS) for (const lang of ['en', 'ja']) {
  const key = `${w}x${h} ${lang}${chaos ? ' chaos' : ''}`
  const touch = w < 800
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.addInitScript((l) => { try { localStorage.setItem('lang', l) } catch { /* ignore */ } }, lang)
  await p.goto(url + (url.includes('?') ? '&' : '?') + 'lang=' + (chaos ? 'en' : lang), { waitUntil: 'networkidle' })
  if (chaos) {
    const { enterChaos } = await import('./enter-chaos.mjs')
    await enterChaos(p)
    if (lang === 'ja') await p.getByRole('button', { name: '日本語' }).click()
    await sleep(500)
  }
  // let content-visibility sections render: walk down the page
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 40)) } scrollTo({ top: 0, behavior: 'instant' }) })
  await sleep(300)
  // Chaos may be shaking the page or showing an overlay right now: wait for it to settle before measuring
  await p.waitForFunction(() => !document.documentElement.classList.contains('shake') && !document.querySelector('.rick, .cena, .omae'), null, { timeout: 15000 }).catch(() => {})
  await sleep(300)
  const r = await p.evaluate(({ w, touch }) => {
    const out = { overflow: document.documentElement.scrollWidth - innerWidth, past: [], clipped: [], badImg: [], small: [], tiny: [] }
    const vis = (e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0 && !e.closest('[aria-hidden="true"], .chaos-layer, .starfield, canvas') }
    const label = (e) => (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + ' "' + (e.textContent || e.getAttribute('alt') || e.getAttribute('aria-label') || '').trim().slice(0, 30) + '"')
    for (const e of document.querySelectorAll("main *, header *, footer *")) {
      if (e.closest(".sr-only") || e.matches(".sr-only")) continue
      if (!vis(e)) continue
      const rc = e.getBoundingClientRect()
      const fixed = getComputedStyle(e).position === 'fixed'
      if (!fixed && (rc.right > w + 1 || rc.left < -1) && !e.closest('.thumbs, .t-list, pre, .sim-screen, svg, .scroller, .tabs, .chips, .nav')) out.past.push(label(e) + ` [${Math.round(rc.left)}..${Math.round(rc.right)}]`)
      const s = getComputedStyle(e)
      if ((s.overflowX === 'hidden' || s.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && !e.matches('img, picture')) out.clipped.push(label(e))
      if (e.tagName === 'IMG' && (!e.complete || e.naturalWidth === 0) && e.loading !== 'lazy') out.badImg.push(e.getAttribute('src'))
      if (e.tagName === 'IMG' && e.complete && e.naturalWidth === 0 && e.getAttribute('src')) out.badImg.push(e.getAttribute('src'))
      if (e.tagName === 'IMG' && !e.closest('.thumb, svg') && (rc.width < 120 || rc.height < 60) && !e.closest('.spot-nav, .brand')) out.tiny.push(label(e) + ` ${Math.round(rc.width)}x${Math.round(rc.height)}`)
      if (e.matches('button, a[href], [role="button"], select, input:not([type=hidden])') && !e.closest('svg')) {
        const min = touch ? 40 : 28
        const inlineText = e.matches('a') && getComputedStyle(e).display === 'inline' && !e.classList.contains('btn')
        const box = e.matches('input') && e.closest('label') ? e.closest('label').getBoundingClientRect() : rc
        if (!inlineText && (box.height < min || box.width < min)) out.small.push(label(e) + ` ${Math.round(box.width)}x${Math.round(box.height)}`)
      }
    }
    return out
  }, { w, touch })
  if (r.overflow > 1) note(key, `page scrolls sideways by ${r.overflow}px`)
  for (const k of ['past', 'clipped', 'badImg', 'tiny', 'small']) if (r[k].length) note(key, `${k}: ${[...new Set(r[k])].slice(0, 6).join(' | ')}${r[k].length > 6 ? ' ...' : ''}`)

  // each simulation: the canvas fits the width and its controls are reachable inside the window when scrolled to
  const sims = await p.locator('.sim').count()
  for (let i = 0; i < sims; i++) {
    const sim = p.locator('.sim').nth(i)
    await sim.evaluate((e) => { const r = e.getBoundingClientRect(); scrollTo({ top: scrollY + r.top - 70, behavior: 'instant' }) })
    await sleep(350)
    const m = await sim.evaluate((e) => {
      const cs = [...e.querySelectorAll('canvas, svg.sim-svg')].map((c) => c.getBoundingClientRect())
      const r = e.getBoundingClientRect()
      return { l: Math.round(r.left), r: Math.round(r.right), n: cs.length, cw: Math.round(Math.max(0, ...cs.map((c) => c.width))), ch: Math.round(Math.max(0, ...cs.map((c) => c.height))), vh: innerHeight }
    })
    if (m.r > w + 1 || m.l < -1) note(key, `sim ${i} outside the window ${JSON.stringify(m)}`)
    if (m.n && m.ch < 140 && m.cw < (w - 40) * 0.9) note(key, `sim ${i} canvas small ${m.cw}x${m.ch}`)
  }

  // galleries: lightbox image stays inside the window
  const gals = await p.locator('.gallery').count()
  let tested = 0
  for (let i = 0; i < gals && tested < 6; i += Math.max(1, Math.floor(gals / 6))) {
    const g = p.locator('.gallery').nth(i)
    await g.evaluate((e) => { const r = e.getBoundingClientRect(); scrollTo({ top: scrollY + r.top - 70, behavior: 'instant' }) })
    await sleep(250)
    const ib = await g.locator('.spot-img').boundingBox()
    if (ib && (ib.x < -1 || ib.x + ib.width > w + 1)) note(key, `gallery ${i} image outside window`)
    await g.locator('.spot-open').click({ timeout: 4000, force: chaos }).catch(() => note(key, `gallery ${i} cannot open lightbox`))
    if (await p.locator('.lightbox').count()) {
      await sleep(250)
      const m = await p.evaluate(() => { const r = document.querySelector('.lightbox img').getBoundingClientRect(); const c = document.querySelector('.lb-close').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, vw: innerWidth, vh: innerHeight, closeOk: c.top >= 0 && c.right <= innerWidth } })
      if (m.l < -1 || m.r > m.vw + 1 || m.t < -1 || m.b > m.vh + 1) note(key, `lightbox ${i} image outside window ${JSON.stringify(m)}`)
      if (!m.closeOk) note(key, `lightbox ${i} close button outside window`)
      await p.keyboard.press('Escape')
      tested++
    }
  }
  if (errs.length) note(key, 'page errors: ' + errs.slice(0, 2).join(' | '))
  await ctx.close()
}
await b.close()
if (problems.length) { console.log(problems.join('\n')); console.log(`\n${problems.length} problem(s)`) } else console.log('ok   layout matrix clean')
process.exit(problems.length ? 1 : 0)
