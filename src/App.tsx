import { lazy, memo, Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, Mail, Rocket, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useStore } from './store'
import Starfield from './Starfield'
import Scout from './Scout'
import { useInView } from './lib/hooks'
import ChaosGate from './ChaosGate'
import ChaosGuard from './chaos/ChaosGuard'
import { personal } from './personal'
import { SimView } from './sims/registry'
import { About, Documents, JapaneseRow, Notes, ProjectOpen, Open } from './Extras'
import {
  hero, highlights, interests, projects, bench, timeline, progression, learning, fieldEvents, fieldMedia, languages, skills, beyond, beyondCards, habits, links,
  statusLabel, type L, type Project,
} from './content'

const Chaos = lazy(() => import('./chaos/Chaos'))

const ui = {
  skip: { en: 'Skip to content', ja: '本文へ' },
  nav: { work: { en: 'Work', ja: '制作' }, path: { en: 'Path', ja: '経歴' }, contact: { en: 'Contact', ja: '連絡先' } },
  highlights: { en: 'Highlights', ja: 'ハイライト' },
  interests: { en: 'Research interests', ja: '研究関心' },
  interestsNote: { en: 'Draft wording; I will refine it with my own words.', ja: '仮の表現です。自分の言葉で改めて整えます。' },
  selected: { en: 'Selected work', ja: '主な研究・制作' },
  grant: { en: 'Grant and research placement', ja: '助成・研究インターン' },
  foundations: { en: 'Foundations', ja: '基礎' },
  bench: { en: 'Bench notes', ja: '作業メモ' },
  path: { en: 'Path so far', ja: 'これまでの歩み' },
  progress: { en: 'How the skills grew', ja: 'スキルの積み上がり' },
  learning: { en: 'Learning and certificates', ja: '学習・資格' },
  japan: { en: 'Japanese practice', ja: '日本語学習' },
  habits: { en: 'Habits', ja: '習慣' },
  contact: { en: 'Contact', ja: '連絡先' },
  contactBody: {
    en: 'Open to a master’s programme in robotics in Japan, research collaboration, and robotics or embedded internships.',
    ja: '日本のロボティクス分野の修士課程、共同研究、ロボティクス・組込みのインターンを探しています。',
  },
  interactive: { en: 'Interactive explanation', ja: 'インタラクティブ解説' },
  summary: { objective: { en: 'Objective', ja: '目的' }, method: { en: 'Method', ja: '方法' }, status: { en: 'Status', ja: '現状' }, mine: { en: 'My part', ja: '担当' } },
  chaosOn: { en: 'CHAOS mode', ja: 'カオスモード' },
  oneMore: { en: 'One more thing', ja: 'もう一つだけ' },
  oneMoreBody: { en: 'An optional extra: a playful version of this site, made as a joke. It has sound and is not professional.', ja: 'お楽しみ（任意）：冗談で作った、遊び心のあるバージョンです。音が出ます。プロフェッショナルな内容ではありません。' },
  chaosOff: { en: 'Restore order', ja: '元に戻す' },
  asOf: { en: 'as of', ja: '時点' },
  profile: { en: 'View profile', ja: 'プロフィールを見る' },
  streak: { en: 'day Duolingo Japanese streak, still going strong', ja: '日連続のDuolingo日本語。まだまだ継続中' },
  solved: { en: 'solved in Python', ja: '問（Python）' },
  active: { en: 'active days this year', ja: '日（過去1年）' },
  maxStreak: { en: 'max streak', ja: '最長連続' },
  lite: { en: 'Lite mode: simulations start paused.', ja: '軽量モード：シミュレーションは停止状態で始まります。' },
  loading: { en: 'Loading simulation…', ja: 'シミュレーションを読み込み中…' },
}

