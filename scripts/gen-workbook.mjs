// Builds docs/jokes-workbook.md from the caption JSON (and docs/jokes-suggestions.json) so Idris can pick or write captions
// without touching code. The suggestions never change `selected` or `custom` in the JSON files: only Idris chooses.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const en = JSON.parse(readFileSync('src/content/jokes/en.json', 'utf8'))
const ja = JSON.parse(readFileSync('src/content/jokes/ja.json', 'utf8'))
const sug = existsSync('docs/jokes-suggestions.json') ? JSON.parse(readFileSync('docs/jokes-suggestions.json', 'utf8')) : {}
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' / ')

let md = '# Jokes workbook\n\n'
md += 'Pick an option or write your own, then edit `src/content/jokes/en.json` and `ja.json`: set `selected` to 0, 1 or 2, or fill `custom` (custom wins). '
md += 'Until every slot is chosen, `npm run check:jokes` fails in strict mode (CI), by design.\n\n'
md += `There are ${en.length} slots, each with 3 options in English and in Japanese (${en.length * 2} entries). `
md += 'The column **Claude\'s pick** is only a suggestion with a one-line reason; **Needs rewrite** lists problems found against the live site. '
md += 'Nothing here changes `selected` or `custom`. Suggestions live in `docs/jokes-suggestions.json`; run `npm run workbook` after editing it.\n\n'

md += '## Summary\n\n| Slot | In use now | Suggested pick | Options needing a rewrite or decision |\n|---|---|---|---|\n'
for (const s of en) {
  const g = sug[s.id]
  const flagged = g ? Object.keys(g.flags ?? {}).filter((k) => k !== 'all').join(', ') || (g.flags?.all ? 'slot flag' : 'none') : 'n/a'
  md += `| ${s.id} | ${cell(g?.used ?? '')} | ${g ? g.pick : ''} | ${flagged} |\n`
}
md += '\n---\n\n'

for (const s of en) {
  const j = ja.find((x) => x.id === s.id)
  const g = sug[s.id]
  md += `## ${s.id}: ${s.context}\n\n`
  if (g?.used) md += `In use now: ${g.used}.\n\n`
  md += '| # | EN | JA | Claude\'s pick | Needs rewrite |\n|---|---|---|---|---|\n'
  s.options.forEach((o, i) => {
    const flag = g?.flags?.[String(i)] ?? ''
    md += `| ${i} | ${cell(o)} | ${cell(j?.options[i])} | ${g?.pick === i ? '**yes**' : ''} | ${cell(flag)} |\n`
  })
  md += '\n'
  if (g?.reason) md += `Why this pick: ${g.reason}\n\n`
  if (g?.flags?.all) md += `Slot note: ${g.flags.all}\n\n`
  if (g?.proposals) {
    for (const [k, p] of Object.entries(g.proposals)) md += `Proposed rewrite for option ${k}: EN "${p.en}" / JA "${p.ja}"\n\n`
  }
}
writeFileSync('docs/jokes-workbook.md', md)
console.log('wrote docs/jokes-workbook.md', en.length, 'slots')
