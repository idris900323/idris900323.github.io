// Asserts Calm mode downloads no Chaos code, and measures initial transfer. Usage: node tests/calm-check.mjs [url]
import { enterChaos } from './enter-chaos.mjs'
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:4173/'
const exe = process.env.CHROME || undefined
const b = await chromium.launch({ executablePath: exe })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
const reqs = []
p.on('response', async (r) => { try { const h = r.headers()['content-length']; reqs.push({ url: r.url(), size: h ? +h : 0 }) } catch { /* ignore */ } })
await p.goto(url, { waitUntil: 'networkidle' })
const calm = reqs.filter((r) => /chaos|matter|m-plus-rounded/i.test(r.url))
const total = reqs.reduce((a, r) => a + r.size, 0)
console.log('requests', reqs.length, 'transfer ~', Math.round(total / 1024), 'KB (content-length only)')
console.log(calm.length ? 'FAIL: chaos assets loaded in Calm:\n' + calm.map((r) => r.url).join('\n') : 'PASS: no Chaos assets in Calm')
const before = reqs.length
await enterChaos(p)
await p.waitForTimeout(2000)
console.log('after CHAOS press: +', reqs.length - before, 'requests', reqs.slice(before).some((r) => /chaos/i.test(r.url)) ? '(chaos chunk loaded)' : '')
await b.close()
process.exit(calm.length ? 1 : 0)
