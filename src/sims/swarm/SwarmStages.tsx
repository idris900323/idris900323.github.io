import { useEffect, useRef, useState } from 'react'
import SimShell, { type L } from '../SimShell'
import { useReducedMotion, useSimLoop } from '../../lib/hooks'
import {
  BOSS_ID, UNIT_W, alive, coherent, headingSpread, isDocked, isOrphan, kill, makeSwarm, neighbours, newCarry,
  platform, stepCarry, stepSwarm, terrainH, type Carry, type Swarm,
} from './core'

type Ev = 'poke' | 'kill' | 'boss-add' | 'boss-remove' | 'dock'
export type Stage = 2 | 3

// NEEDS-NATIVE-REVIEW (all ja strings)
const T = {
  title: { en: 'Swarm sandbox: coordination and docking', ja: 'スウォーム・サンドボックス：協調とドッキング' } as L,
  summary: {
    en: 'Two stages. Coordination: units share their heading over range-limited links and agree by average consensus with no central node; a unit can be removed, or a boss added and removed. Combined platform: two units dock side by side into a wider platform and carry a payload over bumpy terrain.',
    ja: '2段階です。協調：通信範囲内で向きを共有し、中心なしの平均合意を行います（ユニットの除去、ボスの追加と除去が可能）。合体：2台が並んでドッキングし、広いプラットフォームとなって凹凸地形でペイロードを運びます。',
  } as L,
  note: { en: 'Scaling to many units is future work.', ja: '多数ユニットへの拡張は今後の課題です。' } as L,
  decentral: { en: 'No leader', ja: 'リーダーなし' } as L,
  boss: { en: 'With a boss', ja: 'ボスあり' } as L,
  dock: { en: 'Dock', ja: 'ドッキング' } as L,
  undock: { en: 'Undock', ja: '分離' } as L,
  seam: { en: 'dashed seam', ja: '破線の継ぎ目' } as L,
  hint2: { en: 'Click a unit to switch it off. Click empty space to turn the nearest unit that way.', ja: 'ユニットをクリックで停止。空きをクリックで最も近い1台がその向きに。' } as L,
  hint3: { en: 'Dock: two robots join side by side so the payload fits.', ja: 'ドッキングで2台が並んで結合し、ペイロードを運べます。' } as L,
}

const W = 640, H = 300
const CYAN = '#00B4D8', ORANGE = '#FF7A45', RED = '#E74C3C', GREEN = '#2ECC71'

/** Mirrors SimShell's render-prop `active` flag into parent state. */
function ActiveSync({ active, onChange }: { active: boolean; onChange: (a: boolean) => void }) {
  useEffect(() => { onChange(active) }, [active, onChange])
  return null
}

