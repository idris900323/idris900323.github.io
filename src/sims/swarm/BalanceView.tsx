import { useCallback, useEffect, useRef, useState } from 'react'
import SimShell, { type L } from '../SimShell'
import { useReducedMotion, useSimLoop } from '../../lib/hooks'
import { A_MAX, FALL, PRESETS, command, initBot, push, stepBot, type Bot, type Gains } from './balanceModel'

// NEEDS-NATIVE-REVIEW (all JA strings in this file)
type Lang = 'en' | 'ja'
const CYAN = '#00B4D8', ORANGE = '#FF7A45', GREEN = '#2ECC71', RED = '#E74C3C', W = 760, H = 360
const FLOOR = 262, WHEEL = 30, BODY_H = 128, SC = 260 // px per metre for the floor ticks

const T = {
  title: { en: 'How a two-wheel robot balances itself', ja: '二輪ロボットが自分で倒れずに立つしくみ' } as L,
  summary: {
    en: 'A single self-balancing robot. An IMU measures how far the body leans. The controller turns that lean into a wheel command: the more it leans and the faster it falls, the harder the wheels drive in the lean direction, which puts the wheels back under the body. Shove the robot, switch the controller off, or change the two gains Kp and Kd and watch the tilt chart. Kp too low cannot catch the fall; Kd too low makes it wobble.',
    ja: '自己平衡する1台のロボットです。IMUが車体の傾きを測り、コントローラが傾きを車輪の指令に変えます。傾くほど、倒れる速度が速いほど、傾いた向きへ強く車輪を回し、車輪を体の真下に戻します。ロボットを押す、制御を切る、ゲインKp・Kdを変える、といった操作で傾きグラフの変化を見られます。Kpが小さいと倒れを止められず、Kdが小さいとふらつきます。',
  } as L,
  note: { en: 'Simulated with a simple pendulum-on-a-wheel model; the gains are illustrative, not from a real robot.', ja: '車輪上の倒立振子という簡易モデルでの模擬です。ゲインは説明用で、実機の値ではありません。' } as L,
  hint: { en: 'Click or drag the robot to shove it. Watch the wheels drive under the body.', ja: 'ロボットをクリックまたはドラッグで押してみましょう。車輪が体の下に入り込みます。' } as L,
  hintOff: { en: 'Controller OFF: nothing catches the lean, so it falls. Switch it back on to stand it up.', ja: '制御OFF：傾きを止めるものがなく倒れます。ONに戻すと起き上がります。' } as L,
  fallen: { en: 'Fell over. Click it, or press Stand up.', ja: '転倒しました。クリックするか「起こす」を押してください。' } as L,
  s1: { en: '1  IMU measures the lean', ja: '1  IMUが傾きを測る' } as L,
  s2: { en: '2  Controller decides', ja: '2  コントローラが判断' } as L,
  s3: { en: '3  Motors drive the wheels', ja: '3  モーターが車輪を駆動' } as L,
  tilt: { en: 'tilt', ja: '傾き' } as L,
  rate: { en: 'rate', ja: '角速度' } as L,
  accel: { en: 'wheel acceleration', ja: '車輪の加速度' } as L,
  maxed: { en: 'motors at their limit', ja: 'モーターが限界' } as L,
  chart: { en: 'Tilt over the last 6 s (dashed = fall limit)', ja: '直近6秒の傾き（破線=転倒の限界）' } as L,
  kp: { en: 'Kp (lean gain)', ja: 'Kp（傾きゲイン）' } as L,
  kd: { en: 'Kd (damping)', ja: 'Kd（減衰）' } as L,
  strength: { en: 'Shove strength', ja: '押す強さ' } as L,
  on: { en: 'Controller on', ja: '制御ON' } as L,
  weak: { en: 'Too weak', ja: '弱すぎ' } as L,
  good: { en: 'Good', ja: '適切' } as L,
  harsh: { en: 'Strong, no damping', ja: '強いが減衰なし' } as L,
  pushL: { en: 'Shove back', ja: '後ろへ押す' } as L,
  pushR: { en: 'Shove forward', ja: '前へ押す' } as L,
  stand: { en: 'Stand up', ja: '起こす' } as L,
  try: { en: 'Try: press Too weak, then shove it. Then press Strong, no damping and watch it wobble.', ja: '試してみよう：「弱すぎ」にして押す。次に「強いが減衰なし」にして、ふらつきを見る。' } as L,
  alt: { en: 'A two-wheeled self-balancing robot with a tilt gauge, a three-step diagram from IMU to controller to motors, and a live tilt chart.', ja: '傾きゲージ、IMUからコントローラ、モーターへの3段階の図、傾きのライブグラフを備えた二輪自己平衡ロボット。' } as L,
}

