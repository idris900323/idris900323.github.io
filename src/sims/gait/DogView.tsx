import { useCallback, useEffect, useRef, useState } from 'react'
import SimShell, { type L } from '../SimShell'
import { useReducedMotion, useSimLoop } from '../../lib/hooks'
import { FOOT, LEG_NAME, LEG_PAIR, bodyPose, footWorld, initDog, legLift, stepDog, type Cmd, type DogState } from './dogModel'

// NEEDS-NATIVE-REVIEW (all JA strings in this file)
type Lang = 'en' | 'ja'
const ORANGE = '#FF7A45', CYAN = '#00B4D8', W = 760, H = 460
const PX = 600 // pixels per metre in the top view

const T = {
  title: { en: 'RoboDog: six-servo walking mechanism', ja: 'RoboDog：6サーボの歩行機構' } as L,
  summary: {
    en: 'The body is two plates, each carrying one diagonal pair of legs. Each leg has one servo driving a four-bar linkage that lifts the foot, and two more servos slide and rotate the plates against each other. To step, one diagonal pair lifts, the plates shift, the pair lands, then the other pair lifts and the plates shift back. Views: top-down, side, six servo positions and a lift timeline.',
    ja: '胴体は2枚のプレートで、それぞれが対角の2本の脚を支えます。各脚は1つのサーボで4節リンクを動かして足を持ち上げ、残り2つのサーボがプレート同士を滑らせ・回転させます。一歩ごとに、対角の1組が上がり、プレートがずれ、着地し、もう1組が上がってプレートが戻ります。上面、側面、6つのサーボ位置、持ち上げのタイムラインを表示します。',
  } as L,
  note: {
    en: 'Ideal motion. The real build uses continuous-rotation servos homed on hard stops and moved by timed pulses.',
    ja: '理想的な動作です。実機は連続回転サーボで、ハードストップで原点出しをし、時間指定で動かします。',
  } as L,
  fwd: { en: 'Forward', ja: '前進' } as L,
  back: { en: 'Backward', ja: '後退' } as L,
  left: { en: 'Turn left', ja: '左旋回' } as L,
  right: { en: 'Turn right', ja: '右旋回' } as L,
  stop: { en: 'Stop (finish step)', ja: '停止（一歩を終えて）' } as L,
  live: { en: 'Live', ja: 'ライブ' } as L,
  program: { en: 'Program 8 steps', ja: '8ステップをプログラム' } as L,
  go: { en: 'Go', ja: '実行' } as L,
  clear: { en: 'Clear', ja: '消去' } as L,
  progHint: { en: 'Press direction buttons to record up to 8 steps (one cycle each), then Go. This mirrors the real robot, which plays back a recorded list of moves.', ja: '方向ボタンで最大8ステップ（各1周期）を記録し、実行を押します。実機も記録した動作を順に再生します。' } as L,
  speed: { en: 'Action time', ja: '1動作の時間' } as L,
  hint: { en: 'Pick a direction. Only one diagonal pair is lifted at a time.', ja: '方向を選んでください。持ち上がるのは常に対角の1組だけです。' } as L,
  top: { en: 'Top view', ja: '上面' } as L,
  side: { en: 'Side view (slide exaggerated)', ja: '側面（スライド量を誇張）' } as L,
  servos: { en: 'Six servos', ja: '6つのサーボ' } as L,
  lanes: { en: 'Lift timeline (up = foot raised)', ja: '持ち上げ履歴（上=足が上がる）' } as L,
  alt: { en: 'RoboDog walking mechanism: top view of two plates with diagonal leg pairs, a side view of the four-bar leg linkage, six servo bars and a lift timeline.', ja: 'RoboDogの歩行機構：対角脚を持つ2枚のプレートの上面図、4節リンク脚の側面図、6つのサーボバー、持ち上げのタイムライン。' } as L,
}
const CMD_KEYS: [Cmd, L][] = [['forward', T.fwd], ['backward', T.back], ['left', T.left], ['right', T.right]]

