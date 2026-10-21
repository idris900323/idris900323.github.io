import { useCallback, useEffect, useRef, useState } from 'react'
import SimShell, { type L } from '../SimShell'
import { useReducedMotion, useSimLoop } from '../../lib/hooks'
import {
  ARENA, CHASSIS, GATES, OBSTACLES, PROFILE, TEST_SECONDS, TEST_START, checkGates, collide, disconnect, initBot, initPairing, keysToInput, mix, pwm,
  runTest, startPairing, stepBot, stepPairing, stickToInput, testInput, type Bot, type Chassis, type Input, type TestKind, type TestResult,
} from './core'

// NEEDS-NATIVE-REVIEW (all JA strings in this file)
type Lang = 'en' | 'ja'
const ORANGE = '#FF7A45', CYAN = '#00B4D8'
const BASE = import.meta.env.BASE_URL
const DRAW_SCALE = 1.3 // the drawings are modelled at ~54 px long; scale them up to match the collision radius

const CHASSIS_LABEL: Record<Chassis, L> = {
  castor: { en: '2-wheel + castor', ja: '2輪＋キャスター' },
  fourwd: { en: '4-wheel', ja: '4輪' },
  tank: { en: 'Tracked tank', ja: 'クローラー（戦車型）' },
}
const PHOTO: Record<Chassis, string> = { castor: 'image8', fourwd: 'image9', tank: 'image10' }
const INFO: Record<Chassis, { how: L; tryIt: L }> = {
  castor: {
    how: {
      en: 'Two driven wheels and one free castor. It can spin on the spot, accelerates quickly and is the most agile. The castor trails behind a turn and flutters when you reverse.',
      ja: '駆動輪2つと自由に向きを変えるキャスター1つ。その場で回転でき、加速が速く、最も機敏です。キャスターは旋回に遅れてついてきて、後退すると揺れます。',
    },
    tryIt: { en: 'Try the Pivot test, then reverse and watch the castor flutter.', ja: '「その場回転」テストを試し、後退してキャスターの揺れを見てください。' },
  },
  fourwd: {
    how: {
      en: 'Four driven wheels share the load and grip well in a straight line. To turn, the wheels must scrub sideways, so it turns more widely, loses speed in the turn and slides a little.',
      ja: '駆動輪4つで荷重を分け、直進のグリップは良好です。旋回では車輪が横にこすれるため、旋回半径が大きく、旋回中に速度が落ち、少し横滑りします。',
    },
    tryIt: { en: 'Run the Arc test and compare: wider and slower than the 2-wheel car.', ja: '「弧を描く」テストで比べると、2輪より大回りで遅くなります。' },
  },
  tank: {
    how: {
      en: 'Two tracks. It turns by running one track faster, with a lot of sideways slip. It is the slowest, but it drives over small rubble that stops the wheeled cars.',
      ja: 'クローラー2本。片側を速くして旋回し、横滑りが大きめです。最も遅い一方、車輪型を止める小さながれきを乗り越えられます。',
    },
    tryIt: { en: 'Drive straight over the grey rubble piles. The wheeled cars bump into them.', ja: '灰色のがれきの山を真っすぐ乗り越えてみてください。車輪型はぶつかります。' },
  },
}
const FAIL_MSG: L[] = [
  { en: 'Pairing failed. This happens a lot with Bluetooth, so just try again.', ja: 'ペアリングに失敗しました。Bluetoothではよくあることです。もう一度どうぞ。' },
  { en: 'Failed again. Is the module powered, and is the baud rate right?', ja: 'また失敗しました。モジュールの電源とボーレートを確認してください。' },
  { en: 'Still failing. Are the TX and RX wires swapped?', ja: 'まだ失敗します。TXとRXの配線が逆ではありませんか？' },
  { en: 'Hmm. Is another phone already connected to the module?', ja: 'うーん。別のスマートフォンがすでに接続していませんか？' },
  { en: 'Still no link. Power-cycle everything and try one more time.', ja: '接続できません。すべての電源を入れ直してもう一度お試しください。' },
]
const T = {
  title: { en: 'Drive-a-bot arena: three chassis', ja: 'ドライブ・アリーナ：3つのシャーシ' },
  summary: {
    en: 'Top-down arena with three robots matching the real builds: a 2-wheel car with a castor, a 4-wheel car and a tracked tank. Each one drives differently. Pick a chassis, read how it drives, run the Arc and Pivot tests to compare, then connect over a simulated Bluetooth link and drive around the obstacles and through the gates with W A S D, the arrow keys or the on-screen joystick. Live motor PWM bars show the left and right commands.',
    ja: '実機に対応した3台（キャスター付き2輪車、4輪車、クローラー型）を上から操縦するアリーナです。それぞれ挙動が違います。シャーシを選び、特徴を読み、「弧を描く」「その場回転」テストで比べ、模擬Bluetoothで接続して、W A S D・矢印キー・画面上のジョイスティックで障害物を避けながらゲートを通ります。モーターPWMバーで左右の指令値を確認できます。',
  },
  note: { en: 'Bluetooth pairing is simulated; no radio is used. Handling is illustrative, not measured.', ja: 'Bluetoothペアリングは模擬です（実際の無線は使いません）。挙動は説明用で、実測ではありません。' },
  chassis: { en: 'Chassis', ja: 'シャーシ' },
  connect: { en: 'Connect Bluetooth (simulated)', ja: 'Bluetooth接続（模擬）' },
  disconnect: { en: 'Disconnect (simulated)', ja: '切断（模擬）' },
  idle: { en: 'Not connected. Press Connect to drive, or run a test below.', ja: '未接続です。操縦するには接続してください（下のテストは接続なしで実行できます）。' },
  scanning: { en: 'Scanning for HC-05 ...', ja: 'HC-05を検索中...' },
  pairing: { en: 'Pairing ...', ja: 'ペアリング中...' },
  connected: { en: 'Connected (simulated). Click the arena, then use WASD or arrows.', ja: '接続しました（模擬）。アリーナをクリックしてWASDまたは矢印キーで操縦。' },
  stick: { en: 'Virtual joystick', ja: '仮想ジョイスティック' },
  arena: { en: 'Drive arena. Focus here and use WASD or arrow keys.', ja: 'ドライブ・アリーナ。ここにフォーカスしてWASDまたは矢印キーで操縦。' },
  left: { en: 'Left motor PWM', ja: '左モーターPWM' },
  right: { en: 'Right motor PWM', ja: '右モーターPWM' },
  lap: { en: 'Lap', ja: 'ラップ' },
  best: { en: 'Best', ja: 'ベスト' },
  bumps: { en: 'Bumps', ja: '衝突' },
  how: { en: 'How it drives', ja: '特徴' },
  tryIt: { en: 'Try this', ja: '試してみよう' },
  tests: { en: 'Compare', ja: '比べる' },
  arcTest: { en: 'Arc test', ja: '弧を描く' },
  pivotTest: { en: 'Pivot test', ja: 'その場回転' },
  steps: { en: '1 Connect  2 Click the arena  3 Drive: W A S D, arrows or the joystick', ja: '1 接続  2 アリーナをクリック  3 操縦：W A S D・矢印キー・ジョイスティック' },
  hudSpeed: { en: 'speed', ja: '速度' },
  hudTurn: { en: 'turn', ja: '旋回' },
  hudSlide: { en: 'slide', ja: '横滑り' },
  rubble: { en: 'rubble', ja: 'がれき' },
}
const PROFILE_LABEL: Record<keyof (typeof PROFILE)['castor'], L> = {
  agility: { en: 'Agility', ja: '機敏さ' },
  speed: { en: 'Top speed', ja: '最高速度' },
  grip: { en: 'Grip', ja: 'グリップ' },
  obstacles: { en: 'Rough ground', ja: '不整地' },
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string, lw = 1.5) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r)
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke() }
}
const wheel = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, hub?: string) => {
  rr(ctx, x - w / 2, y - h / 2, w, h, 2.5, '#111418', '#2d333d', 1)
  ctx.strokeStyle = '#2b313b'; ctx.lineWidth = 1
  for (let i = -w / 2 + 2; i < w / 2; i += 3) { ctx.beginPath(); ctx.moveTo(x + i, y - h / 2); ctx.lineTo(x + i, y + h / 2); ctx.stroke() }
  if (hub) { ctx.fillStyle = hub; ctx.fillRect(x - w * 0.22, y - h * 0.18, w * 0.44, h * 0.36) }
}
const cells = (ctx: CanvasRenderingContext2D, x: number, y: number, n: number, vertical: boolean, len: number, cw: number) => {
  rr(ctx, x - 1.5, y - 1.5, vertical ? n * cw + 3 : len + 3, vertical ? len + 3 : n * cw + 3, 2, '#14161b')
  for (let i = 0; i < n; i++) {
    if (vertical) rr(ctx, x + i * cw, y, cw - 1, len, 2, '#c07ad6')
    else rr(ctx, x, y + i * cw, len, cw - 1, 2, '#c07ad6')
  }
}

