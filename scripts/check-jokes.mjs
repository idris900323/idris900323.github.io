// Fails when any caption slot is still an unreviewed draft. Run in CI with CHECK_STRICT=1.
import { readFileSync } from 'node:fs'
let bad = 0
let total = 0
for (const lang of ['en', 'ja']) {
  const slots = JSON.parse(readFileSync(`src/content/jokes/${lang}.json`, 'utf8'))
  for (const s of slots) {
    total++
    const reviewed = s.custom.trim() !== '' || s.selected !== null
    if (!reviewed) {
      bad++
      if (process.env.CHECK_STRICT === '1') console.error(`UNREVIEWED ${lang}/${s.id}`)
    }
  }
}
console.log(`${total - bad}/${total} caption slots reviewed`)
if (bad && process.env.CHECK_STRICT === '1') process.exit(1)
