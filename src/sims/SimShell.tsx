import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Maximize2, Minimize2, Pause, Play, RotateCcw } from 'lucide-react'
import { useInView, useReducedMotion } from '../lib/hooks'

export type L = { en: string; ja: string }

type Props = {
  title: L
  lang: 'en' | 'ja'
  /** Plain text description for screen readers (aria-describedby). */
  summary: L
  /** Extra disclaimer line (e.g. "Not a medical device"). */
  note?: L
  running: boolean
  onToggle: () => void
  onReset?: () => void
  /** Children receive whether the sim should be animating (visible + not paused). */
  children: (active: boolean) => ReactNode
  controls?: ReactNode
  /** Secondary settings (sliders, rarely used buttons), tucked under a disclosure so the main row stays short. */
  advanced?: ReactNode
  readout?: ReactNode
  /** Vertical space (px) the rest of the sim UI needs, so the canvas can shrink to keep everything on one screen. */
  reserve?: number
}

const CAPTION: L = {
  en: 'Illustrative simulation, not measured data.',
  ja: '説明用シミュレーションです（実測データではありません）。',
}

/** Common frame: ink bezel, caption, play/pause/reset, off-screen detection. */
export default function SimShell(p: Props) {
  const host = useRef<HTMLDivElement>(null)
  // a simulation only runs while a good part of it is on screen, so a demo never plays out before the reader arrives
  const inView = useInView(host, 0, 0.5)
  // never start before the reader has actually scrolled, so nothing runs on page load
  const [scrolled, setScrolled] = useState(() => typeof scrollY === 'number' && scrollY > 40)
  useEffect(() => {
    if (scrolled) return
    const on = () => { if (scrollY > 40) setScrolled(true) }
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [scrolled])
  const visible = inView && scrolled
  const reduced = useReducedMotion()
  const id = useId()
  const screen = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ reserve: p.reserve ?? 330, share: 1 })
  // "Enlarge" turns the simulation into a full-window overlay (site header hidden behind it), so nothing has to be squeezed
  const [full, setFull] = useState(false)
  const slotH = useRef(0)
  const toggleFull = () => {
    if (!full && host.current) slotH.current = host.current.offsetHeight
    setFull((f) => !f)
  }
  useEffect(() => {
    if (!full) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setFull(false) } }
    addEventListener('keydown', k, true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { removeEventListener('keydown', k, true); document.body.style.overflow = prev }
  }, [full])
  // Measure everything that is not the canvas (title, controls, readout, text above) so the canvas can shrink
  // until the whole simulation fits inside one screen.
  useEffect(() => {
    const fig = host.current, scr = screen.current
    if (!fig || !scr) return
    const measure = () => {
      const wrap = fig.closest('.interactive') ?? fig
      const above = full ? 0 : fig.getBoundingClientRect().top - wrap.getBoundingClientRect().top
      // find the tallest column of stacked canvases/svgs, so charts stacked beside a main view are counted correctly
      const items = [...scr.querySelectorAll('canvas, svg')].map((e) => e.getBoundingClientRect()).filter((r) => r.height > 40)
      let colH = 0, colN = 1
      for (const a of items) {
        const col = items.filter((b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 * Math.min(a.width, b.width))
        const h = col.reduce((s, r) => s + r.height, 0)
        if (h > colH) { colH = h; colN = col.length }
      }
      // in the overlay the figure is as tall as the window, so add up its parts instead
      const total = full ? [...fig.children].reduce((n, c) => n + c.getBoundingClientRect().height + 8, 0) : fig.offsetHeight
      const other = total - colH
      // wide overlay: controls sit in a column beside the screen, so the screen only has to leave room for the title
      const side = full && innerWidth >= 900
      // whatever else sits inside the screen besides the canvases (a stats header, padding) also has to fit
      const inScreen = Math.max(0, scr.getBoundingClientRect().height - colH)
      const fixed = Math.round(side ? (fig.querySelector('.sim-head')?.getBoundingClientRect().height ?? 36) + 56 + inScreen : other + above + (full ? 56 : 64 + 28)) // sticky header (not in the overlay) and a little breathing room
      const share = 1 / Math.max(1, colN)
      setFit((f) => (Math.abs(f.reserve - fixed) > 6 || f.share !== share ? { reserve: fixed, share } : f))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(fig)
    return () => ro.disconnect()
  }, [host, full])
  // each canvas tells the stylesheet its own aspect ratio, so it can be scaled up to the room available without distortion
  useEffect(() => {
    const scr = screen.current
    if (!scr) return
    const mark = () => scr.querySelectorAll('canvas').forEach((c) => { if (c.height) c.style.setProperty('--ar', String(c.width / c.height)) })
    mark()
    const mo = new MutationObserver(mark)
    mo.observe(scr, { childList: true, subtree: true })
    return () => mo.disconnect()
  }, [])
  const t = (l: L) => l[p.lang]
  void reduced
  return (
    <div className="sim-slot" style={full ? { minHeight: slotH.current } : undefined}>
    <figure ref={host} className={full ? 'sim sim-full' : 'sim'} aria-labelledby={id + 't'} aria-describedby={id + 'd'} role={full ? 'dialog' : undefined} aria-modal={full || undefined}>
      <div className="sim-head">
        <figcaption id={id + 't'} className="sim-title">{t(p.title)}</figcaption>
        <button className="btn sim-enlarge" onClick={toggleFull} aria-expanded={full} >
          {full ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {full ? (p.lang === 'en' ? 'Close (Esc)' : '閉じる（Esc）') : (p.lang === 'en' ? 'Enlarge' : '拡大')}
        </button>
      </div>
      <p id={id + 'd'} className="sr-only">{t(p.summary)}</p>
      <div className="sim-screen" ref={screen} style={{ ['--reserve' as string]: `${fit.reserve}px`, ['--share' as string]: String(fit.share) }}>{p.children(visible && p.running)}</div>
      <div className="sim-bar">
        <button className="btn" onClick={p.onToggle} aria-label={p.running ? 'Pause' : 'Play'}>
          {p.running ? <Pause size={14} /> : <Play size={14} />} {p.running ? (p.lang === 'en' ? 'Pause' : '一時停止') : (p.lang === 'en' ? 'Play' : '再生')}
        </button>
        {p.onReset && (
          <button className="btn" onClick={p.onReset} aria-label="Reset">
            <RotateCcw size={14} /> {p.lang === 'en' ? 'Reset' : 'リセット'}
          </button>
        )}
        {p.controls}
      </div>
      {p.advanced && (
        <details className="sim-adv">
          <summary>{p.lang === 'en' ? 'More settings' : 'さらに設定'}</summary>
          <div className="sim-bar">{p.advanced}</div>
        </details>
      )}
      {p.readout && <div className="sim-readout" role="status" aria-live="polite">{p.readout}</div>}
      <p className="sim-caption">{t(CAPTION)}{p.note ? ' ' + t(p.note) : ''}</p>
    </figure>
    </div>
  )
}