const subjectEn = 'Inquiry from your portfolio'
const subjectJa = 'ポートフォリオを拝見してのお問い合わせ'
// Splits the name into letters so the Chaos "title prank" can knock them around.
function Name() {
  return (
    <h1 data-name aria-label={hero.name} style={{ fontSize: 'clamp(2.4rem, 7vw, 4.4rem)', margin: '8px 0 16px' }}>
      {[...hero.name].map((c, i) => <span className="ltr" aria-hidden="true" key={i}>{c === ' ' ? ' ' : c}</span>)}
    </h1>
  )
}

export default function App() {
  const { lang, setLang, mode, toggleMode, evicted, setEvicted } = useStore()
  const t = (l: L) => l[lang]
  const [gate, setGate] = useState(false)
  const [lite] = useState(() => {
    const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    return !!c && (c.saveData === true || /(^|-)2g$/.test(c.effectiveType ?? ''))
  })

  // Japanese web font is loaded only for Japanese readers
  useEffect(() => { if (lang === 'ja') void import('@fontsource-variable/noto-sans-jp') }, [lang])
  useEffect(() => { document.title = lang === 'ja' ? 'Idris Sadiq | ポートフォリオ' : 'Idris Sadiq | Portfolio' }, [lang])

  const byTier = (tier: Project['tier']) => projects.filter((p) => p.tier === tier)

  return (
    <>
      <a className="skip" href="#main">{t(ui.skip)}</a>
      <Starfield />
      <header className="site-header" style={{ position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'blur(8px)', background: 'color-mix(in srgb, var(--bg) 78%, transparent)', borderBottom: '1px solid var(--line)' }}>
        <div className="wrap">
          <strong className="brand" style={{ fontFamily: 'var(--font-head)' }}>Idris Sadiq</strong>
          <nav aria-label="Primary">
            <a href="#work">{t(ui.nav.work)}</a><a href="#path">{t(ui.nav.path)}</a>
            <a href="#contact">{t(ui.nav.contact)}</a>
          </nav>
          <span style={{ flex: 1 }} />
          <button className="btn" onClick={() => setLang(lang === 'en' ? 'ja' : 'en')} lang={lang === 'en' ? 'ja' : 'en'} title={lang === 'en' ? 'Switch language' : '言語切替'}>
            {lang === 'en' ? '日本語' : 'English'}
          </button>
          {mode === 'chaos' && <button className="btn chaos-btn" onClick={toggleMode} aria-pressed>{t(ui.chaosOff)}</button>}
        </div>
      </header>

      {evicted && mode === 'calm' && (
        <div className="evicted" role="alert">
          <span>{lang === 'en' ? "You have been evicted by Idris' pet robot. Please try again." : 'Idrisのペットロボットに追い出されました。もう一度お試しください。'}</span>
          <button className="btn" onClick={() => setEvicted(false)} aria-label={lang === 'en' ? 'Dismiss' : '閉じる'}><X size={16} aria-hidden="true" /></button>
        </div>
      )}
      {gate && <ChaosGate lang={lang} onCancel={() => setGate(false)} onConfirm={() => { setGate(false); scrollTo({ top: 0, behavior: 'instant' }); toggleMode() }} />}

      <main id="main">
        <section className="cover" style={{ padding: '72px 0 56px' }}>
          <div className="wrap" style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 420px' }}>
              <p className="eyebrow">{t(hero.kicker)}</p>
              <Name />
              <p style={{ fontSize: 20, maxWidth: 640, margin: '0 0 10px' }}>{t(hero.line)}</p>
              <p style={{ maxWidth: 640, margin: '0 0 10px', opacity: 0.85 }}>{t(hero.sub)}</p>
              <p style={{ maxWidth: 640, fontStyle: 'italic', margin: 0, opacity: 0.85 }}>{t(hero.thread)}</p>
            </div>
            <Scout size={170} />
          </div>
        </section>

        <div className="wrap">
          <About />
          <section className="block" aria-labelledby="hl">
            <h2 id="hl">{t(ui.highlights)}</h2>
            <div className="grid four">
              {highlights.map((h) => (
                <article className="card" key={h.title.en}>
                  <h3>{t(h.title)}</h3>
                  <p>{t(h.body)}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="block" aria-labelledby="ri" style={{ paddingTop: 0 }}>
            <h2 id="ri">{t(ui.interests)}</h2>
            <p style={{ maxWidth: '68ch' }}>{t(interests)}</p>
            {import.meta.env.DEV && <p className="tag">{t(ui.interestsNote)}</p>}
          </section>

          <section id="work" aria-labelledby="wk" style={{ paddingTop: 24 }}>
            <h2 id="wk" className="sr-only">{t(ui.selected)}</h2>
            {byTier('flagship').map((p) => <ProjectSection key={p.slug} p={p} lite={lite} />)}
            <h2 style={{ marginTop: 56 }}>{t(ui.grant)}</h2>
            {byTier('grant').map((p) => <ProjectSection key={p.slug} p={p} lite={lite} />)}
            <h2 style={{ marginTop: 56 }}>{t(ui.foundations)}</h2>
            {byTier('foundation').map((p) => <ProjectSection key={p.slug} p={p} lite={lite} />)}
          </section>

          <Notes />
          <section className="block" aria-labelledby="bn">
            <h2 id="bn">{t(ui.bench)}</h2>
            <div className="grid">
              {bench.map((b) => (
                <article className="card" key={b.t.en}><h3>{t(b.t)}</h3><p>{t(b.d)}</p>{b.media && <Gallery items={b.media} lang={lang} />}</article>
              ))}
            </div>
          </section>

          <section id="path" className="block" aria-labelledby="pt" style={{ paddingTop: 0 }}>
            <h2 id="pt">{t(ui.path)}</h2>
            <ol className="t-list">
              {timeline.map((r) => (
                <li key={r.when + r.where}>
                  <span className="tag">{r.when}</span><strong>{t(r.role)}</strong>
                  <div style={{ color: 'var(--muted)' }}>{r.where}</div>
                </li>
              ))}
            </ol>
            <h3 className="beyond-h">{t(beyond)}</h3>
            <div className="grid">
              {beyondCards.map((c) => (
                <article className="card" key={c.slug}>
                  <p className="tag" style={{ margin: 0 }}>{t(c.when)}</p>
                  <h3>{t(c.title)}</h3>
                  <p>{t(c.body)}</p>
                  {c.images ? <Gallery items={c.images} lang={lang} /> : <Open label={c.open} />}
                  {c.link && <p style={{ margin: '12px 0 0' }}><a className="btn" href={c.link.href} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /> {t(c.link.label)}</a></p>}
                </article>
              ))}
            </div>
            <h3 style={{ marginTop: 32 }}>{t(ui.progress)}</h3>
            <div className="prog">
              {progression.map((s, i) => (
                <span key={s.en}>{t(s)}{i < progression.length - 1 && <span className="arrow" aria-hidden="true"> → </span>}</span>
              ))}
            </div>
            <h2 style={{ marginTop: 48 }}>{t(ui.learning)}</h2>
            <div className="grid">
              {learning.map((g) => (
                <article className="card" key={g.theme.en}>
                  <h3>{t(g.theme)}</h3>
                  <ul className="bullets" style={{ color: 'var(--muted)', margin: 0 }}>{g.items.map((l) => <li key={l.en}>{t(l)}</li>)}</ul>
                </article>
              ))}
            </div>
            <h3 className="beyond-h">{lang === 'en' ? 'Out in the field' : '現場での学び'}</h3>
            <div className="field-row">
              <ul className="bullets" style={{ color: 'var(--muted)', margin: 0 }}>{fieldEvents.map((l) => <li key={l.en}>{t(l)}</li>)}</ul>
              <Gallery items={fieldMedia} lang={lang} />
            </div>
            <div className="grid" style={{ marginTop: 28 }}>
              <article className="card"><h3>{lang === 'en' ? 'Tools' : '使ってきたツール'}</h3><p>{t(skills)}</p></article>
              <article className="card"><h3>{lang === 'en' ? 'Languages' : '言語'}</h3><p>{t(languages)}</p></article>
            </div>
          </section>

          <section id="japan" className="block" aria-labelledby="jp" style={{ paddingTop: 0 }}>
            <h2 id="jp">{t(ui.japan)}</h2>
            <div className="grid">
              <article className="card">
                <h3 className="tabnum" style={{ fontSize: 40, margin: 0 }}>{habits.duolingoDays.toLocaleString(lang)}</h3>
                <p>{t(ui.streak)}</p>
                <p className="tag" style={{ margin: '4px 0 0' }}>{lang === 'en' ? `${t(ui.asOf)} ${habits.asOf}` : `${habits.asOf} ${t(ui.asOf)}`}</p>
                {personal.links.duolingo && <p style={{ margin: '12px 0 0' }}><a className="btn" href={personal.links.duolingo} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> Duolingo: {t(ui.profile)}</a></p>}
              </article>
              <article className="card">
                <h3>{t(ui.habits)}: LeetCode</h3>
                <p>{habits.leetcode.solved.toLocaleString(lang)} {t(ui.solved)} · {habits.leetcode.activeDays} {t(ui.active)} · {t(ui.maxStreak)} {habits.leetcode.maxStreak}</p>
                <p className="tag" style={{ margin: '4px 0 0' }}>{lang === 'en' ? `${t(ui.asOf)} ${habits.asOf}` : `${habits.asOf} ${t(ui.asOf)}`}</p>
                {personal.links.leetcode && <p style={{ margin: '12px 0 0' }}><a className="btn" href={personal.links.leetcode} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> LeetCode: {t(ui.profile)}</a></p>}
              </article>
            </div>
          </section>
        </div>

        <section id="contact" className="cover" style={{ padding: '64px 0' }} aria-labelledby="ct">
          <div className="wrap">
            <h2 id="ct">{t(ui.contact)}</h2>
            <p style={{ maxWidth: 640 }}>{t(ui.contactBody)}</p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', margin: '16px 0' }}>
              <a className="btn" style={{ color: 'inherit' }} href={`mailto:${links.email}?subject=${encodeURIComponent(lang === 'ja' ? subjectJa : subjectEn)}`}><Mail size={14} /> {links.email}</a>
              <a href={links.linkedin} rel="noopener noreferrer" target="_blank"><ExternalLink size={14} style={{ verticalAlign: -2 }} /> LinkedIn</a>
              <a href={links.github} rel="noopener noreferrer" target="_blank"><ExternalLink size={14} style={{ verticalAlign: -2 }} /> GitHub</a>
              <Documents />
            </div>
            <JapaneseRow />
          </div>
        </section>
      </main>

      {mode === 'calm' && (
        <section className="one-more" aria-labelledby="om">
          <div className="wrap">
            <h2 id="om">{t(ui.oneMore)}</h2>
            <p>{t(ui.oneMoreBody)}</p>
            <button className="btn" onClick={() => { setEvicted(false); setGate(true) }}
              onMouseEnter={() => { void import('./chaos/Chaos') }} onFocus={() => { void import('./chaos/Chaos') }}>
              <Rocket size={15} aria-hidden="true" /> {t(ui.chaosOn)}
            </button>
          </div>
        </section>
      )}

      <footer style={{ borderTop: '1px solid var(--line)', padding: '24px 0', color: 'var(--muted)', fontSize: 14 }}>
        <div className="wrap">{lite ? t(ui.lite) : ' '}</div>
      </footer>

      {mode === 'chaos' && <ChaosGuard key="chaos"><Suspense fallback={null}><Chaos /></Suspense></ChaosGuard>}
    </>
  )
}

type Media = NonNullable<Project['media']>[number]
const mediaBase = () => import.meta.env.BASE_URL + 'media/img/'
const src = (m: Media, i: number) => `${mediaBase()}${m.src}-${(m.widths ?? [640, 1280])[i]}.webp`

/** Full-window view of a gallery image: scrim, large image, caption, previous and next, Escape or the X to close. */
function Lightbox({ items, i, go, onClose, lang }: { items: Media[]; i: number; go: (k: number) => void; onClose: () => void; lang: 'en' | 'ja' }) {
  const box = useRef<HTMLDivElement>(null)
  const m = items[i]
  const n = items.length
  const widths = m.widths ?? [640, 1280]
  const big = widths[widths.length - 1]
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null
    box.current?.querySelector<HTMLElement>('.lb-close')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose() }
      else if (n > 1 && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); e.stopPropagation(); go(i + (e.key === 'ArrowRight' ? 1 : -1)) }
      else if (e.key === 'Tab') {
        const f = [...(box.current?.querySelectorAll<HTMLElement>('button') ?? [])]
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('keydown', onKey, true); back?.focus?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, n])
  const label = (en: string, ja: string) => (lang === 'en' ? en : ja)
  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={label('Image viewer', '画像ビューア')} ref={box} onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('lb-stage')) onClose() }}>
      <button className="lb-close" onClick={onClose} aria-label={label('Close image', '画像を閉じる')}><X size={22} aria-hidden="true" /></button>
      <div className="lb-stage">
        <img key={m.src} src={`${mediaBase()}${m.src}-${big}.webp`} width={m.w} height={m.h} style={{ width: `min(100%, calc((100svh - 150px) * ${m.w / m.h}))` }} alt={m.alt[lang]} decoding="async" />
        {n > 1 && (
          <>
            <button className="spot-nav prev" onClick={() => go(i - 1)} aria-label={label('Previous image', '前の画像')}><ChevronLeft size={22} aria-hidden="true" /></button>
            <button className="spot-nav next" onClick={() => go(i + 1)} aria-label={label('Next image', '次の画像')}><ChevronRight size={22} aria-hidden="true" /></button>
          </>
        )}
      </div>
      {(m.caption || m.label) && <p className="lb-cap">{m.label && <span className="lab">{m.label[lang]}</span>}{m.caption?.[lang]}{n > 1 && <span className="lb-count"> {i + 1} / {n}</span>}</p>}
    </div>,
    document.body,
  )
}

