// The warning crawl: OK only appears after the crawl has run; the last question has an orange No and a dark Yes.
import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
await p.goto(process.argv[2] ?? 'http://localhost:4173/', { waitUntil: 'networkidle' })
// the entry button is not in the header: it sits at the bottom of the page, under "One more thing"
const headerHas = await p.locator('.site-header').getByRole('button', { name: /CHAOS/ }).count()
await p.getByRole('button', { name: /CHAOS/ }).click()
// the first screen is a plain notice with two choices; going back leaves Chaos closed
const notice = await p.locator('.gate.pro').count(), noticeText = await p.locator('.notice').innerText()
await p.getByRole('button', { name: 'Go back', exact: true }).click()
const closed = (await p.locator('.gate').count()) === 0
await p.getByRole('button', { name: /CHAOS/ }).click()
await p.getByRole('button', { name: 'Proceed', exact: true }).click()
await p.waitForTimeout(1500)
const early = await p.getByRole('button', { name: 'OK', exact: true }).count()
const back = await p.getByRole('button', { name: /Take me back/ }).count()
// speed the crawl up so the test does not wait a minute
await p.evaluate(() => document.querySelector('.crawl-inner').dispatchEvent(new Event('animationend', { bubbles: true })))
await p.getByRole('button', { name: 'OK', exact: true }).waitFor({ timeout: 3000 })
await p.getByRole('button', { name: 'OK', exact: true }).click()
let lastClasses = null
for (let i = 0; i < 12; i++) {
  if (!(await p.locator('.gate').count())) break
  const q = await p.locator('.gate-card h2').innerText().catch(() => '')
  if (/final question/i.test(q)) lastClasses = await p.evaluate(() => [...document.querySelectorAll('.gate-actions button')].map((x) => x.textContent + ':' + x.className).concat(getComputedStyle(document.querySelector('.gate-card .gate-actions')).flexDirection))
  await p.locator('.gate .gate-actions button').filter({ hasText: /^(?!Take me back)/ }).last().click().catch(() => {})
  await p.waitForTimeout(60)
}
const yesFirst = lastClasses && lastClasses[2] === 'row-reverse' // DOM order is No, Yes; reversed means Yes is on the left
const ok = headerHas === 0 && notice === 1 && /made as a joke/.test(noticeText) && closed && yesFirst && early === 0 && back === 1 && lastClasses && lastClasses.some((c) => /^No.*chaos-btn/.test(c)) && lastClasses.some((c) => /^Yes/.test(c) && !/chaos-btn/.test(c))
console.log(ok ? 'ok  ' : 'FAIL', JSON.stringify({ headerHas, notice, closed, early, back, lastClasses }))
await b.close(); process.exit(ok ? 0 : 1)
