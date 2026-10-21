// The removed application items must not appear anywhere (dev or production), and no OPEN box may exist in production.
import { chromium } from '@playwright/test'
const gone = [/Japanese, optional/i, /CV \(Japanese/i, /proposal summary/i, /graduation/i, /GPA/, /TOEFL|IELTS/, /start term/i, /draft email/i, /Application facts/i]
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
let bad = 0
for (const [name, url] of [['dev', 'http://localhost:5173/'], ['prod', 'http://localhost:4173/']]) for (const lang of ['en', 'ja']) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
  await p.goto(`${url}?lang=${lang}`, { waitUntil: 'networkidle' })
  await p.evaluate(() => document.getElementById('contact')?.scrollIntoView()); await p.waitForTimeout(500)
  const text = await p.evaluate(() => document.body.innerText)
  const hits = gone.filter((re) => re.test(text)).map(String)
  const opens = await p.locator('.open').allInnerTexts()
  const contactOpen = await p.locator('#contact .open').allInnerTexts()
  const hasJp = lang === 'en' ? /JLPT N5 passed; NAT-TEST 4Q passed/.test(text) : /JLPT N5合格/.test(text)
  const ok = !hits.length && hasJp && (name === 'dev' || opens.length === 0) && contactOpen.every((t) => /CV PDF \(English\)/.test(t))
  if (!ok) bad++
  console.log(ok ? 'ok  ' : 'FAIL', name, lang, JSON.stringify({ hits, hasJp, opens: opens.length, contactOpen }))
  await p.close()
}
await b.close(); process.exit(bad ? 1 : 0)
