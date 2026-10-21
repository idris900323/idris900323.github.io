import { useCallback, useEffect, useRef, useState } from 'react'
import SimShell, { type L } from '../SimShell'
import { useReducedMotion, useSimLoop } from '../../lib/hooks'
import {
  DEFAULT_GAINS, DEFAULT_PLANT, DT, PID, PRESETS, RANGES, VMAX, autoTune, clamp, metrics, plantStep,
  type Gains, type Metrics, type Plant, type State,
} from './core'
import type { TunerRequest, TunerResponse } from './tuner.worker'

// NEEDS-NATIVE-REVIEW
const S = {
  title: { en: 'PID digital twin: servo + arm', ja: 'PIDデジタルツイン：サーボとアーム' },
  summary: {
    en: 'A simulated servo motor with an orange arm and payload tracks a target angle under PID control. Adjust Kp, Ki and Kd and watch the output angle and tracking error charts, plus rise time, overshoot, settling time and steady-state error.',
    ja: 'サーボモーターとオレンジ色のアーム、ペイロードをPID制御で目標角度に追従させるシミュレーションです。Kp、Ki、Kdを調整し、出力角度と追従誤差のグラフ、立ち上がり時間、オーバーシュート、整定時間、定常偏差を確認できます。',
  },
  note: {
    en: 'Illustrative; Auto-tune (demo) is a simple search optimiser, not the research RL tuner.',
    ja: '説明用です。Auto-tune (demo) は単純な探索最適化であり、研究で用いる強化学習チューナーではありません。',
  },
  kp: { en: 'Kp (proportional)', ja: 'Kp（比例）' },
  ki: { en: 'Ki (integral)', ja: 'Ki（積分）' },
  kd: { en: 'Kd (derivative)', ja: 'Kd（微分）' },
  arm: { en: 'Arm length (cm)', ja: 'アーム長 (cm)' },
  mass: { en: 'Payload mass (kg)', ja: 'ペイロード質量 (kg)' },
  limit: { en: 'Motor speed limit (%)', ja: 'モーター速度制限 (%)' },
  gravity: { en: 'Gravity load', ja: '重力負荷' },
  autoOnPayload: { en: 'Auto-tune when payload changes', ja: 'ペイロード変更時に自動チューニング' },
  sluggish: { en: 'Sluggish', ja: '鈍い' },
  oscillatory: { en: 'Oscillatory', ja: '振動的' },
  tuned: { en: 'Tuned', ja: '調整済み' },
  tune: { en: 'Auto-tune (demo)', ja: 'Auto-tune (demo)' },
  tuning: { en: 'Tuning...', ja: 'チューニング中...' },
  run: { en: 'Run PID', ja: 'Run PID' },
  presets: { en: 'Presets', ja: 'プリセット' },
  canvasArm: { en: 'Servo with orange arm and payload ball; the dashed line is the target angle.', ja: 'サーボとオレンジ色のアーム、ペイロード球。破線は目標角度です。' },
  chartAngle: { en: 'Chart: output angle versus target over time.', ja: 'グラフ：出力角度と目標角度の時間変化。' },
  chartErr: { en: 'Chart: tracking error over time.', ja: 'グラフ：追従誤差の時間変化。' },
  rise: { en: 'Rise 10-90%', ja: '立ち上がり 10-90%' },
  os: { en: 'Overshoot', ja: 'オーバーシュート' },
  settle: { en: 'Settling (2%)', ja: '整定 (2%)' },
  sse: { en: 'Steady-state error', ja: '定常偏差' },
  notSettled: { en: 'not settled', ja: '未整定' },
  angle: { en: 'Output angle (deg)', ja: '出力角度 (deg)' },
  error: { en: 'Tracking error (deg)', ja: '追従誤差 (deg)' },
  time: { en: 'time (s)', ja: '時間 (s)' },
  target: { en: 'target', ja: '目標' },
} satisfies Record<string, L>

const ACCENT = '#FF7A45', BLUE = '#4C7DFF', INK = '#e8ecf8', MUTED = '#9aa6c8', GRID = '#243056', BG = '#0b0d12'
const A_LOW = (15 * Math.PI) / 180, A_HIGH = (75 * Math.PI) / 180
const WIN = 5 // seconds per setpoint hold (= chart window)
const SAMPLE_EVERY = 10 // physics steps per stored chart sample (10 ms)
const deg = (r: number) => (r * 180) / Math.PI