export default function DogView({ lang, onEvent }: { lang: Lang; onEvent?: (e: 'chaos-gait') => void }) {
  const reduced = useReducedMotion()
  const [running, setRunning] = useState(!reduced)
  const [cmd, setCmd] = useState<Cmd>('forward')
  const [actionMs, setActionMs] = useState(350)
  const [readout, setReadout] = useState('')
  const [mode, setMode] = useState<'live' | 'program'>('live')
  const [queue, setQueue] = useState<Cmd[]>([])
  const [playing, setPlaying] = useState(-1)
  const queueRef = useRef<Cmd[]>([])
  const playRef = useRef(-1)
  const lastCycles = useRef(0)
  const cv = useRef<HTMLCanvasElement>(null)
  const sim = useRef<DogState>(initDog())
  const cmdRef = useRef<Cmd>('forward')
  const actionRef = useRef(0.35)
  const hist = useRef<number[][]>([])
  const histT = useRef(0)
  const lastRead = useRef(0)
  const changes = useRef<number[]>([])
  const t = (l: L) => l[lang]

  const reset = useCallback(() => { sim.current = initDog(); hist.current = []; histT.current = 0; playRef.current = -1; setPlaying(-1) }, [])
  const addStep = (c: Cmd) => { if (queueRef.current.length >= 8 || playRef.current >= 0) return; queueRef.current = [...queueRef.current, c]; setQueue(queueRef.current) }
  const go = () => { if (!queueRef.current.length) return; lastCycles.current = sim.current.cycles; playRef.current = 0; cmdRef.current = queueRef.current[0]; setPlaying(0); setRunning(true) }
  const switchMode = (m: 'live' | 'program') => { setMode(m); playRef.current = -1; setPlaying(-1); if (m === 'program') { cmdRef.current = 'idle'; setCmd('idle') } else { cmdRef.current = cmd } }
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
    const t = (l: L) => l[lang]
    g.fillStyle = '#0b0d12'; g.fillRect(0, 0, W, H)
    g.font = '11px ui-monospace, monospace'
    const body = bodyPose(s)

    // ---- top view (left, 0..380 x 0..300): two slabs, slot, pivot bolt, foot pads ----
    g.save(); g.beginPath(); g.rect(0, 0, 380, 300); g.clip()
    const cx = 190, cy = 160
    const P = (x: number, y: number) => ({ x: cx + (x - body.x) * PX, y: cy - (y - body.y) * PX })
    g.strokeStyle = '#161d2a'; g.lineWidth = 1
    const gs = 0.05
    const gx0 = Math.floor((body.x - 0.4) / gs) * gs, gy0 = Math.floor((body.y - 0.3) / gs) * gs
    for (let i = 0; i < 20; i++) { const a = P(gx0 + i * gs, 0); g.beginPath(); g.moveTo(a.x, 0); g.lineTo(a.x, 300); g.stroke() }
    for (let j = 0; j < 14; j++) { const a = P(0, gy0 + j * gs); g.beginPath(); g.moveTo(0, a.y); g.lineTo(380, a.y); g.stroke() }
    s.prints.forEach((p, k) => { const a = P(p.x, p.y); g.fillStyle = `rgba(255,122,69,${0.12 + 0.3 * (k / s.prints.length)})`; g.fillRect(a.x - 4, a.y - 3, 8, 6) })
    // plate B (lower, orange) then plate A (upper, cyan): each slab carries one diagonal pair of legs
    const slab = (pl: { x: number; y: number; th: number }, col: string, z: number) => {
      const a = P(pl.x, pl.y)
      g.save(); g.translate(a.x, a.y); g.rotate(-pl.th)
      g.fillStyle = col + (z ? '30' : '22'); g.strokeStyle = col; g.lineWidth = 2
      g.beginPath(); g.roundRect(-0.115 * PX, -0.07 * PX, 0.23 * PX, 0.14 * PX, 7); g.fill(); g.stroke()
      g.setLineDash([5, 4]); g.strokeStyle = col + '99'; g.beginPath(); g.moveTo(-0.08 * PX, 0); g.lineTo(0.08 * PX, 0); g.stroke(); g.setLineDash([]) // slide slot
      g.restore()
    }
    slab(s.B, ORANGE, 0); slab(s.A, CYAN, 1)
    const pv = P(body.x, body.y)
    g.fillStyle = '#e8ecf8'; g.beginPath(); g.arc(pv.x, pv.y, 4.5, 0, 7); g.fill() // central bolt: the plates slide and rotate about it
    // slide and rotation servos at the back with their levers
    g.fillStyle = '#1f4fa8'; g.fillRect(pv.x - 0.13 * PX, pv.y - 22, 14, 14); g.fillRect(pv.x - 0.13 * PX, pv.y + 8, 14, 14)
    g.strokeStyle = '#9fb0c4'; g.lineWidth = 2; g.beginPath(); g.moveTo(pv.x - 0.13 * PX + 14, pv.y - 15); g.lineTo(pv.x - 0.06 * PX + s.servos.slide * 8, pv.y - 4); g.moveTo(pv.x - 0.13 * PX + 14, pv.y + 15); g.lineTo(pv.x - 0.06 * PX, pv.y + 6 + s.servos.rot * 8); g.stroke()
    for (let leg = 0; leg < 4; leg++) {
      const fw = footWorld(s, leg), f = P(fw.x, fw.y)
      const pl = LEG_PAIR[leg] === 'A' ? s.A : s.B, o = P(pl.x, pl.y)
      const col = LEG_PAIR[leg] === 'A' ? CYAN : ORANGE
      const up = s.servos.lift[leg]
      // leg bracket from the slab edge to the foot pad
      g.strokeStyle = col; g.lineWidth = 5; g.lineCap = 'round'
      g.beginPath(); g.moveTo(o.x + (f.x - o.x) * 0.72, o.y + (f.y - o.y) * 0.72); g.lineTo(f.x, f.y); g.stroke()
      g.save(); g.translate(f.x, f.y); g.rotate(-pl.th)
      g.fillStyle = up > 0.5 ? 'transparent' : col; g.strokeStyle = col; g.lineWidth = 2
      g.beginPath(); g.roundRect(-9 - up * 2, -6 - up * 2, 18 + up * 4, 12 + up * 4, 3); if (up <= 0.5) g.fill(); g.stroke()
      g.restore()
      g.fillStyle = '#e8ecf8'; g.textAlign = 'center'; g.fillText(LEG_NAME[leg], f.x, f.y - 14)
    }
    g.restore()
    g.fillStyle = '#9fb0c4'; g.textAlign = 'left'; g.fillText(t(T.top), 10, 14)
    g.fillStyle = CYAN; g.fillText(lang === 'en' ? 'Plate A: FL + BR' : 'プレートA：FL + BR', 10, 292)
    g.fillStyle = ORANGE; g.fillText(lang === 'en' ? 'Plate B: FR + BL' : 'プレートB：FR + BL', 150, 292)

    // ---- side view (right top, 390..760 x 0..300): parallel-link legs ----
    const sx0 = 390
    g.fillStyle = '#9fb0c4'; g.fillText(t(T.side), sx0 + 10, 14)
    const gy = 262
    g.strokeStyle = '#3b4a5c'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx0 + 10, gy + 4); g.lineTo(W - 10, gy + 4); g.stroke()
    const slideOff = s.servos.slide * 36 // exaggerated
    const plateY = 120, plateH = 16
    const drawPlate = (xoff: number, y: number, col: string) => { g.fillStyle = col + '55'; g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.roundRect(sx0 + 60 + xoff, y, 250, plateH, 5); g.fill(); g.stroke() }
    drawPlate(0, plateY + plateH, ORANGE)
    drawPlate(slideOff, plateY, CYAN)
    ;[0, 2].forEach((leg) => {
      const isA = LEG_PAIR[leg] === 'A'
      const hx = sx0 + (leg === 0 ? 290 : 90) + (isA ? slideOff : 0)
      const hy = plateY + plateH * (isA ? 1 : 2)
      const col = isA ? CYAN : ORANGE
      const u = s.servos.lift[leg]
      const a = (u * 50 * Math.PI) / 180
      const gap = 24
      const Lk = gy + 4 - (hy + 4 + gap + 9) // hip heights differ per layer, so each leg's length reaches the same ground
      const fx = hx - Lk * Math.sin(a), fy = hy + 4 + Lk * Math.cos(a)
      // servo on top of the plate driving a lever
      g.fillStyle = '#1f4fa8'; g.fillRect(hx - 10, hy - 30 - (isA ? 0 : 16), 20, 14)
      g.strokeStyle = '#9fb0c4'; g.lineWidth = 3; g.beginPath(); g.moveTo(hx, hy - 23 - (isA ? 0 : 16)); g.lineTo(hx - 12 * Math.sin(a), hy - 23 - (isA ? 0 : 16) + 12 * Math.cos(a)); g.stroke()
      // parallelogram: two parallel links from the hip bracket to the foot bracket
      g.strokeStyle = col; g.lineWidth = 7; g.lineCap = 'round'
      for (const dy of [0, gap]) { g.beginPath(); g.moveTo(hx, hy + 4 + dy); g.lineTo(fx, fy + dy); g.stroke() }
      g.strokeStyle = '#e8ecf8'; g.lineWidth = 3
      g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx, fy + gap); g.stroke() // foot bracket stays vertical
      g.fillStyle = col; g.beginPath(); g.roundRect(fx - 12, fy + gap + 2, 24, 7, 3); g.fill() // foot pad
      g.fillStyle = '#e8ecf8'; g.textAlign = 'center'; g.fillText(LEG_NAME[leg], hx, plateY - 44)
      void legLift(u)
    })
    g.textAlign = 'left'

    // ---- six servos (bottom left) ----
    g.fillStyle = '#9fb0c4'; g.fillText(t(T.servos), 10, 318)
    const bar = (label: string, v: number, x: number, y: number, centred: boolean, col: string) => {
      g.fillStyle = '#9fb0c4'; g.fillText(label, x, y + 9)
      g.fillStyle = '#161d2a'; g.fillRect(x + 36, y, 130, 11)
      g.fillStyle = col
      if (centred) { const mid = x + 36 + 65; g.fillRect(v >= 0 ? mid : mid + v * 65, y, Math.abs(v) * 65, 11) } else g.fillRect(x + 36, y, v * 130, 11)
    }
    for (let i = 0; i < 4; i++) bar(`L${i + 1} ${LEG_NAME[i]}`.padEnd(6), s.servos.lift[i], 10 + (i % 2) * 190, 328 + Math.floor(i / 2) * 20, false, LEG_PAIR[i] === 'A' ? CYAN : ORANGE)
    bar('SLIDE', s.servos.slide, 10, 372, true, '#e8ecf8')
    bar('ROT  ', s.servos.rot, 200, 372, true, '#e8ecf8')

    // ---- lift timeline (bottom right) ----
    g.fillStyle = '#9fb0c4'; g.fillText(t(T.lanes), sx0 + 10, 318)
    const lx = sx0 + 10, lw = 320, lh = 14
    for (let i = 0; i < 4; i++) {
      const y = 328 + i * 20
      g.fillStyle = '#10151f'; g.fillRect(lx, y, lw, lh)
      g.strokeStyle = LEG_PAIR[i] === 'A' ? CYAN : ORANGE; g.lineWidth = 2; g.beginPath()
      const hs = hist.current
      hs.forEach((smp, k) => { const px = lx + (k / 150) * lw, py = y + lh - 2 - smp[i] * (lh - 4); if (k === 0) g.moveTo(px, py); else g.lineTo(px, py) })
      g.stroke()
      g.fillStyle = '#9fb0c4'; g.fillText(LEG_NAME[i], lx + lw + 4, y + 11)
    }
    g.fillStyle = '#9fb0c4'; g.fillText(t(T.hint), 10, 452)
  }, [lang])

  useSimLoop({
    running, active: true, dt: 1 / 120,
    step: (dt) => {
      sim.current = stepDog(sim.current, dt, cmdRef.current, actionRef.current)
      if (playRef.current >= 0 && sim.current.cycles !== lastCycles.current) {
        lastCycles.current = sim.current.cycles
        playRef.current++
        if (playRef.current >= queueRef.current.length) { playRef.current = -1; cmdRef.current = 'idle'; setPlaying(-1) } else { cmdRef.current = queueRef.current[playRef.current]; setPlaying(playRef.current) }
      }
      histT.current += dt
      if (histT.current >= 0.05) {
        histT.current = 0
        hist.current.push([...sim.current.servos.lift]); if (hist.current.length > 150) hist.current.shift()
      }
    },
    draw: () => {
      draw()
      const now = performance.now()
      if (now - lastRead.current < 2000) return
      lastRead.current = now
      const b = bodyPose(sim.current)
      setReadout(lang === 'en'
        ? `Cycles ${sim.current.cycles} | forward ${(b.x * 100).toFixed(0)} cm | heading ${((b.th * 180) / Math.PI).toFixed(0)} deg | feet down ${sim.current.servos.lift.filter((l) => l < 0.15).length}/4`
        : `サイクル ${sim.current.cycles} | 前進 ${(b.x * 100).toFixed(0)} cm | 向き ${((b.th * 180) / Math.PI).toFixed(0)} 度 | 接地 ${sim.current.servos.lift.filter((l) => l < 0.15).length}/4`)
    },
  })
  useEffect(() => { draw() })
  void FOOT

  return (
    <SimShell
      title={T.title} lang={lang} summary={T.summary} note={T.note}
      running={running} onToggle={() => setRunning((r) => !r)} onReset={() => { reset(); draw() }}
      readout={readout}
      controls={
        <>
          <span role="group" aria-label={t(T.title)} style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            <button className="btn" aria-pressed={mode === 'live'} onClick={() => switchMode('live')}>{t(T.live)}</button>
            <button className="btn" aria-pressed={mode === 'program'} onClick={() => switchMode('program')}>{t(T.program)}</button>
          </span>
          <span role="group" aria-label={t(T.title)} style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            {CMD_KEYS.map(([k, label]) => (
              <button key={k} className="btn" aria-pressed={mode === 'live' && cmd === k} style={mode === 'live' && cmd === k ? { borderColor: ORANGE, color: ORANGE } : undefined} onClick={() => (mode === 'live' ? pick(k) : addStep(k))}>{mode === 'program' ? '+ ' : ''}{t(label)}</button>
            ))}
            {mode === 'live' && <button className="btn" aria-pressed={cmd === 'idle'} onClick={() => pick('idle')}>{t(T.stop)}</button>}
            {mode === 'program' && <button className="btn" onClick={go} disabled={!queue.length || playing >= 0}>{t(T.go)}</button>}
            {mode === 'program' && <button className="btn" onClick={() => { queueRef.current = []; setQueue([]); playRef.current = -1; setPlaying(-1); cmdRef.current = 'idle' }}>{t(T.clear)}</button>}
          </span>
          {mode === 'program' && (
            <span role="status" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, flexBasis: '100%' }}>
              {queue.length === 0 ? t(T.progHint) : queue.map((c, i) => (
                <span key={i} style={{ marginRight: 8, color: i === playing ? ORANGE : undefined, fontWeight: i === playing ? 700 : 400 }}>{i + 1}:{c === 'forward' ? 'F' : c === 'backward' ? 'B' : c === 'left' ? 'L' : 'R'}</span>
              ))}
            </span>
          )}
        </>
      }
      advanced={
        <>
          <label>{t(T.speed)}
            <input type="range" min={150} max={800} step={10} value={actionMs} onChange={(e) => { const v = Number(e.target.value); setActionMs(v); actionRef.current = v / 1000 }} />
            {actionMs} ms
          </label>
        </>
      }
    >
      {() => <canvas ref={cv} width={W} height={H} role="img" aria-label={t(T.alt)} />}
    </SimShell>
  )
}
