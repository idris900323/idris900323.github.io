// The net-and-debris simulation runs by itself in a slow loop: debris arrives, the net closes round it, a pause, the next batch.
import { chromium } from '@playwright/test'
const url = process.argv[2] ?? 'http://localhost:4173/'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1366, height: 800 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto(url, { waitUntil: 'networkidle' })
await p.evaluate(() => { document.getElementById('net').scrollIntoView({ behavior: 'instant' }); scrollBy({ top: 500, behavior: 'instant' }) })
await p.waitForSelector('#net .sim', { timeout: 15000 })
await p.evaluate(() => document.querySelector('#net .sim').scrollIntoView({ block: 'center', behavior: 'instant' }))
await p.waitForTimeout(500)
let fails = 0
const check = (c, m) => { if (!c) { fails++; console.log('FAIL', m) } else console.log('ok  ', m) }
check((await p.locator('#net .sim button', { hasText: /Launch|Next wave|Try again/ }).count()) === 0, 'no game buttons (launch, next wave, retry)')
check((await p.locator('#net canvas').first().evaluate((c) => c.tabIndex < 0 && getComputedStyle(c).cursor !== 'grab')), 'the canvas is not interactive')
// read the readout text over time: it reports captured debris counts
const seen = new Set()
let shot = false
const t0 = Date.now()
while (Date.now() - t0 < 100000) {
  const r = await p.locator('#net .sim-readout').first().innerText().catch(() => '')
  const m = r.match(/(\d+) of (\d+) debris captured, net (open|closed)/)
  if (m) seen.add(`${m[1]}/${m[2]}/${m[3]}`)
  if (m && m[3] === 'closed' && !shot) { shot = true; await p.screenshot({ path: 'tests/out/net-loop-caught.png' }) }
  await p.waitForTimeout(1000)
}
const list = [...seen]
console.log(list.join('  '))
check(list.some((x) => x.endsWith('/closed') && x.split('/')[0] === x.split('/')[1] && x.split('/')[0] !== '0'), 'the net closed round all the debris at least once')
check(new Set(list.map((x) => x.split('/')[1])).size >= 2, 'a different batch size arrived (the loop moves on by itself)')
check(errs.length === 0, 'no page errors ' + errs.join(';'))
await b.close(); process.exit(fails ? 1 : 0)
