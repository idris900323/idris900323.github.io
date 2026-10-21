// Audit capture: Calm only, production preview. Screenshots (first viewport, per section) at three sizes in both languages,
// plus automated measurements. Output: tests/out/audit/*.png and tests/out/audit/report.json
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
const url = process.argv[2] ?? 'http://localhost:4173/'
const out = 'tests/out/audit'
mkdirSync(out, { recursive: true })
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const report = {}
for (const [name, w, h] of [['1440', 1440, 900], ['1366', 1366, 768], ['390', 390, 844]]) for (const lang of ['en', 'ja']) {
  const key = `${name}-${lang}`
  const p = await b.newPage({ viewport: { width: w, height: h }, hasTouch: name === '390', isMobile: name === '390' })
  const msgs = []
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) msgs.push(m.type() + ': ' + m.text().slice(0, 140)) })
  p.on('pageerror', (e) => msgs.push('pageerror: ' + e.message))
  await p.addInitScript(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({ type: 'layout-shift', buffered: true }) })
  await p.goto(`${url}?lang=${lang}`, { waitUntil: 'networkidle' })
  await p.screenshot({ path: `${out}/${key}-first.png` })
  const first = await p.evaluate(() => ({ h1: document.querySelector('h1')?.innerText, words: document.body.innerText.slice(0, 600).split(/\s+/).length }))
  // walk the page so lazy sections render
  const total = await p.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < total; y += Math.round(h * 0.7)) { await p.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y); await p.waitForTimeout(120) }
  await p.waitForTimeout(500)
  const m = await p.evaluate(() => {
    const secs = [...document.querySelectorAll('main > section, main > .wrap > section, article.project')].map((s) => ({ id: s.id || s.className.slice(0, 20), h: Math.round(s.getBoundingClientRect().height), words: (s.innerText || '').split(/\s+/).filter(Boolean).length }))
    const small = [...document.querySelectorAll('a, button, input, select, summary, [role=tab]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 40 || r.width < 40) && !e.closest('.sr-only, nav') && getComputedStyle(e).display !== 'inline' }).map((e) => (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 24) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))
    const header = document.querySelector('.site-header').getBoundingClientRect().height
    const opens = document.querySelectorAll('.open').length
    return { totalH: document.documentElement.scrollHeight, secs, small: [...new Set(small)].slice(0, 12), headerH: Math.round(header), docOverflow: document.documentElement.scrollWidth > innerWidth + 1, cls: +(window.__cls || 0).toFixed(3), opens, words: document.body.innerText.split(/\s+/).length }
  })
  report[key] = { first, ...m, console: [...new Set(msgs)].slice(0, 6) }
  // per section shots (project headers and main blocks)
  const ids = ['hl', 'work', 'pid', 'swarm', 'net', 'gait', 'abb', 'cpu8', 'quadrupeds', 'vehicles', 'pipe', 'stepscribe', 'subtlebotic', 'path', 'japan', 'contact']
  for (const id of ids) {
    const ok = await p.evaluate((i) => { const e = document.getElementById(i) ?? document.querySelector(`[aria-labelledby="${i}"]`); if (!e) return false; scrollTo({ top: e.getBoundingClientRect().top + scrollY - 70, behavior: 'instant' }); return true }, id)
    if (!ok) continue
    await p.waitForTimeout(250)
    if (name !== '1366' || lang === 'en') await p.screenshot({ path: `${out}/${key}-${id}.png` })
  }
  await p.close()
}
await b.close()
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1))
for (const [k, r] of Object.entries(report)) console.log(k, 'h', r.totalH, 'words', r.words, 'cls', r.cls, 'header', r.headerH, 'overflow', r.docOverflow, 'opens', r.opens, 'small', r.small.length, 'console', r.console.length)
