// Clicks the CHAOS button and walks through the opening crawl and every "are you sure" dialog.
export async function enterChaos(page) {
  await page.getByRole('button', { name: /CHAOS/ }).click() // the button sits at the very bottom of the page
  await page.getByRole('button', { name: 'Proceed', exact: true }).click() // the plain notice comes first
  // the OK button only appears once the crawl has run: finish it early for tests
  await page.evaluate(() => document.querySelector('.crawl-inner')?.dispatchEvent(new Event('animationend', { bubbles: true })))
  await page.getByRole('button', { name: 'OK', exact: true }).click()
  for (let i = 0; i < 12; i++) {
    if (!(await page.locator('.gate').count())) break
    const last = /final question/i.test(await page.locator('.gate-card h2').innerText().catch(() => ''))
    // the last question swaps the colours: No is the orange one, Yes is the dark one
    await page.locator(last ? '.gate .gate-actions button:not(.chaos-btn)' : '.gate .gate-actions .chaos-btn').last().click()
    await page.waitForTimeout(60)
  }
  await page.waitForSelector('.gate', { state: 'detached' })
}