type Sim = {
  s: State; pid: PID; sp: number; y0: number; t: number; n: number
  ts: number[]; ys: number[]
}

function newSim(g: Gains, theta = A_LOW): Sim {
  const pid = new PID(g)
  pid.reset(theta)
  return { s: { theta, omega: 0 }, pid, sp: A_HIGH, y0: theta, t: 0, n: 0, ts: [], ys: [] }
}
const nextTarget = (sm: Sim) => (sm.sp > (A_LOW + A_HIGH) / 2 ? A_LOW : A_HIGH)
function stepTo(sm: Sim, target: number) {
  sm.y0 = sm.s.theta; sm.sp = target; sm.t = 0; sm.ts = []; sm.ys = []
}

function drawChart(c: HTMLCanvasElement | null, sim: Sim, kind: 'angle' | 'err', xlab: string, ylab: string, tgtLab: string) {
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return
  const W = c.width, H = c.height
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
  const l = 52, r = 10, tp = 10, b = 36
  const pw = W - l - r, ph = H - tp - b
  const yv = kind === 'angle' ? sim.ys.map(deg) : sim.ys.map((v) => deg(sim.sp - v))
  let lo = 0, hi = 90
  if (kind === 'err') { hi = Math.max(10, ...yv.map(Math.abs)) * 1.1; lo = -hi }
  const X = (t: number) => l + (t / WIN) * pw
  const Y = (v: number) => tp + (1 - (v - lo) / (hi - lo)) * ph
  ctx.font = '12px ui-monospace, monospace'; ctx.lineWidth = 1
  ctx.strokeStyle = GRID; ctx.fillStyle = MUTED
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
  for (let i = 0; i <= 4; i++) {
    const v = lo + ((hi - lo) * i) / 4, y = Y(v)
    ctx.beginPath(); ctx.moveTo(l, y); ctx.lineTo(W - r, y); ctx.stroke()
    ctx.fillText(v.toFixed(0), l - 6, y)
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'
  for (let t = 0; t <= WIN; t++) {
    ctx.beginPath(); ctx.moveTo(X(t), tp); ctx.lineTo(X(t), tp + ph); ctx.stroke()
    ctx.fillText(String(t), X(t), tp + ph + 4)
  }
  ctx.fillStyle = INK
  ctx.fillText(xlab, l + pw / 2, H - 16)
  ctx.save(); ctx.translate(12, tp + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'top'
  ctx.fillText(ylab, 0, 0); ctx.restore()
  if (kind === 'angle') {
    const y = Y(deg(sim.sp))
    ctx.strokeStyle = ACCENT; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(l, y); ctx.lineTo(W - r, y); ctx.stroke(); ctx.setLineDash([])
    ctx.fillStyle = ACCENT; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'
    ctx.fillText(tgtLab, W - r - 2, y - 2)
  } else {
    ctx.strokeStyle = MUTED; ctx.beginPath(); ctx.moveTo(l, Y(0)); ctx.lineTo(W - r, Y(0)); ctx.stroke()
  }
  ctx.strokeStyle = BLUE; ctx.lineWidth = 2; ctx.beginPath()
  yv.forEach((v, i) => {
    const x = X(sim.ts[i]), y = Y(clamp(v, lo, hi))
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y)
  })
  ctx.stroke()
}

function drawArm(c: HTMLCanvasElement | null, sim: Sim, p: Plant) {
  const ctx = c?.getContext('2d')
  if (!c || !ctx) return
  const W = c.width, H = c.height
  ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H)
  const px = W / 2, py = H * 0.3
  const len = p.armCm * ((H * 0.62) / 30) // 30 cm = longest arm
  const tip = (th: number) => [px + len * Math.sin(th), py + len * Math.cos(th)] as const
  ctx.fillStyle = '#1E2128'; ctx.strokeStyle = '#3A3F47'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.roundRect(px - 46, py - 40, 92, 80, 8); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#2b2f38'; ctx.fillRect(px - 62, py - 28, 16, 56); ctx.fillRect(px + 46, py - 28, 16, 56)
  const [tx, ty] = tip(sim.sp)
  ctx.strokeStyle = ACCENT; ctx.globalAlpha = 0.55; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1
  const [ex, ey] = tip(sim.s.theta)
  ctx.strokeStyle = ACCENT; ctx.lineWidth = 8; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke()
  const rad = 7 + 9 * Math.sqrt(p.payloadKg / 2)
  const g = ctx.createRadialGradient(ex - 3, ey - 3, 2, ex, ey, rad)
  g.addColorStop(0, '#ffd1b8'); g.addColorStop(1, ACCENT)
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, rad, 0, 7); ctx.fill()
  ctx.fillStyle = '#d8dbe3'; ctx.beginPath(); ctx.arc(px, py, 9, 0, 7); ctx.fill()
  ctx.fillStyle = INK; ctx.font = '13px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
  ctx.fillText(`${deg(sim.s.theta).toFixed(1)} deg`, 10, H - 10)
}

