// Answering "No, I did not" to the last question (did you read the message?) shows a notice, then returns to Calm.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
await p.goto(process.argv[2] ?? 'http://localhost:4173/', { waitUntil: 'networkidle' })
await p.getByRole('button', { name: /CHAOS/ }).click()
await p.getByRole('button', { name: 'Proceed', exact: true }).click()
await p.evaluate(() => document.querySelector('.crawl-inner').dispatchEvent(new Event('animationend', { bubbles: true })))
await p.getByRole('button', { name: 'OK', exact: true }).click()
for (let i = 0; i < 12; i++) {
  const q = await p.locator('.gate-card h2').innerText().catch(() => '')
  if (/final question/i.test(q)) break
  await p.locator('.gate .gate-actions .chaos-btn').last().click(); await p.waitForTimeout(60)
}
await p.locator('.gate .gate-actions .chaos-btn').click() // the highlighted button on the last question is "No, I did not"
const notice = await p.locator('.gate-card').innerText()
const shown = /Heh heh/.test(notice) && /did not read/.test(notice)
await p.waitForTimeout(3000)
const stillThere = (await p.locator('.gate').count()) === 1
await p.waitForTimeout(5000)
const gone = (await p.locator('.gate').count()) === 0
const mode = await p.evaluate(() => document.documentElement.dataset.mode)
const ok = shown && stillThere && gone && mode === 'calm'
console.log(ok ? 'ok  ' : 'FAIL', JSON.stringify({ shown, stillThere, gone, mode }))
await b.close(); process.exit(ok ? 0 : 1)
