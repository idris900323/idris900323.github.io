// A project-site build (served under /<repo>/) loads every request, including images, video and the CV link. Usage: node tests/base-path.mjs http://localhost:4174/robotics-portfolio/
import { chromium } from '@playwright/test'
import { enterChaos } from './enter-chaos.mjs'
const url = process.argv[2] ?? 'http://localhost:4174/robotics-portfolio/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1366, height: 800 } })
const failed = []
p.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + r.url()) })
p.on('requestfailed', (r) => failed.push('FAILED ' + r.url()))
await p.goto(url, { waitUntil: 'networkidle' })
const h = await p.evaluate(() => document.documentElement.scrollHeight)
for (let y = 0; y < h; y += 700) { await p.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y); await p.waitForTimeout(150) }
await p.waitForTimeout(800)
await p.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
await enterChaos(p) // the lazy Chaos chunk, its font and its physics library must load under the base path too
await p.waitForTimeout(2500)
const chaosMode = await p.evaluate(() => document.documentElement.dataset.mode)
const cv = await p.evaluate(() => document.querySelector('a[download]')?.getAttribute('href'))
const cvStatus = cv ? (await p.request.get(new URL(cv, url).href)).status() : 0
const imgs = await p.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length)
const ok = chaosMode === 'chaos' && !failed.length && cvStatus === 200 && imgs === 0
console.log(ok ? 'ok  ' : 'FAIL', JSON.stringify({ chaosMode, failed: failed.slice(0, 5), cv, cvStatus, brokenImages: imgs }))
await b.close(); process.exit(ok ? 0 : 1)
