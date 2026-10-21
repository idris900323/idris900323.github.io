import { useCallback, useEffect, useRef, useState } from 'react'
import SimShell, { type L } from '../SimShell'
import { useReducedMotion, useSimLoop } from '../../lib/hooks'
import { BLADE, BODY_H, HIP, LEG_NAME, LINK, footBody, initSpider, stepSpider, type Cmd, type Gait, type SpiderState } from './spiderModel'

// NEEDS-NATIVE-REVIEW (all JA strings in this file)
type Lang = 'en' | 'ja'
const ORANGE = '#FF7A45', CYAN = '#00B4D8', W = 760, H = 480
const PX = 640 // top view pixels per metre

const T = {
  title: { en: 'Spider quadruped: two joints per leg (8 servos)', ja: 'スパイダー四足：1脚2関節（サーボ8個）' } as L,
  summary: {
    en: 'Each of the four legs has two servo joints. A hip servo at the body swings the upper link fore and aft, and a knee servo at the end of that link tilts a straight blade, which lifts the foot and moves it outward. The body is moved by the feet that are on the ground. Views: top, side, front, eight servo angles and a stance and swing timeline.',
    ja: '4本の脚はそれぞれ2つのサーボ関節を持ちます。胴体側の股関節サーボが上腕リンクを前後に振り、リンク先端の膝サーボが直線状のブレードを傾けて足を持ち上げ外側へ動かします。胴体は接地している足によって動きます。上面・側面・正面、8つのサーボ角度、接地と遊脚のタイムラインを表示します。',
  } as L,
  note: { en: 'Joint count read from the photo (two servos per leg). Dimensions and angles are illustrative.', ja: '関節数は写真から読み取った値（1脚2サーボ）です。寸法と角度は説明用です。' } as L,
  fwd: { en: 'Forward', ja: '前進' } as L,
  back: { en: 'Backward', ja: '後退' } as L,
  left: { en: 'Turn left', ja: '左旋回' } as L,
  right: { en: 'Turn right', ja: '右旋回' } as L,
  stop: { en: 'Stop', ja: '停止' } as L,
  crawl: { en: 'Crawl (one leg at a time)', ja: 'クロール（1本ずつ）' } as L,
  trot: { en: 'Trot (diagonal pairs)', ja: 'トロット（対角2本）' } as L,
  speed: { en: 'Cycle time', ja: '1周期' } as L,
  top: { en: 'Top view', ja: '上面' } as L,
  side: { en: 'Side view (left legs)', ja: '側面（左側の脚）' } as L,
  front: { en: 'Front view (front legs)', ja: '正面（前脚）' } as L,
  servos: { en: 'Eight servos (hip, knee)', ja: '8つのサーボ（股・膝）' } as L,
  lanes: { en: 'Stance and swing (orange = foot in the air)', ja: '接地と遊脚（オレンジ=足が空中）' } as L,
  hint: { en: 'Cyan feet are on the ground; orange feet are swinging forward.', ja: 'シアンの足は接地中、オレンジの足は前へ振っている最中です。' } as L,
  alt: { en: 'Spider quadruped walking animation: top, side and front views, eight servo angle bars and a stance and swing timeline.', ja: 'スパイダー四足の歩行アニメーション：上面・側面・正面、8つのサーボ角度、接地と遊脚のタイムライン。' } as L,
}
const CMDS: [Cmd, L][] = [['forward', T.fwd], ['backward', T.back], ['left', T.left], ['right', T.right]]