/** Top-down drawings modelled on the three photos (robot faces +x). */
function drawCastorCar(ctx: CanvasRenderingContext2D, castor: number) {
  rr(ctx, -27, -17, 54, 34, 3, '#b8935a', '#7a5b30', 1.5) // cardboard/wood base
  wheel(ctx, -17, -21, 16, 7); wheel(ctx, -17, 21, 16, 7) // two drive wheels at the rear
  cells(ctx, -25, -12, 4, true, 24, 4.6) // 4x 18650 pack
  rr(ctx, -2, -13, 26, 26, 1.5, '#c27b2c') // perfboard
  rr(ctx, 9, -11, 13, 9, 1, '#16191f'); ctx.fillStyle = '#7fd0ff'; ctx.fillRect(10, -10, 4, 7) // ESP32
  rr(ctx, 0, 3, 13, 9, 1, '#c0392b') // motor driver
  rr(ctx, 0, -11, 6, 7, 1, '#2f5fd0') // buck converter
  rr(ctx, 24, -15, 5, 30, 1.5, '#d2ab72', '#7a5b30', 1) // wooden block at the front
  // castor wheel at the front, swivelling
  ctx.save(); ctx.translate(30, 0); ctx.rotate(castor)
  ctx.strokeStyle = '#9aa3b2'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, 0); ctx.stroke()
  ctx.fillStyle = '#1b1f26'; ctx.beginPath(); ctx.arc(-9, 0, 3.4, 0, 7); ctx.fill()
  ctx.restore()
}
function drawFourWheel(ctx: CanvasRenderingContext2D) {
  for (const [x, y] of [[-16, -21], [16, -21], [-16, 21], [16, 21]] as const) wheel(ctx, x, y, 18, 8, '#e8c33a')
  rr(ctx, -26, -17, 52, 34, 9, 'rgba(186,222,236,0.55)', '#8fc3d8', 1.5) // acrylic plate
  ctx.strokeStyle = 'rgba(40,80,100,0.45)'; ctx.lineWidth = 1
  for (const [x, y] of [[-6, -11], [8, -11], [-14, 10], [12, 9]] as const) { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.stroke() }
  rr(ctx, -4, -9, 18, 14, 1.5, '#1f4fa8', '#143578', 1) // blue motor driver shield
  ctx.fillStyle = '#16191f'; for (let i = 0; i < 3; i++) ctx.fillRect(-1 + i * 5.5, -6, 4, 8)
  cells(ctx, -22, 7, 2, false, 18, 5.2) // 2x 18650 in a holder
  ctx.fillStyle = '#d83a3a'; ctx.fillRect(-23, -3, 4, 3) // switch
}
function drawTank(ctx: CanvasRenderingContext2D) {
  for (const sy of [-1, 1]) {
    rr(ctx, -31, sy * 20 - 6, 62, 12, 6, '#15181d', '#2b313b', 1.5)
    ctx.strokeStyle = '#2f3641'; ctx.lineWidth = 1.2
    for (let i = -28; i < 30; i += 4) { ctx.beginPath(); ctx.moveTo(i, sy * 20 - 6); ctx.lineTo(i, sy * 20 + 6); ctx.stroke() }
    for (const wx of [-24, 24]) { ctx.fillStyle = '#4b5565'; ctx.beginPath(); ctx.arc(wx, sy * 20, 4.5, 0, 7); ctx.fill() }
  }
  rr(ctx, -27, -13, 54, 26, 3, '#b9946a', '#7a5b30', 1.2) // cardboard base
  rr(ctx, -25, -11, 50, 22, 4, 'rgba(196,228,240,0.38)', 'rgba(150,200,220,0.8)', 1.2) // acrylic top plate
  rr(ctx, -12, -8, 14, 14, 1.5, '#1f5fb0', '#143578', 1) // controller board
  cells(ctx, 6, -8, 2, false, 15, 5) // battery
  ctx.fillStyle = '#d4af37'; for (const [x, y] of [[-23, -9], [23, -9], [-23, 9], [23, 9]] as const) { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill() }
}