/** Spotlight gallery: one large image, thumbnails below. Clicking a thumbnail promotes it; it rotates by itself until the reader takes over. */
function Gallery({ items, lang }: { items: Media[]; lang: 'en' | 'ja' }) {
  const [i, setI] = useState(0)
  const [zoom, setZoom] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  const n = items.length
  const go = (k: number) => setI(((k % n) + n) % n)
  const m = items[i]
  const w = m.widths ?? [640, 1280]
  const t = (l: { en: string; ja: string }) => l[lang]
  return (
    <div className={n === 1 ? 'gallery single' : 'gallery'} ref={host} role="group" aria-roledescription="carousel" aria-label={lang === 'en' ? 'Project images' : 'プロジェクトの画像'}
      onKeyDown={(e) => { if (e.key === 'ArrowRight') go(i + 1); else if (e.key === 'ArrowLeft') go(i - 1) }}>
      <figure className="spot" aria-live="polite">
        <div className="spot-img" style={m.w >= m.h ? undefined : { width: 'fit-content', maxWidth: '100%', margin: '0 auto' }}>
          <button className="spot-open" onClick={() => setZoom(true)} aria-label={`${lang === 'en' ? 'Enlarge image' : '画像を拡大'}: ${t(m.alt)}`}>
            <img key={m.src} src={src(m, 0)} srcSet={w.map((x) => `${mediaBase()}${m.src}-${x}.webp ${x}w`).join(', ')} sizes="(max-width: 900px) 100vw, 640px"
          width={m.w} height={m.h} style={m.w >= m.h ? { width: '100%', height: 'auto' } : { height: 'min(62vh, 560px)', width: 'auto', maxWidth: '100%' }} alt={t(m.alt)} loading="lazy" decoding="async" />
          </button>
          {n > 1 && (
            <>
              <button className="spot-nav prev" onClick={() => go(i - 1)} aria-label={lang === 'en' ? 'Previous image' : '前の画像'}><ChevronLeft size={20} aria-hidden="true" /></button>
              <button className="spot-nav next" onClick={() => go(i + 1)} aria-label={lang === 'en' ? 'Next image' : '次の画像'}><ChevronRight size={20} aria-hidden="true" /></button>
            </>
          )}
        </div>
        {(m.caption || m.label) && <figcaption>{m.label && <span className="lab">{t(m.label)}</span>}{m.caption && t(m.caption)}</figcaption>}
      </figure>
      {zoom && <Lightbox items={items} i={i} go={go} onClose={() => setZoom(false)} lang={lang} />}
      {n > 1 && (
        <div className="thumbs">
          {items.map((x, k) => (
            <button key={x.src} className="thumb" aria-current={k === i} onClick={() => go(k)} aria-label={`${lang === 'en' ? 'Show image' : '画像を表示'} ${k + 1}: ${t(x.alt)}`}>
              <img src={src(x, 0)} alt="" width={96} height={72} loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const ProjectSection = memo(function ProjectSection({ p, lite }: { p: Project; lite: boolean }) {
  const lang = useStore((s) => s.lang)
  const ref = useRef<HTMLElement>(null)
  const near = useInView(ref, 600)
  const [everSeen, setEverSeen] = useState(false)
  if (near && !everSeen) setEverSeen(true) // sticky: derive during render, no effect needed
  const [simOn, setSimOn] = useState(false)
  if (near && !lite && !simOn) setSimOn(true)
  const S = p.sim ? SimView[p.sim] : null
  const base = import.meta.env.BASE_URL
  const rows = (['objective', 'method', 'status', 'mine'] as const).filter((k) => p.summary[k])

  return (
    <article ref={ref} id={p.slug} className={`project${everSeen ? ' seen' : ''}`} aria-labelledby={p.slug + '-h'}>
      <div className={p.media?.length ? 'p-top has-media' : 'p-top'}>
        <div className="p-text">
          <p className="eyebrow">{p.eyebrow[lang]}</p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 id={p.slug + '-h'}>{p.title[lang]}</h2>
            <span className="badge">{statusLabel[p.status][lang]}</span>
          </div>
          <p className="lead">{p.blurb[lang]}</p>
          {rows.length > 0 && (
            <dl className="summary">
              {rows.map((k) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{ui.summary[k][lang]}</dt>
                  <dd>{p.summary[k]![lang]}</dd>
                </div>
              ))}
            </dl>
          )}
          {p.credit && <p style={{ fontSize: 14, color: 'var(--muted)' }}>{p.credit[lang]}</p>}
          <ProjectOpen slug={p.slug} />
          {p.link && <p><a href={p.link.href} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} style={{ verticalAlign: -2 }} /> {p.link.label[lang]}</a></p>}
          <div>{p.tags.map((tg) => <span className="tag" translate="no" key={tg}>#{tg}</span>)}</div>
        </div>
        {p.media && (
          <Gallery items={p.media} lang={lang} />
        )}
      </div>
      {p.videos && (
        <div className="media" style={{ marginTop: 20 }}>
          {p.videos.map((v) => (
            <figure key={v.src}>
              <video muted playsInline controls preload="none" width={1280} height={720}
                poster={`${base}media/img/${v.poster}-640.webp`} aria-label={`${v.caption[lang]} (${lang === 'en' ? 'no sound' : '音声なし'})`}>
                <source src={`${base}media/vid/${v.src}.mp4`} type="video/mp4" />
              </video>
              <figcaption>{v.caption[lang]}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {S && (
        <div className="interactive">
          <h3>{ui.interactive[lang]}</h3>
          {simOn ? (
            <Suspense fallback={<p className="tag">{ui.loading[lang]}</p>}><S lang={lang} /></Suspense>
          ) : (
            <button className="btn" onClick={() => setSimOn(true)}>{lang === 'en' ? 'Load the simulation' : 'シミュレーションを読み込む'}</button>
          )}
        </div>
      )}
    </article>
  )
})