export default function SpiderView({ lang, onEvent }: { lang: Lang; onEvent?: (e: 'tangle' | 'chaos-gait') => void }) {
  const reduced = useReducedMotion()
  const [running, setRunning] = useState(!reduced)
  const [cmd, setCmd] = useState<Cmd>('forward')
  const [gait, setGait] = useState<Gait>('crawl')
  const [cycleMs, setCycleMs] = useState(2400)
  const [readout, setReadout] = useState('')
  const cv = useRef<HTMLCanvasElement>(null)
  const sim = useRef<SpiderState>(initSpider())
  const cmdRef = useRef<Cmd>('forward')
  const gaitRef = useRef<Gait>('crawl')
  const cycleRef = useRef(2.4)
  const hist = useRef<boolean[][]>([])
  const histT = useRef(0)
  const lastRead = useRef(0)
  const changes = useRef<number[]>([])
  const t = (l: L) => l[lang]

  const pick = (c: Cmd) => {
    setCmd(c); cmdRef.current = c
    const now = performance.now()
    changes.current = [...changes.current.filter((x) => now - x < 10000), now]
    if (changes.current.length >= 6) { changes.current = []; onEvent?.('chaos-gait') }
  }

  const draw = useCallback(() => {
    const c = cv.current, g = c?.getContext('2d')
    if (!c || !g) return
    const s = sim.current
    const tt = (l: L) => l[lang]
    g.fillStyle = '#0b0d12'; g.fillRect(0, 0, W, H)
    g.font = '11px ui-monospace, monospace'
    const colour = (leg: number) => (s.stance[leg] ? CYAN : ORANGE)

    // ---- top view (0..380 x 0..250), camera follows the body ----
    g.save(); g.beginPath(); g.rect(0, 0, 380, 250); g.clip()
    const cx = 190, cy = 135
    const rot = (x: number, y: number) => ({ x: x * Math.cos(s.th) - y * Math.sin(s.th), y: x * Math.sin(s.th) + y * Math.cos(s.th) })
    const P = (x: number, y: number) => ({ x: cx + (x - s.x) * PX, y: cy - (y - s.y) * PX })
    g.strokeStyle = '#161d2a'; g.lineWidth = 1
    const gs = 0.05, gx0 = Math.floor((s.x - 0.35) / gs) * gs, gy0 = Math.floor((s.y - 0.25) / gs) * gs
    for (let i = 0; i < 16; i++) { const a = P(gx0 + i * gs, 0); g.beginPath(); g.moveTo(a.x, 0); g.lineTo(a.x, 250); g.stroke() }
    for (let j = 0; j < 12; j++) { const a = P(0, gy0 + j * gs); g.beginPath(); g.moveTo(0, a.y); g.lineTo(380, a.y); g.stroke() }
    s.prints.forEach((p, k) => { const a = P(p.x, p.y); g.fillStyle = `rgba(255,122,69,${0.12 + 0.3 * (k / s.prints.length)})`; g.beginPath(); g.arc(a.x, a.y, 3.5, 0, 7); g.fill() })
    // body (a small box with a battery bay)
    g.save(); const bc = P(s.x, s.y); g.translate(bc.x, bc.y); g.rotate(-s.th)
    g.fillStyle = '#1b2230'; g.strokeStyle = '#4a5a74'; g.lineWidth = 2; g.beginPath(); g.roundRect(-0.07 * PX, -0.05 * PX, 0.14 * PX, 0.1 * PX, 6); g.fill(); g.stroke()
    g.fillStyle = '#e8ecf8'; g.beginPath(); g.moveTo(0.07 * PX + 6, 0); g.lineTo(0.07 * PX - 4, -5); g.lineTo(0.07 * PX - 4, 5); g.fill()
    g.restore()
    for (let leg = 0; leg < 4; leg++) {
      const f = footBody(leg, s.servos[leg])
      const h = rot(HIP[leg].x, HIP[leg].y), k = rot(f.kx, f.ky), ft = rot(f.x, f.y)
      const H0 = P(s.x + h.x, s.y + h.y), K0 = P(s.x + k.x, s.y + k.y), F0 = P(s.x + ft.x, s.y + ft.y)
      g.strokeStyle = '#6b7a94'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(H0.x, H0.y); g.lineTo(K0.x, K0.y); g.stroke() // upper link
      g.strokeStyle = colour(leg); g.lineWidth = 3; g.beginPath(); g.moveTo(K0.x, K0.y); g.lineTo(F0.x, F0.y); g.stroke() // blade seen from above
      g.fillStyle = '#1f4fa8'; g.fillRect(H0.x - 5, H0.y - 5, 10, 10) // hip servo
      g.fillStyle = '#e8ecf8'; g.beginPath(); g.arc(K0.x, K0.y, 4, 0, 7); g.fill() // knee horn
      g.beginPath(); g.arc(F0.x, F0.y, s.stance[leg] ? 5 : 8, 0, 7)
      if (s.stance[leg]) { g.fillStyle = colour(leg); g.fill() } else { g.strokeStyle = colour(leg); g.lineWidth = 2; g.stroke() }
      g.fillStyle = '#e8ecf8'; g.textAlign = 'center'; g.fillText(LEG_NAME[leg], F0.x, F0.y - 12)
    }
    g.restore()
    g.fillStyle = '#9fb0c4'; g.textAlign = 'left'; g.fillText(tt(T.top), 10, 14)

    // ---- side view of the left legs (390..760 x 0..250) ----
    const sx = 575, gy = 200, SC = 900
    g.fillStyle = '#9fb0c4'; g.fillText(tt(T.side), 400, 14)
    g.strokeStyle = '#3b4a5c'; g.lineWidth = 2; g.beginPath(); g.moveTo(396, gy); g.lineTo(756, gy); g.stroke()
    g.fillStyle = '#1b2230'; g.strokeStyle = '#4a5a74'; g.beginPath(); g.roundRect(sx - 0.07 * SC, gy - BODY_H * SC - 14, 0.14 * SC, 28, 5); g.fill(); g.stroke()
    for (const leg of [0, 2]) {
      const f = footBody(leg, s.servos[leg])
      const hx = sx + HIP[leg].x * SC, hy = gy - BODY_H * SC
      const kx = sx + f.kx * SC, fx = sx + f.x * SC, fz = gy - f.z * SC
      g.strokeStyle = '#6b7a94'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(hx, hy); g.lineTo(kx, hy); g.stroke()
      g.strokeStyle = colour(leg); g.lineWidth = 4; g.beginPath(); g.moveTo(kx, hy); g.lineTo(fx, fz); g.stroke()
      g.fillStyle = '#e8ecf8'; g.beginPath(); g.arc(kx, hy, 4, 0, 7); g.fill()
      g.fillStyle = colour(leg); g.beginPath(); g.arc(fx, fz, 5, 0, 7); g.fill()
      g.fillStyle = '#e8ecf8'; g.textAlign = 'center'; g.fillText(LEG_NAME[leg], hx, hy - 24)
    }
    g.textAlign = 'left'

    // ---- front view of the front legs (0..380 x 255..400) ----
    g.fillStyle = '#9fb0c4'; g.fillText(tt(T.front), 10, 268)
    const fcx = 190, fgy = 380, FS = 900
    g.strokeStyle = '#3b4a5c'; g.lineWidth = 2; g.beginPath(); g.moveTo(10, fgy); g.lineTo(370, fgy); g.stroke()
    g.fillStyle = '#1b2230'; g.strokeStyle = '#4a5a74'; g.beginPath(); g.roundRect(fcx - 0.04 * FS, fgy - BODY_H * FS - 12, 0.08 * FS, 24, 5); g.fill(); g.stroke()
    for (const leg of [0, 1]) {
      const f = footBody(leg, s.servos[leg])
      const hy = fgy - BODY_H * FS
      const hxp = fcx - HIP[leg].y * FS, kxp = fcx - f.ky * FS, fxp = fcx - f.y * FS, fz = fgy - f.z * FS
      g.strokeStyle = '#6b7a94'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(hxp, hy); g.lineTo(kxp, hy); g.stroke()
      g.strokeStyle = colour(leg); g.lineWidth = 4; g.beginPath(); g.moveTo(kxp, hy); g.lineTo(fxp, fz); g.stroke()
      g.fillStyle = '#e8ecf8'; g.beginPath(); g.arc(kxp, hy, 4, 0, 7); g.fill()
      g.fillStyle = colour(leg); g.beginPath(); g.arc(fxp, fz, 5, 0, 7); g.fill()
    }

    // ---- eight servo bars (390..760 x 255..400) ----
    g.fillStyle = '#9fb0c4'; g.fillText(tt(T.servos), 400, 268)
    for (let leg = 0; leg < 4; leg++) {
      const x = 400 + (leg % 2) * 185, y = 278 + Math.floor(leg / 2) * 58
      g.fillStyle = '#e8ecf8'; g.fillText(LEG_NAME[leg], x, y + 9)
      const sv = s.servos[leg]
      const hipV = sv.hip / 0.4, kneeV = (sv.knee - 0.6) / 0.9
      g.fillStyle = '#9fb0c4'; g.fillText('hip', x + 24, y + 9)
      g.fillStyle = '#161d2a'; g.fillRect(x + 48, y, 120, 11); g.fillStyle = '#e8ecf8'; const mid = x + 48 + 60; g.fillRect(hipV >= 0 ? mid : mid + hipV * 60, y, Math.abs(hipV) * 60, 11)
      g.fillStyle = '#9fb0c4'; g.fillText('knee', x + 24, y + 29)
      g.fillStyle = '#161d2a'; g.fillRect(x + 48, y + 20, 120, 11); g.fillStyle = colour(leg); g.fillRect(x + 48, y + 20, Math.max(0, Math.min(1, kneeV)) * 120, 11)
    }

    // ---- stance / swing lanes (full width, bottom) ----
    g.fillStyle = '#9fb0c4'; g.fillText(tt(T.lanes), 10, 412)
    const lx = 10, lw = 700, lh = 10
    for (let i = 0; i < 4; i++) {
      const y = 418 + i * 14
      g.fillStyle = '#10151f'; g.fillRect(lx, y, lw, lh)
      hist.current.forEach((smp, k) => { g.fillStyle = smp[i] ? '#1d6f84' : ORANGE; g.fillRect(lx + (k / 200) * lw, y, lw / 200 + 0.6, lh) })
      g.fillStyle = '#9fb0c4'; g.fillText(LEG_NAME[i], lx + lw + 6, y + 9)
    }
    g.fillStyle = '#9fb0c4'; g.fillText(tt(T.hint), 400, 412)
    void LINK; void BLADE
  }, [lang])

  useSimLoop({
    running, active: true, dt: 1 / 120,
    step: (dt) => {
      sim.current = stepSpider(sim.current, dt, cmdRef.current, gaitRef.current, cycleRef.current)
      histT.current += dt
      if (histT.current >= 0.06) { histT.current = 0; hist.current.push([...sim.current.stance]); if (hist.current.length > 200) hist.current.shift() }
    },
    draw: () => {
      draw()
      const now = performance.now()
      if (now - lastRead.current < 2000) return
      lastRead.current = now
      const s = sim.current
      const down = s.stance.filter(Boolean).length
      setReadout(lang === 'en'
        ? `${gait === 'crawl' ? 'Crawl' : 'Trot'} | cycles ${s.cycles} | moved ${(s.x * 100).toFixed(0)} cm | feet down ${down}/4`
        : `${gait === 'crawl' ? 'クロール' : 'トロット'} | 周期 ${s.cycles} | 移動 ${(s.x * 100).toFixed(0)} cm | 接地 ${down}/4`)
    },
  })
  useEffect(() => { draw() })

  return (
    <SimShell
      title={T.title} lang={lang} summary={T.summary} note={T.note}
      running={running} onToggle={() => setRunning((r) => !r)} onReset={() => { sim.current = initSpider(); hist.current = []; draw() }}
      readout={readout}
      controls={
        <>
          <span role="group" aria-label={t(T.title)} style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            {CMDS.map(([k, label]) => (
              <button key={k} className="btn" aria-pressed={cmd === k} style={cmd === k ? { borderColor: ORANGE, color: ORANGE } : undefined} onClick={() => pick(k)}>{t(label)}</button>
            ))}
            <button className="btn" aria-pressed={cmd === 'idle'} onClick={() => pick('idle')}>{t(T.stop)}</button>
          </span>
          <span role="group" aria-label="gait" style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            {(['crawl', 'trot'] as Gait[]).map((k) => (
              <button key={k} className="btn" aria-pressed={gait === k} style={gait === k ? { borderColor: CYAN, color: CYAN } : undefined} onClick={() => { setGait(k); gaitRef.current = k }}>{t(k === 'crawl' ? T.crawl : T.trot)}</button>
            ))}
          </span>
        </>
      }
      advanced={
        <>
          <label>{t(T.speed)}
            <input type="range" min={1200} max={4000} step={100} value={cycleMs} onChange={(e) => { const v = Number(e.target.value); setCycleMs(v); cycleRef.current = v / 1000 }} />
            {(cycleMs / 1000).toFixed(1)} s
          </label>
        </>
      }
    >
      {() => <canvas ref={cv} width={W} height={H} role="img" aria-label={t(T.alt)} />}
    </SimShell>
  )
}