export default function SwarmSim({ lang, stage, onEvent }: { lang: 'en' | 'ja'; stage: Stage; onEvent?: (e: Ev) => void }) {
  const reduced = useReducedMotion()
  const [running, setRunning] = useState(() => !reduced)
  const [active, setActive] = useState(false)
  const [boss, setBoss] = useState(false)
  const [docked, setDocked] = useState(false)
  const [info, setInfo] = useState('')
  const cv = useRef<HTMLCanvasElement>(null)
  const swarm = useRef<Swarm>(makeSwarm(5))
  const carry = useRef<Carry>(newCarry())
  const proj = useRef({ cx: 0, cy: 0, k: 330 })
  const lastInfo = useRef({ at: 0, text: '' })
  const t = (l: L) => l[lang]
  const emit = (e: Ev) => onEvent?.(e)

  function draw() {
    const c = cv.current
    const g = c?.getContext('2d')
    if (!c || !g) return
    g.fillStyle = '#0b0d12'
    g.fillRect(0, 0, W, H)
    g.font = '11px ui-monospace, monospace'
    if (stage === 2) drawSwarm(g)
    else drawCarry(g)
  }

  function drawSwarm(g: CanvasRenderingContext2D) {
    const s = swarm.current
    const al = alive(s)
    const cx0 = al.length ? al.reduce((a, u) => a + u.x, 0) / al.length : 0
    const cy0 = al.length ? al.reduce((a, u) => a + u.y, 0) / al.length : 0
    const k = 330
    proj.current = { cx: cx0, cy: cy0, k }
    const P = (u: { x: number; y: number }) => ({ x: W / 2 + (u.x - cx0) * k, y: H / 2 + (u.y - cy0) * k })
    g.strokeStyle = CYAN; g.lineWidth = 1.2; g.setLineDash([5, 4])
    for (const u of al) for (const v of neighbours(s, u)) if (v.id > u.id) {
      const a = P(u), b = P(v)
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke()
    }
    g.setLineDash([])
    for (const u of s.units) {
      const p = P(u)
      if (!u.alive) { g.strokeStyle = '#555'; g.beginPath(); g.moveTo(p.x - 7, p.y - 7); g.lineTo(p.x + 7, p.y + 7); g.moveTo(p.x + 7, p.y - 7); g.lineTo(p.x - 7, p.y + 7); g.stroke(); continue }
      const orphan = isOrphan(s, u)
      g.fillStyle = orphan ? '#6b7686' : u.id === BOSS_ID && s.mode === 'boss' ? ORANGE : CYAN
      g.beginPath(); g.arc(p.x, p.y, 10, 0, Math.PI * 2); g.fill()
      g.strokeStyle = '#e8ecf8'; g.lineWidth = 2
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + 18 * Math.cos(u.h), p.y + 18 * Math.sin(u.h)); g.stroke()
      g.fillStyle = '#e8ecf8'; g.textAlign = 'center'
      g.fillText(orphan ? '?' : u.id === BOSS_ID && s.mode === 'boss' ? 'BOSS' : `#${u.id + 1}`, p.x, p.y - 16)
    }
    g.textAlign = 'left'; g.fillStyle = '#9fb0c4'; g.fillText(t(T.hint2), 12, 290)
    g.fillStyle = coherent(s) ? GREEN : RED
    g.fillText(`${lang === 'en' ? 'heading spread' : '向きのばらつき'} ${headingSpread(s).toFixed(2)} rad · ${coherent(s) ? (lang === 'en' ? 'coherent' : '整列') : (lang === 'en' ? 'not coherent' : '乱れ')}`, 12, 20)
  }

  function drawCarry(g: CanvasRenderingContext2D) {
    const c = carry.current
    const pl = platform(c)
    const sy = 210, sc = 150 // world m -> px
    const X = (x: number) => W / 2 + (x - c.x) * sc
    const Y = (h: number) => sy - h * sc * 2
    g.fillStyle = '#2a2018'; g.beginPath(); g.moveTo(0, H)
    for (let px = 0; px <= W; px += 4) g.lineTo(px, Y(terrainH(c.x + (px - W / 2) / sc)) + 22)
    g.lineTo(W, H); g.fill()
    const wheel = (x: number, h: number) => { g.fillStyle = '#e8ecf8'; g.beginPath(); g.arc(X(x), Y(h) + 8, 12, 0, Math.PI * 2); g.fill() }
    wheel(pl.xl, pl.hl); wheel(pl.xr, pl.hr)
    const mx = (X(pl.xl) + X(pl.xr)) / 2, my = (Y(pl.hl) + Y(pl.hr)) / 2
    g.save(); g.translate(mx, my); g.rotate(pl.tilt)
    const half = ((c.gap + UNIT_W) / 2) * sc
    const uw = UNIT_W * sc * 0.9
    g.fillStyle = CYAN
    g.fillRect(-half - uw / 2, -52, uw, 52); g.fillRect(half - uw / 2, -52, uw, 52)
    g.strokeStyle = '#e8ecf8'; g.lineWidth = 1.5; g.setLineDash([4, 3])
    if (isDocked(c)) { g.beginPath(); g.moveTo(0, -52); g.lineTo(0, 0); g.stroke() }
    g.setLineDash([])
    if (isDocked(c)) { g.fillStyle = ORANGE; g.fillRect(-26, -52 - 34, 52, 34) }
    g.restore()
    if (!isDocked(c)) { g.fillStyle = ORANGE; g.fillRect(W / 2 - 26, Y(terrainH(c.x)) - 12, 52, 34) }
    g.fillStyle = '#9fb0c4'; g.textAlign = 'left'; g.fillText(t(T.hint3), 12, 290)
    g.fillStyle = '#e8ecf8'
    g.fillText(isDocked(c) ? (lang === 'en' ? `Docked: platform ${pl.width.toFixed(1)} m wide, carrying payload` : `ドッキング完了：幅${pl.width.toFixed(1)} mのプラットフォームでペイロード搬送中`) : (lang === 'en' ? 'Two separate units: payload does not fit' : '分離中：ペイロードは運べません'), 12, 20)
  }

  useSimLoop({
    running, active, dt: 1 / 120,
    step: (dt) => {
      if (stage === 2) swarm.current = stepSwarm(swarm.current, dt)
      else carry.current = stepCarry(carry.current, dt)
    },
    draw: () => {
      draw()
      const now = performance.now()
      if (now - lastInfo.current.at < 2000) return
      const s = swarm.current
      const text = stage === 2 ? `${alive(s).length} ${lang === 'en' ? 'units' : '台'} · ${coherent(s) ? (lang === 'en' ? 'coherent' : '整列') : (lang === 'en' ? 'not coherent' : '乱れ')}`
          : isDocked(carry.current) ? (lang === 'en' ? 'docked, carrying' : 'ドッキング済み・搬送中') : (lang === 'en' ? 'undocked' : '未ドッキング')
      lastInfo.current = { at: now, text }
      setInfo(text)
    },
  })
  useEffect(() => { draw() })

  const resetAll = () => {
    swarm.current = makeSwarm(5, boss ? 'boss' : 'decentral')
    carry.current = newCarry()
    draw()
  }
  const setLeader = (next: boolean) => {
    setBoss(next)
    swarm.current = makeSwarm(5, next ? 'boss' : 'decentral')
    emit(next ? 'boss-add' : 'boss-remove')
    draw()
  }
  const toggleDock = () => {
    const next = !carry.current.docking
    carry.current = { ...carry.current, docking: next }
    setDocked(next)
    if (next) emit('dock')
  }
  const onCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (stage !== 2) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W, py = ((e.clientY - r.top) / r.height) * H
    const { cx, cy, k } = proj.current
    const wx = cx + (px - W / 2) / k, wy = cy + (py - H / 2) / k
    const s = swarm.current
    const al = alive(s)
    if (!al.length) return
    const near = al.reduce((m, u) => (Math.hypot(u.x - wx, u.y - wy) < Math.hypot(m.x - wx, m.y - wy) ? u : m), al[0])
    if (Math.hypot(near.x - wx, near.y - wy) * k < 20) { swarm.current = kill(s, near.id); emit(near.id === BOSS_ID && s.mode === 'boss' ? 'boss-remove' : 'kill') }
    else swarm.current = { ...s, units: s.units.map((u) => (u.id === near.id ? { ...u, h: Math.atan2(wy - u.y, wx - u.x) } : u)) }
    draw()
  }
  const label = stage === 2
    ? (lang === 'en' ? 'Swarm units linked by dashed range-limited links, agreeing on a heading with no central node.' : '破線の通信リンクで結ばれ、中心なしで向きを合意するユニット群。')
      : (lang === 'en' ? 'Two units docked side by side with a dashed seam, carrying a payload over bumpy terrain.' : '破線の継ぎ目でドッキングした2台が凹凸地形でペイロードを運ぶ様子。')

  return (
    <SimShell
      title={T.title} lang={lang} summary={T.summary} note={T.note}
      running={running} onToggle={() => setRunning((r) => !r)} onReset={resetAll}
      controls={
        stage === 2 ? (
          <span role="group" aria-label={t(T.title)} style={{ display: 'inline-flex', gap: 4 }}>
            <button className="chip" aria-pressed={!boss} onClick={() => setLeader(false)}>{t(T.decentral)}</button>
            <button className="chip" aria-pressed={boss} onClick={() => setLeader(true)}>{t(T.boss)}</button>
          </span>
        ) : (
          <button className="btn" onClick={toggleDock}>{t(docked ? T.undock : T.dock)}</button>
        )
      }
      readout={<>{info}</>}
    >
      {(a) => (
        <>
          <ActiveSync active={a} onChange={setActive} />
          <canvas ref={cv} width={W} height={H} role="img" aria-label={label} tabIndex={0} onPointerDown={onCanvas} style={stage === 2 ? { cursor: 'pointer' } : undefined} />
        </>
      )}
    </SimShell>
  )
}
