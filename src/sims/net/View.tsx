import { useCallback, useEffect, useRef, useState } from 'react'
import SimShell, { type L } from '../SimShell'
import { useReducedMotion, useSimLoop } from '../../lib/hooks'
import { CONTROLLER, MAX_DEBRIS, SENSE, capturedCount, clearDebris, controllerAlive, createNet, failNode, isClosed, nodeIndex, setMode, spawnDebris, stepNet, type Mode, type NetSim } from './core'

// NEEDS-NATIVE-REVIEW (all JA strings in this file)
type Lang = 'en' | 'ja'
export type NetEvent = 'node-failed' | 'single-point-failure' | 'net-closed'
const MISSION_MS = 40000 // a wave that is neither caught nor gone after this long is cleared away
const TIME_SCALE = 0.75 // the whole simulation runs a bit slow, so it is easy to watch
const HOLD_MS = 3200 // how long a captured (or escaped) wave stays on screen before the next one comes
const ORANGE = '#FF7A45', CYAN = '#00B4D8', W = 640, H = 480, SC = 150, CX = W / 2, CY = H / 2

const BANNER: L = {
  en: 'CONCEPTUAL, untested. No hardware or in-orbit validation.',
  ja: '概念段階・未検証です。ハードウェアや軌道上での検証は行っていません。',
}
const T = {
  title: { en: 'Net-and-debris sim', ja: 'ネットとデブリのシミュレーション' },
  summary: {
    en: 'A conceptual two-dimensional model of a net stretched between satellites arranged in a ring. Debris drifts in. In decentralised mode each node adjusts its tension using only its neighbours, and the net closes around the debris. In centralised mode one controller node commands all the others, so losing it stops the whole net. Waves of debris arrive on their own and the net closes around them, over and over, slowly. This is a toy model, not a validated design.',
    ja: '環状に並んだ衛星間に張ったネットの概念的な2次元モデルです。デブリが漂ってきます。分散モードでは各ノードが隣接ノードの情報だけで張力を調整してネットが閉じます。集中モードでは1台のコントローラが全体を指令するため、それが失われるとネット全体が止まります。デブリの波は自動で次々にやって来て、ネットがゆっくり閉じて捕獲します。簡易モデルであり、検証済みの設計ではありません。',
  },
  mode: { en: 'Control mode', ja: '制御方式' },
  cen: { en: 'Centralised (single point of failure)', ja: '集中型（単一障害点）' },
  dec: { en: 'Decentralised', ja: '分散型' },
  fail: { en: 'Fail a node', ja: 'ノードを故障させる' },
  failCtl: { en: 'Fail the controller node', ja: 'コントローラを故障させる' },
  hint: { en: 'Debris drifts in, the net closes around it, then the next batch arrives.', ja: 'デブリが漂ってきて、ネットが閉じて捕獲し、次の波が来ます。' },
  status: { en: ['Debris incoming', 'Net closing', 'All captured', 'Debris got away', 'Next batch'], ja: ['デブリ接近中', 'ネットを閉じています', 'すべて捕獲', 'デブリを逃しました', '次の波を待っています'] },
  captured: { en: 'Captured', ja: '捕獲' },
  nodes: { en: 'Nodes', ja: 'ノード数' },
  alt: { en: 'Net between satellite nodes in a ring. Waves of debris drift in on their own and the net closes around them, then the next wave arrives.', ja: '環状の衛星ノード間のネット。デブリの波が自動で漂ってきて、ネットが閉じて捕獲し、次の波が来ます。' },
}

