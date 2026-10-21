import { FileText } from 'lucide-react'
import { useStore } from './store'
import type { L } from './content'
import { personal, openFields } from './personal'
import pieces from './content/personal/pieces.json'

const dev = import.meta.env.DEV

/** Dashed placeholder box. Visible only while developing; renders nothing in production. */
export function Open({ label, hint }: { label: string; hint?: string }) {
  if (!dev) return null
  return (
    <div className="open" role="note">
      <strong>OPEN</strong> {label}
      {hint && <div className="open-hint">{hint}</div>}
    </div>
  )
}

export function ProjectOpen({ slug }: { slug: string }) {
  const items = openFields[slug]
  if (!dev || !items?.length) return null
  return <>{items.map((i) => <Open key={i} label={i} />)}</>
}

export function About() {
  const lang = useStore((s) => s.lang)
  const t = (l: L) => l[lang]
  if (!personal.about.en && !personal.about.ja) {
    return <Open label="About blurb (your own words, EN and JA)" hint="Edit personal.about in src/personal.ts" />
  }
  return (
    <section className="block" aria-labelledby="ab" style={{ paddingTop: 0 }}>
      <h2 id="ab">{lang === 'en' ? 'About' : '自己紹介'}</h2>
      <p style={{ maxWidth: 760 }}>{t(personal.about) || personal.about.en}</p>
      {personal.katakana && <p className="tag">{personal.katakana}</p>}
    </section>
  )
}

/** CV download. The button appears once a file is configured; until then a dev-only placeholder shows. */
export function Documents() {
  const lang = useStore((s) => s.lang)
  const base = import.meta.env.BASE_URL
  return (
    <>
      {personal.cv.en && (
        <a className="btn" style={{ color: 'inherit' }} href={base + personal.cv.en} download>
          <FileText size={14} /> {lang === 'en' ? 'Download CV (PDF)' : '履歴書をダウンロード（PDF）'}
        </a>
      )}
      {!personal.cv.en && <Open label="CV PDF (English)" hint="Put it in public/cv/ and set personal.cv.en" />}
    </>
  )
}

/** The one application fact that is already evidenced. */
export function JapaneseRow() {
  const lang = useStore((s) => s.lang)
  return (
    <dl className="summary" style={{ margin: '12px 0' }}>
      <dt>{lang === 'en' ? 'Japanese' : '日本語'}</dt><dd>{lang === 'en' ? personal.japanese : 'JLPT N5合格、NAT-TEST 4Q合格'}</dd>
    </dl>
  )
}

/** Writing slots (guide section 21). Published pieces appear; drafts and empty slots appear only in dev. */
export function Notes() {
  const lang = useStore((s) => s.lang)
  const published = pieces.filter((p) => p.status === 'published' && (p.en || p.ja))
  if (!published.length && !dev) return null
  return (
    <section id="notes" className="block" aria-labelledby="nt" style={{ paddingTop: 0 }}>
      <h2 id="nt">{lang === 'en' ? 'Notes' : 'ノート'}</h2>
      {published.map((p) => {
        const body = p[lang]
        return (
          <article key={p.id} className="card" style={{ marginBottom: 14 }}>
            <h3>{p.title[lang]}</h3>
            {body ? <p style={{ color: 'var(--ink)', whiteSpace: 'pre-line' }}>{body}</p>
              : <p className="tag">{lang === 'ja' ? '日本語版は準備中です。' : 'English version coming soon.'}</p>}
          </article>
        )
      })}
      {dev && pieces.filter((p) => !published.includes(p)).map((p) => (
        <Open key={p.id} label={`Writing slot: ${p.title.en}`} hint={p.prompt + ' (src/content/personal/pieces.json: fill en/ja, set status to "published")'} />
      ))}
    </section>
  )
}