export default function ArenaView({ lang, pairingFailures = 0 }: { lang: Lang; pairingFailures?: number }) {
  const reduced = useReducedMotion()
  const [running, setRunning] = useState(!reduced)
  const [kind, setKind] = useState<Chassis>('castor')
  const [pair, setPair] = useState(initPairing)
  const [pwmL, setPwmL] = useState(0)
  const [pwmR, setPwmR] = useState(0)
  const [readout, setReadout] = useState('')
  const [result, setResult] = useState<TestResult | null>(null)
  const cv = useRef<HTMLCanvasElement>(null)
  const bot = useRef<Bot>(initBot())
  const keys = useRef(new Set<string>())
  const stick = useRef<Input>({ throttle: 0, turn: 0 })
  const knob = useRef<HTMLDivElement>(null)
  const lastUi = useRef(0)
  const trail = useRef<{ x: number; y: number }[]>([])
  const trailTick = useRef(0)
  const test = useRef<{ kind: TestKind; t: number; path: { x: number; y: number }[] } | null>(null)
  const t = (l: L) => l[lang]
  const connected = pair.phase === 'connected'

  useEffect(() => {
    if (pair.phase !== 'scanning' && pair.phase !== 'pairing') return
    const id = setInterval(() => setPair((p) => stepPairing(p, 0.05, pairingFailures)), 50)
    return () => clearInterval(id)
  }, [pair.phase, pairingFailures])

  const currentInput = (): Input => {
    const ts = test.current
    if (ts) return testInput(ts.kind)
    if (!connected) return { throttle: 0, turn: 0 }
    const k = keysToInput(keys.current), s = stick.current
    return { throttle: Math.max(-1, Math.min(1, k.throttle + s.throttle)), turn: Math.max(-1, Math.min(1, k.turn + s.turn)) }
  }

  const step = (dt: number) => {
    const inp = currentInput()
    let b = stepBot(bot.current, dt, inp, kind)
    const ts = test.current
    if (ts) {
      ts.t += dt
      if (ts.t >= TEST_SECONDS) test.current = null // finished: the robot stops and the result stays on screen
    } else {
      b = collide(b, kind)
      b = checkGates(b).bot
    }
    bot.current = b
    if (++trailTick.current % 6 === 0) { trail.current.push({ x: b.x, y: b.y }); if (trail.current.length > 140) trail.current.shift() }
  }

  const draw = useCallback(() => {
    const c = cv.current, ctx = c?.getContext('2d')
    if (!c || !ctx) return
    const b = bot.current
    const tt = (l: L) => l[lang]
    ctx.save()
    ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, c.width, c.height)
    const sh = b.shake * 6
    ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh)
    ctx.strokeStyle = '#1d2536'; ctx.lineWidth = 1
    for (let x = 0; x <= ARENA.w; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ARENA.h); ctx.stroke() }
    for (let y = 0; y <= ARENA.h; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ARENA.w, y); ctx.stroke() }
    GATES.forEach((g, i) => {
      const isNext = i === b.next % GATES.length
      ctx.strokeStyle = isNext ? ORANGE : CYAN; ctx.globalAlpha = isNext ? 1 : 0.35; ctx.lineWidth = isNext ? 3 : 2
      ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, 7); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1
      ctx.fillStyle = isNext ? ORANGE : '#9aa3b8'; ctx.font = '12px ui-monospace, monospace'; ctx.fillText(i === 0 ? 'S/F' : String(i), g.x - 8, g.y + 4)
    })
    OBSTACLES.forEach((o) => {
      if (o.rubble) {
        ctx.fillStyle = '#3a3f49'; ctx.strokeStyle = '#6a7282'; ctx.lineWidth = 2
        ctx.beginPath(); for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2, rad = o.r * (0.78 + 0.22 * Math.sin(k * 2.3)); const px = o.x + Math.cos(a) * rad, py = o.y + Math.sin(a) * rad; if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py) } ctx.closePath(); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#9aa3b8'; ctx.font = '10px ui-monospace, monospace'; ctx.textAlign = 'center'; ctx.fillText(tt(T.rubble), o.x, o.y + 3); ctx.textAlign = 'left'
      } else { ctx.fillStyle = '#2b3550'; ctx.strokeStyle = '#4b5a80'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, 7); ctx.fill(); ctx.stroke() }
    })
    ctx.strokeStyle = ORANGE; ctx.lineWidth = 4; ctx.strokeRect(0, 0, ARENA.w, ARENA.h)
    // path trail (fading) so turning behaviour is visible
    const tr = trail.current
    for (let i = 1; i < tr.length; i++) { ctx.strokeStyle = `rgba(0,180,216,${(i / tr.length) * 0.55})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tr[i - 1].x, tr[i - 1].y); ctx.lineTo(tr[i].x, tr[i].y); ctx.stroke() }
    // robot
    ctx.save()
    ctx.translate(b.x, b.y); ctx.rotate(b.theta); ctx.scale(DRAW_SCALE, DRAW_SCALE)
    if (kind === 'castor') drawCastorCar(ctx, b.castor)
    else if (kind === 'fourwd') drawFourWheel(ctx)
    else drawTank(ctx)
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.moveTo(CHASSIS[kind].radius / DRAW_SCALE + 12, 0); ctx.lineTo(CHASSIS[kind].radius / DRAW_SCALE + 4, -5); ctx.lineTo(CHASSIS[kind].radius / DRAW_SCALE + 4, 5); ctx.fill()
    ctx.restore()
    // test start marker
    if (test.current) { ctx.strokeStyle = ORANGE; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(TEST_START.x, TEST_START.y, 6, 0, 7); ctx.stroke(); ctx.setLineDash([]) }
    // HUD
    ctx.font = '12px ui-monospace, monospace'; ctx.fillStyle = '#c9d3e6'; ctx.textAlign = 'left'
    ctx.fillText(`${tt(T.hudSpeed)} ${Math.abs(b.vx).toFixed(0)}  ${tt(T.hudTurn)} ${((b.omega * 180) / Math.PI).toFixed(0)}°/s  ${tt(T.hudSlide)} ${Math.abs(b.vy).toFixed(0)}`, 12, 20)
    if (!connected && !test.current) { ctx.fillStyle = 'rgba(11,13,18,0.7)'; ctx.fillRect(0, ARENA.h - 34, ARENA.w, 34); ctx.fillStyle = '#e8ecf8'; ctx.fillText(tt(T.idle), 12, ARENA.h - 13) }
    ctx.restore()
    const now = performance.now()
    if (now - lastUi.current > 100) {
      lastUi.current = now
      const m = mix(currentInput())
      setPwmL(pwm(m.l) * Math.sign(m.l || 1)); setPwmR(pwm(m.r) * Math.sign(m.r || 1))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, lang, connected])

  useEffect(() => { draw() }, [draw])
  useEffect(() => {
    const id = setInterval(() => {
      const b = bot.current
      setReadout(`${t(T.lap)} ${b.lapTime.toFixed(1)} s | ${t(T.best)} ${b.best === null ? '-' : b.best.toFixed(1) + ' s'} | ${t(T.bumps)} ${b.bumps}`)
    }, 2000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])

  const startTest = (k: TestKind) => {
    const out = runTest(kind, k)
    bot.current = { ...initBot(), x: TEST_START.x, y: TEST_START.y, theta: -Math.PI / 2 }
    trail.current = []
    test.current = { kind: k, t: 0, path: out.path }
    setResult(out.result)
  }
  const switchKind = (k: Chassis) => { setKind(k); bot.current = initBot(); trail.current = []; test.current = null; setResult(null) }

  const status = pair.phase === 'failed' ? t(FAIL_MSG[pair.failMsg]) : t(T[pair.phase === 'idle' ? 'idle' : pair.phase])
  const onKey = (down: boolean) => (e: React.KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) return
    e.preventDefault()
    if (down) keys.current.add(k); else keys.current.delete(k)
  }
  const moveStick = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const dx = ((e.clientX - r.left) / r.width - 0.5) * 2, dy = ((e.clientY - r.top) / r.height - 0.5) * 2
    stick.current = stickToInput(dx, dy)
    const m = Math.hypot(dx, dy), k = m > 1 ? 1 / m : 1
    if (knob.current) knob.current.style.transform = `translate(${dx * k * 36}px, ${dy * k * 36}px)`
  }
  const endStick = () => { stick.current = { throttle: 0, turn: 0 }; if (knob.current) knob.current.style.transform = 'translate(0,0)' }

  const bar = (v: number, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      <span style={{ width: 120 }}>{label}</span>
      <div role="meter" aria-label={label} aria-valuemin={-255} aria-valuemax={255} aria-valuenow={v} style={{ position: 'relative', flex: 1, height: 10, background: '#1a2030', borderRadius: 5 }}>
        <div style={{ position: 'absolute', left: v >= 0 ? '50%' : `${50 + (v / 255) * 50}%`, width: `${(Math.abs(v) / 255) * 50}%`, top: 0, bottom: 0, background: v >= 0 ? CYAN : ORANGE, borderRadius: 5 }} />
      </div>
      <span style={{ width: 36, textAlign: 'right' }}>{v}</span>
    </div>
  )
  const prof = PROFILE[kind]

  return (
    <SimShell
      title={T.title} lang={lang} summary={T.summary} note={T.note}
      running={running} onToggle={() => setRunning((r) => !r)}
      onReset={() => { bot.current = initBot(); trail.current = []; test.current = null; setResult(null); draw() }}
      readout={<>{status}<br />{readout}</>}
      controls={
        <>
          <div role="group" aria-label={t(T.chassis)} style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
            {(Object.keys(CHASSIS) as Chassis[]).map((k) => (
              <button key={k} className="btn" aria-pressed={kind === k} style={kind === k ? { borderColor: ORANGE, color: ORANGE } : undefined} onClick={() => switchKind(k)}>{t(CHASSIS_LABEL[k])}</button>
            ))}
          </div>
          <button className="btn" disabled={pair.phase === 'scanning' || pair.phase === 'pairing'} onClick={() => setPair((p) => (p.phase === 'connected' ? disconnect(p) : startPairing(p)))}>
            {connected ? t(T.disconnect) : t(T.connect)}
          </button>
        </>
      }
    >
      {(active) => (
        <ArenaLoop active={active && running} running={running} step={step} draw={draw}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 8, color: '#e8ecf8' }}>
            <img src={`${BASE}media/img/${PHOTO[kind]}-640.webp`} alt="" width={120} height={84} loading="lazy" style={{ width: 120, height: 84, objectFit: 'cover', borderRadius: 8, border: '1px solid #3a3f47', flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 220, fontSize: 13, lineHeight: 1.5 }}>
              <strong>{t(CHASSIS_LABEL[kind])}.</strong> {t(INFO[kind].how)}
              <div style={{ color: '#ffb48f', marginTop: 4 }}>{t(T.tryIt)}: {t(INFO[kind].tryIt)}</div>
            </div>
            <div style={{ display: 'grid', gap: 4, minWidth: 190, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
              {(Object.keys(PROFILE_LABEL) as (keyof typeof prof)[]).map((k) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 96 }}>{t(PROFILE_LABEL[k])}</span>
                  <div style={{ flex: 1, height: 8, background: '#1a2030', borderRadius: 4 }}>
                    <div style={{ width: `${prof[k] * 100}%`, height: '100%', background: ORANGE, borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div tabIndex={0} role="group" aria-label={t(T.arena)} onKeyDown={onKey(true)} onKeyUp={onKey(false)} onBlur={() => keys.current.clear()} style={{ outlineOffset: 2 }}>
            <canvas ref={cv} width={ARENA.w} height={ARENA.h} role="img" aria-label={t(T.arena)} />
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <div
              role="group" aria-label={t(T.stick)}
              onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); moveStick(e) }}
              onPointerMove={(e) => { if (e.buttons) moveStick(e) }}
              onPointerUp={endStick} onPointerCancel={endStick}
              style={{ width: 120, height: 120, borderRadius: '50%', border: `2px solid ${CYAN}`, position: 'relative', touchAction: 'none', background: '#11151f', flex: 'none' }}
            >
              <div ref={knob} style={{ position: 'absolute', left: 38, top: 38, width: 44, height: 44, borderRadius: '50%', background: ORANGE, opacity: connected ? 1 : 0.4 }} />
            </div>
            <div style={{ flex: 1, minWidth: 200, display: 'grid', gap: 6 }}>
              {bar(pwmL, t(T.left))}
              {bar(pwmR, t(T.right))}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#9fb0c4' }}>{t(T.steps)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#9fb0c4' }}>{t(T.tests)}:</span>
            <button className="btn" onClick={() => startTest('arc')}>{t(T.arcTest)}</button>
            <button className="btn" onClick={() => startTest('pivot')}>{t(T.pivotTest)}</button>
            {result && (
              <span role="status" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#e8ecf8' }}>
                {result.kind === 'arc'
                  ? (lang === 'en' ? `Arc: turn radius ${result.radius?.toFixed(0) ?? '-'} px, speed ${result.speed.toFixed(0)} px/s, drifted ${result.drift.toFixed(0)} px` : `弧：旋回半径 ${result.radius?.toFixed(0) ?? '-'} px、速度 ${result.speed.toFixed(0)} px/s、移動 ${result.drift.toFixed(0)} px`)
                  : (lang === 'en' ? `Pivot: spins ${result.spinDegPerS.toFixed(0)} deg/s, moved ${result.drift.toFixed(0)} px from the spot` : `その場回転：${result.spinDegPerS.toFixed(0)} 度/秒、位置のずれ ${result.drift.toFixed(0)} px`)}
              </span>
            )}
          </div>
        </ArenaLoop>
      )}
    </SimShell>
  )
}

function ArenaLoop(p: { active: boolean; running: boolean; step: (dt: number) => void; draw: () => void; children: React.ReactNode }) {
  useSimLoop({ running: p.running, active: p.active, step: p.step, draw: p.draw })
  return <>{p.children}</>
}