export default function BalanceView({ lang, onEvent }: { lang: Lang; onEvent?: (e: 'poke') => void }) {
  const reduced = useReducedMotion()
  const [running, setRunning] = useState(!reduced)
  const [enabled, setEnabled] = useState(true)
  const [gains, setGains] = useState<Gains>(PRESETS.good)
  const [strength, setStrength] = useState(1.2)
  const [readout, setReadout] = useState('')
  const cv = useRef<HTMLCanvasElement>(null)
  const bot = useRef<Bot>(initBot())
  const g = useRef<Gains>(PRESETS.good)
  const on = useRef(true)
  const str = useRef(1.2)
  const hist = useRef<number[]>([])
  const histT = useRef(0)
  const flash = useRef(0)
  const drag = useRef<{ x: number; moved: boolean } | null>(null)
  const lastRead = useRef(0)
  const t = (l: L) => l[lang]

  const shove = (dir: number) => {
    if (bot.current.fallen) { bot.current = initBot(); return }
    bot.current = push(bot.current, dir * str.current)
    flash.current = dir
    onEvent?.('poke')
  }

  const draw = useCallback(() => {
    const c = cv.current, ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const b = bot.current
    const tt = (l: L) => l[lang]
    ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, W, H)
    ctx.font = '12px ui-monospace, monospace'
    ctx.fillStyle = '#9fb0c4'; ctx.textAlign = 'left'
    ctx.fillText(tt(b.fallen ? T.fallen : on.current ? T.hint : T.hintOff), 10, 18)

    // ---- the robot (left 0..440) ----
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 440, H); ctx.clip()
    const rx = 220
    ctx.strokeStyle = '#2a3446'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, FLOOR + WHEEL); ctx.lineTo(440, FLOOR + WHEEL); ctx.stroke()
    const off = ((b.x * SC) % 40 + 40) % 40
    ctx.strokeStyle = '#3b4a5c'; ctx.lineWidth = 2
    for (let k = -1; k < 13; k++) { const px = k * 40 - off; ctx.beginPath(); ctx.moveTo(px, FLOOR + WHEEL); ctx.lineTo(px, FLOOR + WHEEL + 8); ctx.stroke() }
    // vertical reference
    ctx.strokeStyle = '#3b4a5c'; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.moveTo(rx, FLOOR); ctx.lineTo(rx, FLOOR - BODY_H - 30); ctx.stroke(); ctx.setLineDash([])
    // tilt wedge
    const ang = Math.max(-1.2, Math.min(1.2, b.th))
    ctx.fillStyle = b.fallen ? 'rgba(231,76,60,0.25)' : Math.abs(b.th) > 0.35 ? 'rgba(255,122,69,0.25)' : 'rgba(46,204,113,0.2)'
    ctx.beginPath(); ctx.moveTo(rx, FLOOR); ctx.arc(rx, FLOOR, 70, -Math.PI / 2, -Math.PI / 2 + ang, ang < 0); ctx.closePath(); ctx.fill()
    // body
    ctx.save(); ctx.translate(rx, FLOOR); ctx.rotate(ang)
    ctx.fillStyle = '#1b2230'; ctx.strokeStyle = b.fallen ? RED : CYAN; ctx.lineWidth = 3
    ctx.beginPath(); ctx.roundRect(-20, -BODY_H, 40, BODY_H, 7); ctx.fill(); ctx.stroke()
    ctx.fillStyle = '#c07ad6'; ctx.beginPath(); ctx.roundRect(-14, -BODY_H + 8, 28, 26, 4); ctx.fill() // battery
    ctx.fillStyle = '#16191f'; ctx.fillRect(-15, -BODY_H + 42, 30, 20) // ESP32 board
    ctx.fillStyle = '#7fd0ff'; ctx.fillRect(-12, -BODY_H + 46, 9, 12)
    ctx.fillStyle = ORANGE; ctx.fillRect(-12, -BODY_H + 70, 24, 16) // IMU chip
    ctx.fillStyle = '#0b0d12'; ctx.font = 'bold 10px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText('IMU', 0, -BODY_H + 82)
    ctx.restore()
    // wheel with a spoke so you can see it spin
    ctx.save(); ctx.translate(rx, FLOOR); ctx.rotate(b.x / (WHEEL / SC))
    ctx.fillStyle = '#111418'; ctx.strokeStyle = '#4b5565'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, WHEEL, 0, 7); ctx.fill(); ctx.stroke()
    ctx.strokeStyle = '#e8ecf8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(WHEEL - 6, 0); ctx.stroke()
    ctx.restore()
    ctx.fillStyle = '#e8ecf8'; ctx.beginPath(); ctx.arc(rx, FLOOR, 5, 0, 7); ctx.fill()
    // motor command arrow on the floor under the wheel
    const a = b.a
    if (Math.abs(a) > 0.05) {
      const len = (a / A_MAX) * 90
      ctx.strokeStyle = Math.abs(a) >= A_MAX - 0.01 ? RED : ORANGE; ctx.lineWidth = 5; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(rx, FLOOR + WHEEL + 22); ctx.lineTo(rx + len, FLOOR + WHEEL + 22); ctx.stroke()
      const d = Math.sign(a)
      ctx.beginPath(); ctx.moveTo(rx + len, FLOOR + WHEEL + 22); ctx.lineTo(rx + len - d * 10, FLOOR + WHEEL + 14); ctx.moveTo(rx + len, FLOOR + WHEEL + 22); ctx.lineTo(rx + len - d * 10, FLOOR + WHEEL + 30); ctx.stroke()
    }
    ctx.fillStyle = '#9fb0c4'; ctx.textAlign = 'center'; ctx.fillText(lang === 'en' ? 'wheel drive' : '車輪の駆動', rx, FLOOR + WHEEL + 48)
    if (flash.current !== 0) { ctx.strokeStyle = ORANGE; ctx.lineWidth = 4; const d = flash.current; ctx.beginPath(); ctx.moveTo(rx - d * 80, FLOOR - BODY_H + 20); ctx.lineTo(rx - d * 44, FLOOR - BODY_H + 20); ctx.moveTo(rx - d * 52, FLOOR - BODY_H + 12); ctx.lineTo(rx - d * 44, FLOOR - BODY_H + 20); ctx.lineTo(rx - d * 52, FLOOR - BODY_H + 28); ctx.stroke(); flash.current *= 0.93; if (Math.abs(flash.current) < 0.1) flash.current = 0 }
    ctx.restore()

    // ---- signal flow (right) ----
    const bx = 460, bw = 290
    const deg = (b.th * 180) / Math.PI
    const cmd = command(b, g.current, on.current)
    const box = (y: number, title: string, line1: string, line2: string, col: string) => {
      ctx.fillStyle = '#10151f'; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(bx, y, bw, 58, 8); ctx.fill(); ctx.stroke()
      ctx.fillStyle = '#e8ecf8'; ctx.textAlign = 'left'; ctx.font = 'bold 12px ui-monospace, monospace'; ctx.fillText(title, bx + 10, y + 18)
      ctx.font = '12px ui-monospace, monospace'; ctx.fillStyle = '#c9d3e6'; ctx.fillText(line1, bx + 10, y + 36); ctx.fillText(line2, bx + 10, y + 52)
    }
    box(30, tt(T.s1), `${tt(T.tilt)} ${deg.toFixed(1)}°`, `${tt(T.rate)} ${((b.om * 180) / Math.PI).toFixed(0)}°/s`, ORANGE)
    box(108, tt(T.s2), `a = ${g.current.kp.toFixed(0)}×tilt + ${g.current.kd.toFixed(1)}×rate`, on.current ? `= ${cmd.toFixed(1)} m/s²` : 'OFF', CYAN)
    box(186, tt(T.s3), `${tt(T.accel)} ${b.a.toFixed(1)} m/s²`, Math.abs(b.a) >= A_MAX - 0.01 ? tt(T.maxed) : `≤ ${A_MAX} m/s²`, Math.abs(b.a) >= A_MAX - 0.01 ? RED : GREEN)
    ctx.strokeStyle = '#6b7a94'; ctx.lineWidth = 2
    for (const y of [88, 166]) { ctx.beginPath(); ctx.moveTo(bx + bw / 2, y); ctx.lineTo(bx + bw / 2, y + 20); ctx.lineTo(bx + bw / 2 - 5, y + 14); ctx.moveTo(bx + bw / 2, y + 20); ctx.lineTo(bx + bw / 2 + 5, y + 14); ctx.stroke() }

    // ---- tilt chart (bottom right) ----
    const cx0 = 460, cy0 = 264, cw = 290, ch = 76
    ctx.fillStyle = '#9fb0c4'; ctx.font = '11px ui-monospace, monospace'; ctx.textAlign = 'left'; ctx.fillText(tt(T.chart), cx0, cy0 - 6)
    ctx.fillStyle = '#10151f'; ctx.fillRect(cx0, cy0, cw, ch)
    ctx.strokeStyle = '#3b4a5c'; ctx.setLineDash([3, 4])
    for (const f of [FALL, -FALL]) { const y = cy0 + ch / 2 - (f / FALL) * (ch / 2 - 2); ctx.beginPath(); ctx.moveTo(cx0, y); ctx.lineTo(cx0 + cw, y); ctx.stroke() }
    ctx.setLineDash([]); ctx.strokeStyle = '#2a3446'; ctx.beginPath(); ctx.moveTo(cx0, cy0 + ch / 2); ctx.lineTo(cx0 + cw, cy0 + ch / 2); ctx.stroke()
    ctx.strokeStyle = b.fallen ? RED : CYAN; ctx.lineWidth = 2; ctx.beginPath()
    hist.current.forEach((v, k) => { const px = cx0 + (k / 120) * cw, py = cy0 + ch / 2 - (Math.max(-FALL, Math.min(FALL, v)) / FALL) * (ch / 2 - 2); if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py) })
    ctx.stroke()

    ctx.fillStyle = '#9fb0c4'; ctx.textAlign = 'left'; ctx.font = '11px ui-monospace, monospace'; ctx.fillText(tt(T.try), 10, H - 8)
  }, [lang])

  useSimLoop({
    running, active: true, dt: 1 / 240,
    step: (dt) => {
      bot.current = stepBot(bot.current, dt, g.current, on.current)
      histT.current += dt
      if (histT.current >= 0.05) { histT.current = 0; hist.current.push(bot.current.th); if (hist.current.length > 120) hist.current.shift() }
    },
    draw: () => {
      draw()
      const now = performance.now()
      if (now - lastRead.current < 2000) return
      lastRead.current = now
      const b = bot.current
      setReadout(lang === 'en' ? `${b.fallen ? 'Fallen' : 'Upright'}: tilt ${((b.th * 180) / Math.PI).toFixed(1)} deg, wheel command ${b.a.toFixed(1)} m/s2` : `${b.fallen ? '転倒' : '直立'}：傾き ${((b.th * 180) / Math.PI).toFixed(1)} 度、車輪指令 ${b.a.toFixed(1)} m/s2`)
    },
  })
  useEffect(() => { draw() })

  const setG = (n: Gains) => { setGains(n); g.current = n }
  const preset = (k: keyof typeof PRESETS) => { setG(PRESETS[k]); bot.current = initBot(); setEnabled(true); on.current = true; hist.current = [] }
  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * W }
  const near = (x: number) => Math.abs(x - 220) < 90

  return (
    <SimShell
      title={T.title} lang={lang} summary={T.summary} note={T.note}
      running={running} onToggle={() => setRunning((r) => !r)}
      onReset={() => { bot.current = initBot(); hist.current = []; draw() }}
      readout={readout}
      controls={
        <>
          <button className="btn" onClick={() => shove(-1)}>{t(T.pushL)}</button>
          <button className="btn" onClick={() => shove(1)}>{t(T.pushR)}</button>
          <button className="btn" onClick={() => { bot.current = initBot(); hist.current = [] }}>{t(T.stand)}</button>
          <label>
            <input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); on.current = e.target.checked; if (e.target.checked) bot.current = initBot() }} /> {t(T.on)}
          </label>
          <span role="group" aria-label="presets" style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => preset('weak')}>{t(T.weak)}</button>
            <button className="btn" onClick={() => preset('good')}>{t(T.good)}</button>
            <button className="btn" onClick={() => preset('harsh')}>{t(T.harsh)}</button>
          </span>
        </>
      }
      advanced={
        <>
          <label>{t(T.kp)}
            <input type="range" min={3} max={45} step={1} value={gains.kp} onChange={(e) => setG({ ...gains, kp: Number(e.target.value) })} /> {gains.kp.toFixed(0)}
          </label>
          <label>{t(T.kd)}
            <input type="range" min={0} max={6} step={0.1} value={gains.kd} onChange={(e) => setG({ ...gains, kd: Number(e.target.value) })} /> {gains.kd.toFixed(1)}
          </label>
          <label>{t(T.strength)}
            <input type="range" min={0.4} max={3} step={0.1} value={strength} onChange={(e) => { const v = Number(e.target.value); setStrength(v); str.current = v }} /> {strength.toFixed(1)}
          </label>
        </>
      }
    >
      {() => (
        <canvas ref={cv} width={W} height={H} role="img" aria-label={t(T.alt)} style={{ cursor: 'grab', touchAction: 'none' }}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); const x = pos(e); drag.current = { x, moved: false }; if (bot.current.fallen) { bot.current = initBot(); hist.current = [] } }}
          onPointerMove={(e) => {
            const d = drag.current; if (!d) return
            const x = pos(e), dx = x - d.x
            if (Math.abs(dx) > 5 && !bot.current.fallen) { d.moved = true; d.x = x; bot.current = push(bot.current, Math.max(-1, Math.min(1, dx / 20)) * str.current * 0.6); flash.current = Math.sign(dx); onEvent?.('poke') }
          }}
          onPointerUp={(e) => { const d = drag.current; drag.current = null; if (d && !d.moved && near(d.x)) shove(pos(e) < 220 ? 1 : -1) }}
          onPointerCancel={() => { drag.current = null }}
        />
      )}
    </SimShell>
  )
}
