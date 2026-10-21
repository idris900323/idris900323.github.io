// Fails if any private term appears in src/ or public/, if an em dash is present, if a phone number or an IEEE membership
// number appears in any text file, or if a PDF's Author/Title/Subject/Keywords/XMP metadata holds a phone number or an email address.
// (The body text of a PDF such as the CV is not scanned: report what it contains instead.)
// Terms come from docs/blocklist.txt (private, gitignored) and, in CI, the BLOCKLIST secret (comma separated).
// With CHECK_STRICT=1 it also fails on unreviewed draft markers (turn on before going public).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { extname, join } from 'node:path'
import { EMAIL, hasIeeeNumber, hasPhone, pdfMetadataStrings } from './patterns.mjs'

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p] })
const files = ['src', 'public'].filter(existsSync).flatMap(walk)
let bad = 0
const fromFile = existsSync('docs/blocklist.txt') ? readFileSync('docs/blocklist.txt', 'utf8').split('\n') : []
const fromEnv = (process.env.BLOCKLIST ?? '').split(',')
const block = [...fromFile, ...fromEnv].map((s) => s.trim().toLowerCase()).filter(Boolean)
const strict = process.env.CHECK_STRICT === '1'
const TEXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.html', '.json', '.svg', '.txt', '.xml', '.md', '.webmanifest'])

for (const f of files) {
  let txt
  try { txt = readFileSync(f, 'utf8').toLowerCase() } catch { continue }
  for (const t of block) if (txt.includes(t)) { console.error(`BLOCKLIST "${t}" in ${f}`); bad++ }
  if (txt.includes('—')) { console.error(`EM DASH in ${f}`); bad++ }
  if (TEXT.has(extname(f).toLowerCase())) {
    if (hasPhone(txt)) { console.error(`PHONE NUMBER pattern in ${f}`); bad++ }
    if (hasIeeeNumber(txt)) { console.error(`IEEE MEMBERSHIP NUMBER pattern in ${f}`); bad++ }
  }
  if (extname(f).toLowerCase() === '.pdf') {
    for (const m of pdfMetadataStrings(readFileSync(f))) if (hasPhone(m) || EMAIL.test(m)) { console.error(`PDF METADATA holds a phone number or email in ${f} (${m.slice(0, 60)}): strip it with an exiftool or qpdf pass`); bad++ }
  }
  if (strict && (/"status":\s*"draft"/.test(txt) && f.includes('jokes') || txt.includes('(draft)') || txt.includes('（下書き）'))) {
    console.error(`DRAFT marker in ${f}`); bad++
  }
}
if (!block.length) console.warn('warning: no blocklist terms (docs/blocklist.txt or BLOCKLIST secret); add private terms before going public')
process.exit(bad ? 1 : 0)
