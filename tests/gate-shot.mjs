import { chromium } from '@playwright/test'
const b = await chromium.launch({ executablePath: process.env.CHROME || undefined })
const p = await b.newPage({ viewport: { width: 1280, height: 800 } })
await p.goto(process.argv[2] ?? 'http://localhost:5173/', { waitUntil: 'networkidle' })
await p.getByRole('button', { name: /CHAOS/ }).click()
await p.waitForTimeout(9000)
await p.screenshot({ path: 'tests/out/gate-crawl.png' })
await b.close()