// Tuner plumbing: off-thread via Web Worker, main-thread fallback. Only the newest request is delivered.
let tunerWorker: Worker | null = null
let latestReq = 0
function disposeTuner() { tunerWorker?.terminate(); tunerWorker = null; latestReq++ }
function requestTune(p: Plant, cb: (g: Gains) => void) {
  const id = ++latestReq
  const done = (g: Gains) => { if (id === latestReq) cb(g) }
  const fallback = () => { tunerWorker = null; setTimeout(() => done(autoTune(p, 1).gains), 0) }
  if (!tunerWorker && typeof Worker !== 'undefined') {
    try { tunerWorker = new Worker(new URL('./tuner.worker.ts', import.meta.url), { type: 'module' }) } catch { tunerWorker = null }
  }
  const w = tunerWorker
  if (!w) { fallback(); return }
  w.onmessage = (e: MessageEvent<TunerResponse>) => { if (e.data.id === id) done(e.data.gains) }
  w.onerror = fallback
  const req: TunerRequest = { id, plant: p, seed: 1 }
  w.postMessage(req)
}

const fmt = (v: number | null, unit: string, d = 2) => (v === null ? '-' : `${v.toFixed(d)}${unit}`)

export default function PidSim({ lang, onEvent }: { lang: 'en' | 'ja'; onEvent?: (e: string) => void }) {
  const t = (l: L) => l[lang]
  const reduced = useReducedMotion()
  const [running, setRunning] = useState(() => !reduced)
  const [vis, setVis] = useState(true)
  const [g, setG] = useState<Gains>(DEFAULT_GAINS)
  const [plant, setPlant] = useState<Plant>(DEFAULT_PLANT)
  const [autoOnPayload, setAutoOnPayload] = useState(false)
  const [tuning, setTuning] = useState(false)
  const [readout, setReadout] = useState<Metrics | null>(null)

  const sim = useRef<Sim>(newSim(DEFAULT_GAINS))
  const cur = useRef({ g, plant, lang })
  const lastRead = useRef(0)
  const armC = useRef<HTMLCanvasElement>(null)
  const angC = useRef<HTMLCanvasElement>(null)
  const errC = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const sm = sim.current, { plant: p, lang: lg } = cur.current
    const tt = (l: L) => l[lg]
    drawArm(armC.current, sm, p)
    drawChart(angC.current, sm, 'angle', tt(S.time), tt(S.angle), tt(S.target))
    drawChart(errC.current, sm, 'err', tt(S.time), tt(S.error), tt(S.target))
    const now = performance.now()
    if (now - lastRead.current > 2000 && sm.ts.length > 40) {
      lastRead.current = now
      setReadout(metrics(sm.ts, sm.ys, sm.y0, sm.sp))
    }
  }, [])

  // keep the loop's view of props/state current, and repaint after any change (also while paused)
  useEffect(() => {
    cur.current = { g, plant, lang }
    sim.current.pid.gains = g
    draw()
  })

  const step = useCallback(() => {
    const sm = sim.current, p = cur.current.plant
    const u = sm.pid.step(sm.sp, sm.s.theta, (VMAX * p.speedLimitPct) / 100)
    plantStep(sm.s, u, p, DT)
    if (++sm.n % SAMPLE_EVERY === 0) { sm.t += SAMPLE_EVERY * DT; sm.ts.push(sm.t); sm.ys.push(sm.s.theta) }
    if (sm.t >= WIN) stepTo(sm, nextTarget(sm)) // alternate setpoint every WIN seconds
  }, [])

  useSimLoop({ running, active: vis, dt: DT, step, draw })

  const runPid = () => {
    const sm = sim.current
    stepTo(sm, nextTarget(sm))
    lastRead.current = performance.now()
    setReadout(null)
    setRunning(true)
  }
  const reset = () => {
    sim.current = newSim(cur.current.g)
    lastRead.current = performance.now()
    setReadout(null)
  }

  const applyTune = (p: Plant) => {
    setTuning(true)
    requestTune(p, (gains) => { setG(gains); setTuning(false); setReadout(null) })
  }
  useEffect(() => disposeTuner, [])

  const setPlantKey = (k: keyof Plant, v: number | boolean, tuneAfter = false) => {
    const next = { ...plant, [k]: v } as Plant
    setPlant(next)
    if (tuneAfter && autoOnPayload) applyTune(next)
  }

  const slider = (id: string, label: L, v: number, [lo, hi]: readonly [number, number], stepV: number, on: (n: number) => void, dec = 0) => (
    <label key={id} style={{ display: 'grid', gap: 2, flex: '1 1 180px' }}>
      <span>{t(label)}: <b>{v.toFixed(dec)}</b></span>
      <input type="range" min={lo} max={hi} step={stepV} value={v} onChange={(e) => on(+e.target.value)} />
    </label>
  )

  const m = readout
  return (
    <SimShell
      title={S.title} lang={lang} summary={S.summary} note={S.note}
      running={running} onToggle={() => setRunning((r) => !r)} onReset={reset}
      controls={
        <div style={{ flexBasis: '100%', display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {slider('kp', S.kp, g.kp, RANGES.kp, 0.5, (n) => setG({ ...g, kp: n }), 1)}
            {slider('ki', S.ki, g.ki, RANGES.ki, 0.5, (n) => setG({ ...g, ki: n }), 1)}
            {slider('kd', S.kd, g.kd, RANGES.kd, 0.01, (n) => setG({ ...g, kd: n }), 3)}
          </div>
          <div role="group" aria-label={t(S.presets)} style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(['sluggish', 'oscillatory', 'tuned'] as const).map((k) => (
              <button key={k} className="btn" onClick={() => { setG(PRESETS[k]); if (k === 'oscillatory') onEvent?.('p8a'); else if (k === 'tuned') onEvent?.('p8e') }}>{t(S[k])}</button>
            ))}
            <button className="btn" onClick={() => { onEvent?.('p8d'); applyTune(plant) }} disabled={tuning}>{tuning ? t(S.tuning) : t(S.tune)}</button>
            <button className="btn chaos-btn" onClick={runPid}>{t(S.run)}</button>
          </div>
        </div>
      }
      advanced={
        <div style={{ flexBasis: '100%', display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {slider('arm', S.arm, plant.armCm, [5, 30], 1, (n) => setPlantKey('armCm', n, true))}
            {slider('mass', S.mass, plant.payloadKg, [0, 2], 0.05, (n) => setPlantKey('payloadKg', n, true), 2)}
            {slider('lim', S.limit, plant.speedLimitPct, [10, 100], 5, (n) => setPlantKey('speedLimitPct', n))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            <label><input type="checkbox" checked={plant.gravity} onChange={(e) => setPlantKey('gravity', e.target.checked)} /> {t(S.gravity)}</label>
            <label><input type="checkbox" checked={autoOnPayload} onChange={(e) => setAutoOnPayload(e.target.checked)} /> {t(S.autoOnPayload)}</label>
          </div>
        </div>
      }
      readout={
        <span>
          {t(S.rise)}: {fmt(m?.riseS ?? null, ' s')} · {t(S.os)}: {m ? m.overshootPct.toFixed(1) + ' %' : '-'} · {t(S.settle)}:{' '}
          {m ? (m.settleS === null ? t(S.notSettled) : fmt(m.settleS, ' s')) : '-'} · {t(S.sse)}: {m ? deg(m.sseRad).toFixed(2) + ' deg' : '-'}
        </span>
      }
    >
      {(active) => (
        <>
          <VisSync vis={active || !running} set={setVis} />
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
            <canvas ref={armC} width={420} height={300} role="img" aria-label={t(S.canvasArm)} style={{ ['--share' as string]: 1 }} />
            <div style={{ display: 'grid', gap: 8 }}>
              <canvas ref={angC} width={560} height={200} role="img" aria-label={t(S.chartAngle)} style={{ ['--share' as string]: 0.5 }} />
              <canvas ref={errC} width={560} height={200} role="img" aria-label={t(S.chartErr)} style={{ ['--share' as string]: 0.5 }} />
            </div>
          </div>
        </>
      )}
    </SimShell>
  )
}

/** Mirrors SimShell's off-screen detection (children's `active` = visible && running) into state. */
function VisSync({ vis, set }: { vis: boolean; set: (v: boolean) => void }) {
  useEffect(() => { set(vis) }, [vis, set])
  return null
}