export default function NetView({ lang, onEvent }: { lang: Lang; onEvent?: (e: NetEvent) => void }) {
  const reduced = useReducedMotion()
  const [running, setRunning] = useState(!reduced)
  const [mode, setModeState] = useState<Mode>('decentralised')
  const [n, setN] = useState(8)
  const [readout, setReadout] = useState('')
  const [, bump] = useState(0)
  const cv = useRef<HTMLCanvasElement>(null)
  const make = (nn: number, m: Mode) => createNet(nn, m, 11)
  const sim = useRef<NetSim>(null as unknown as NetSim)
  if (!sim.current) sim.current = make(8, 'decentralised')
  const wasClosed = useRef(false)
  const lastRead = useRef(0)
  // the loop: debris arrives -> the net closes round it -> a short pause -> the next batch. Nothing to click.
  const mission = useRef({ wave: 0, state: 'idle' as 'idle' | 'running' | 'caught' | 'gone', launched: 0, caught: 0, t0: 0, until: 0 })
  const seen = useRef(new WeakSet<object>())
  const launchWave = () => {
    const s = sim.current, m = mission.current
    m.wave++
    clearDebris(s)
    const count = Math.min(MAX_DEBRIS, 2) // two pieces per wave: the net reliably closes round them
    for (let k = 0; k < count; k++) {
      const a = ((k + Math.random() * 0.7) / count) * Math.PI * 2 + m.wave * 1.3
      const r = 2.15 + Math.random() * 0.25
      const sp = 0.21 + Math.random() * 0.04
      const tx = (Math.random() - 0.5) * 0.6, ty = (Math.random() - 0.5) * 0.6
      const x = r * Math.cos(a), y = r * Math.sin(a), L = Math.hypot(tx - x, ty - y)
      spawnDebris(s, x, y, ((tx - x) / L) * sp, ((ty - y) / L) * sp)
    }
    s.closedEver = false; wasClosed.current = false
    m.launched = count; m.caught = 0; m.state = 'running'; m.t0 = performance.now()
    bump((x) => x + 1)
  }
  const t = (l: L) => l[lang]

  const rebuild = useCallback((nn: number, m: Mode) => { sim.current = make(nn, m); wasClosed.current = false; mission.current = { wave: 0, state: 'idle', launched: 0, caught: 0, t0: 0, until: performance.now() + 900 }; bump((x) => x + 1) }, [])

  const step = (dt: number) => {
    const s = sim.current
    stepNet(s, dt * TIME_SCALE)
    if (s.closedEver && !wasClosed.current) { wasClosed.current = true; onEvent?.('net-closed') }
    const m = mission.current, now = performance.now()
    if (m.state === 'idle') { if (now >= m.until) launchWave(); return }
    if (m.state === 'running') {
      for (let i = s.debris.length - 1; i >= 0; i--) {
        const d = s.debris[i], dist = Math.hypot(d.x, d.y)
        if (dist < 1.2) seen.current.add(d)
        if (dist > 2.7 && seen.current.has(d) && !d.held) s.debris.splice(i, 1) // slipped through and away
      }
      const cap = capturedCount(s)
      if (isClosed(s) && s.debris.length > 0 && cap === s.debris.length) { m.state = 'caught'; m.caught = cap; m.until = now + HOLD_MS; bump((x) => x + 1) }
      else if (s.debris.length === 0 || now - m.t0 > MISSION_MS) { m.state = 'gone'; m.until = now + HOLD_MS; bump((x) => x + 1) }
    } else if (now >= m.until) { clearDebris(s); m.state = 'idle'; m.until = now + 1200; bump((x) => x + 1) }
  }

  const draw = useCallback(() => {
    const c = cv.current, ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const s = sim.current
    ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, W, H)
    const X = (v: number) => CX + v * SC, Y = (v: number) => CY + v * SC
    ctx.strokeStyle = '#1d2536'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.arc(CX, CY, SENSE * SC, 0, 7); ctx.setLineDash([3, 6]); ctx.stroke(); ctx.setLineDash([])
    // net links
    ctx.lineWidth = 1
    for (const k of s.cons) {
      const a = s.p[k.a], b = s.p[k.b]
      ctx.strokeStyle = 'rgba(0,180,216,0.45)'
      ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(b.x), Y(b.y)); ctx.stroke()
    }
    // ring edges
    ctx.lineWidth = 2
    for (let i = 0; i < s.n; i++) {
      const a = s.p[nodeIndex(s, i)], b = s.p[nodeIndex(s, i + 1)]
      const c1 = Math.min(s.nodes[i].c, s.nodes[(i + 1) % s.n].c)
      ctx.strokeStyle = `rgba(255,122,69,${0.25 + c1 * 0.75})`
      ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(b.x), Y(b.y)); ctx.stroke()
    }
    // debris
    for (const d of s.debris) {
      ctx.fillStyle = '#c8d0e8'; ctx.beginPath(); ctx.arc(X(d.x), Y(d.y), d.r * SC, 0, 7); ctx.fill()
    }
    // nodes
    s.nodes.forEach((nd, i) => {
      const q = s.p[nodeIndex(s, i)]
      const ctl = s.mode === 'centralised' && i === CONTROLLER
      ctx.beginPath(); ctx.arc(X(q.x), Y(q.y), ctl ? 11 : 8, 0, 7)
      if (!nd.alive) { ctx.fillStyle = '#3a1f1a'; ctx.fill(); ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.moveTo(X(q.x) - 5, Y(q.y) - 5); ctx.lineTo(X(q.x) + 5, Y(q.y) + 5); ctx.moveTo(X(q.x) + 5, Y(q.y) - 5); ctx.lineTo(X(q.x) - 5, Y(q.y) + 5); ctx.stroke() }
      else { ctx.fillStyle = nd.c > 0.05 ? ORANGE : CYAN; ctx.fill(); ctx.strokeStyle = '#0b0d12'; ctx.lineWidth = 2; ctx.stroke() }
      if (ctl) { ctx.fillStyle = '#fff'; ctx.font = '11px ui-monospace, monospace'; ctx.fillText('CTRL', X(q.x) + 13, Y(q.y) + 4) }
    })
    const m = mission.current
    const stat = T.status[lang]
    const label = m.state === 'caught' ? stat[2] : m.state === 'gone' ? stat[3] : m.state === 'idle' ? stat[4] : (isClosed(s) ? stat[1] : stat[0])
    ctx.font = '700 15px ui-monospace, monospace'; ctx.fillStyle = m.state === 'caught' ? '#2ECC71' : m.state === 'gone' ? '#ff6b6b' : '#e8ecf8'; ctx.textAlign = 'left'
    ctx.fillText(label, 12, 24)
    ctx.font = '13px ui-monospace, monospace'; ctx.textAlign = 'right'; ctx.fillStyle = '#9fb0c4'
    ctx.fillText(`${T.captured[lang]} ${capturedCount(s)}/${s.debris.length}`, W - 12, 22)
    ctx.font = '12px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#7f8aa3'
    ctx.fillText(T.hint[lang], 10, H - 10)
    ctx.textAlign = 'left'
    const now = performance.now()
    if (now - lastRead.current > 2000) {
      lastRead.current = now
      const alive = s.nodes.filter((x) => x.alive).length
      const cap = capturedCount(s)
      setReadout(lang === 'en'
        ? `${s.mode === 'centralised' ? 'Centralised' : 'Decentralised'}: ${alive} of ${s.n} nodes alive, ${cap} of ${s.debris.length} debris captured, net ${isClosed(s) ? 'closed' : 'open'}`
        : `${s.mode === 'centralised' ? '集中型' : '分散型'}：${s.n}ノード中${alive}稼働、デブリ${s.debris.length}個中${cap}個捕獲、ネット${isClosed(s) ? '閉' : '開'}`)
    }
  }, [lang])

  useEffect(() => { draw() }, [draw])

  const doFail = () => {
    const s = sim.current
    const ctl = s.mode === 'centralised' && controllerAlive(s)
    const k = failNode(s)
    if (k >= 0) { onEvent?.('node-failed'); if (ctl) onEvent?.('single-point-failure'); draw(); bump((x) => x + 1) }
  }
  const s0 = sim.current
  const failLabel = mode === 'centralised' && controllerAlive(s0) ? T.failCtl : T.fail

  return (
    <SimShell
      title={T.title} lang={lang} summary={T.summary} note={BANNER}
      running={running} onToggle={() => setRunning((r) => !r)}
      onReset={() => { rebuild(n, mode); setTimeout(draw, 0) }}
      readout={readout}
      controls={
        <>
          <div role="group" aria-label={t(T.mode)} style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            {([['centralised', T.cen], ['decentralised', T.dec]] as [Mode, L][]).map(([m, label]) => (
              <button key={m} className="btn" aria-pressed={mode === m} style={mode === m ? { borderColor: ORANGE } : undefined}
                onClick={() => { setModeState(m); setMode(sim.current, m); draw() }}>{t(label)}</button>
            ))}
          </div>
          <button className="btn" onClick={doFail}>{t(failLabel)}</button>
        </>
      }
      advanced={
        <>
          <label>{t(T.nodes)} <input type="range" min={6} max={12} step={1} value={n} onChange={(e) => { const v = +e.target.value; setN(v); rebuild(v, mode) }} /> <span>{n}</span></label>
        </>
      }
    >
      {(active) => (
        <NetLoop active={active} running={running} step={step} draw={draw}>
          <FirstReveal active={active} onReveal={() => rebuild(n, mode)} />
          <div role="note" style={{ margin: '0 0 8px', padding: '6px 10px', border: `2px solid ${ORANGE}`, borderRadius: 8, fontWeight: 700, fontSize: 14, color: '#fff' }}>
            {t(BANNER)}
          </div>
          <canvas ref={cv} width={W} height={H} role="img" aria-label={t(T.alt)} />
        </NetLoop>
      )}
    </SimShell>
  )
}

/** Calls onReveal the first time the sim is genuinely on screen. */
function FirstReveal({ active, onReveal }: { active: boolean; onReveal: () => void }) {
  const done = useRef(false)
  useEffect(() => { if (active && !done.current) { done.current = true; onReveal() } }, [active, onReveal])
  return null
}

function NetLoop(p: { active: boolean; running: boolean; step: (dt: number) => void; draw: () => void; children: React.ReactNode }) {
  useSimLoop({ running: p.running, active: p.active, dt: 1 / 60, step: p.step, draw: p.draw })
  return <>{p.children}</>
}
