// Builds a clean copy of the site for a NEW public repository: tracked files only (no ignored files, no history),
// without the working notes in docs/, with one commit authored by the configured git user and no trailers.
// Usage: npm run export:public -- ../idris900323.github.io
// It never pushes. Afterwards: cd into the folder, run `npm ci && CHECK_STRICT=1 npm run check:publish`, then push yourself.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const target = process.argv[2]
if (!target) { console.error('Give the target folder, e.g. npm run export:public -- ../idris900323.github.io'); process.exit(2) }
const out = resolve(target)
if (existsSync(out) && readdirSync(out).length) { console.error(`${out} exists and is not empty`); process.exit(2) }
mkdirSync(out, { recursive: true })

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'pipe', ...opts })
const dirty = run('git', ['status', '--porcelain']).toString().trim()
if (dirty) console.warn('warning: uncommitted changes are not exported (only HEAD is)')

run('git', ['archive', '--format=tar', '-o', join(out, '_export.tar'), 'HEAD'])
run('tar', ['-xf', '_export.tar'], { cwd: out })
rmSync(join(out, '_export.tar'))

// docs: keep the credits (without the questions to the owner); drop every working note
const credits = readFileSync(join(out, 'docs/credits.md'), 'utf8').split('\n## Questions for Idris')[0].trimEnd() + '\n'
rmSync(join(out, 'docs'), { recursive: true, force: true })
mkdirSync(join(out, 'docs'))
writeFileSync(join(out, 'docs/credits.md'), credits)
// the README may link to the removed notes: strip those lines
const readmePath = join(out, 'README.md')
const readme = readFileSync(readmePath, 'utf8').split('\n').filter((l) => !/docs\/(jokes|chaos|annoyance)/.test(l)).join('\n')
writeFileSync(readmePath, readme)

// the CV button is shown only when public/cv holds a PDF
if (!existsSync(join(out, 'public/cv/Idris-Sadiq-CV.pdf'))) console.warn('note: no CV PDF in the export; the Contact CV button will not show')

// scan the whole export for private terms (docs/blocklist.txt) and for files that should never be public
const block = (existsSync('docs/blocklist.txt') ? readFileSync('docs/blocklist.txt', 'utf8').split('\n') : []).map((s) => s.trim().toLowerCase()).filter(Boolean)
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.name === '.git' ? [] : e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]))
let bad = 0
for (const f of walk(out)) {
  if (/(blocklist|BUILD-REPORT|PRIVACY-SWEEP|open-questions|src[\\/]assets[\\/]raw)/i.test(f)) { console.error(`SHOULD NOT BE PUBLIC: ${f}`); bad++ }
  if (statSync(f).size > 5e6) continue
  let txt
  try { txt = readFileSync(f, 'utf8').toLowerCase() } catch { continue }
  for (const t of block) if (txt.includes(t)) { console.error(`BLOCKLIST "${t}" in ${f}`); bad++ }
}
if (bad) { console.error(`${bad} problem(s). The export was not committed.`); process.exit(1) }

// the author is the one configured in THIS repository (never the machine-wide default)
const name = run('git', ['config', 'user.name']).toString().trim()
const email = run('git', ['config', 'user.email']).toString().trim()
if (!name || !email) { console.error('Set user.name and user.email in this repository first'); process.exit(1) }
run('git', ['init', '-q', '-b', 'main'], { cwd: out })
run('git', ['add', '-A'], { cwd: out })
run('git', ['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '-q', '-m', 'Portfolio site'], { cwd: out })
console.log(`Exported to ${out} as a single commit. Nothing was pushed.`)
