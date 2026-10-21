import { useCallback, useEffect, useRef, useState } from 'react'
import SimShell, { type L } from '../SimShell'
import { useReducedMotion, useSimLoop } from '../../lib/hooks'
import { DISCLAIMER, Detector, FS, TREMOR_BAND, createGenerator, dominant, spectrum, type Frame, type Gesture } from './core'

// NEEDS-NATIVE-REVIEW (all JA strings in this file)
type Lang = 'en' | 'ja'
const ORANGE = '#FF7A45', CYAN = '#00B4D8', W = 760, H = 380, HIST = 250

const G_LABEL: Record<Gesture, L> = {
  raise: { en: 'Raise', ja: '持ち上げ' },
  tap: { en: 'Tap', ja: 'タップ' },
  hold: { en: 'Hold', ja: '保持' },
}
const T = {
  title: { en: 'G.A.I.T signal lab', ja: 'G.A.I.T 信号ラボ' },
  summary: {
    en: 'A synthetic six-axis motion sensor stream. A small rhythmic shake in the 4 to 6 Hz band is layered over deliberate movements. The signal is filtered, summarised in a short feature window, and a simple threshold and spectrum-peak rule reports a gesture: raise, tap or hold. Illustrative simulation, not a medical device.',
    ja: '合成した6軸モーションセンサの信号です。意図した動作に4〜6Hz帯の小さな周期的な揺れを重ねています。信号をフィルタし、短い特徴ウィンドウにまとめ、単純なしきい値とスペクトルのピークでジェスチャ（持ち上げ・タップ・保持）を判定します。説明用のシミュレーションであり、医療機器ではありません。',
  },
  amp: { en: 'Tremor amplitude', ja: '揺れの振幅' },
  raw: { en: 'RAW: accelerometer (g) and gyro (deg/s, scaled)', ja: '生信号：加速度(g)・ジャイロ(deg/s、縮尺)' },
  filt: { en: 'FILTERED: 3 Hz low-pass (cyan, tilt) and 0.3-3 Hz band-pass of gyro Y (orange)', ja: 'フィルタ後：3Hzローパス（水色・傾き）、ジャイロY 0.3〜3Hzバンドパス（橙）' },
  feat: { en: 'FEATURE WINDOW: spectrum of accel Y (shaded = 4-6 Hz)', ja: '特徴ウィンドウ：加速度Yのスペクトル（網掛け=4〜6Hz）' },
  chipNone: { en: 'No gesture', ja: 'ジェスチャなし' },
  detected: { en: 'Gesture detected', ja: 'ジェスチャ検出' },
  alt: { en: 'Scrolling sensor traces, filtered traces, and a frequency spectrum', ja: 'スクロールするセンサ波形、フィルタ後の波形、周波数スペクトル' },
  led: { en: 'Wristband LED (illustration)', ja: 'リストバンドLED（イラスト）' },
}

export default function GaitSignalView({ lang }: { lang: Lang }) {
  const reduced = useReducedMotion()
  const [running, setRunning] = useState(!reduced)
  const [level, setLevel] = useState(0.5)
  const [chip, setChip] = useState<Gesture | null>(null)
  const [readout, setReadout] = useState('')
  const cv = useRef<HTMLCanvasElement>(null)
  const gen = useRef(createGenerator(7))
  const det = useRef(new Detector())
  const hist = useRef<Frame[]>([])
  const chipTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const lastRead = useRef(0)
  const t = (l: L) => l[lang]
  useEffect(() => () => clearTimeout(chipTimer.current), [])

  const step = () => {
    const f = det.current.push(gen.current.next(level))
    hist.current.push(f)
    if (hist.current.length > HIST) hist.current.shift()
    if (f.emitted) {
      setChip(f.emitted)
      clearTimeout(chipTimer.current)
      chipTimer.current = setTimeout(() => setChip(null), 1400)
    }
  }

  const draw = useCallback(() => {
    const c = cv.current, ctx = c?.getContext('2d')
    if (!c || !ctx) return
    ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, W, H)
    ctx.font = '11px ui-monospace, monospace'
    const h = hist.current
    const px = (i: number) => 8 + (i / (HIST - 1)) * (W - 16)
    const line = (vals: number[], y0: number, scale: number, color: string, alpha = 1) => {
      ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = 1.5; ctx.beginPath()
      vals.forEach((v, i) => { const x = px(i), y = y0 - v * scale; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y) })
      ctx.stroke(); ctx.globalAlpha = 1
    }
    const panel = (y: number, label: string) => {
      ctx.strokeStyle = '#2f3a55'; ctx.lineWidth = 1; ctx.strokeRect(4, y, W - 8, 112)
      ctx.fillStyle = '#9aa3b8'; ctx.fillText(label, 10, y + 13)
    }
    panel(2, T.raw[lang]); panel(124, T.filt[lang]); panel(246, T.feat[lang])
    if (h.length > 1) {
      const colors = [ORANGE, CYAN, '#c8d0e8']
      for (let k = 0; k < 3; k++) {
        line(h.map((f) => f.raw.acc[k] - (k === 2 ? 1 : 0)), 40, 30, colors[k], 0.9)
        line(h.map((f) => f.raw.gyr[k] / 60), 92, 30, colors[k], 0.6)
      }
      line(h.map((f) => f.lp.acc[0]), 180, 60, CYAN)
      line(h.map((f) => f.bp.gyr[1] / 80), 200, 40, ORANGE)
      // mark detections
      h.forEach((f, i) => { if (f.emitted) { ctx.fillStyle = ORANGE; ctx.fillRect(px(i) - 1, 127, 2, 106); ctx.fillText(G_LABEL[f.emitted][lang], px(i) + 4, 143) } })
    }
    // spectrum of raw accel Y (last 128 samples)
    if (h.length >= 128) {
      const d = dominant(h.slice(-128).map((f) => f.raw.acc[1]))
      const n = 64, bw = (W - 40) / n
      const sp = Array.from({ length: n }, (_, i) => i)
      const maxMag = Math.max(0.05, d.mag)
      const spec = spectrum(h.slice(-128).map((f) => f.raw.acc[1]))
      sp.forEach((i) => {
        const f = (i * FS) / 128
        const inBand = f >= TREMOR_BAND[0] && f <= TREMOR_BAND[1]
        const hh = Math.min(86, (spec[i] / maxMag) * 80)
        ctx.fillStyle = inBand ? 'rgba(255,122,69,0.25)' : 'rgba(0,0,0,0)'; ctx.fillRect(20 + i * bw, 262, bw, 86)
        ctx.fillStyle = inBand ? ORANGE : CYAN; ctx.fillRect(20 + i * bw, 348 - hh, Math.max(1, bw - 1), hh)
      })
      ctx.fillStyle = '#e8ecf8'; ctx.fillText(`peak ${d.freq.toFixed(1)} Hz`, W - 100, 262)
      const now = performance.now()
      if (now - lastRead.current > 2000) {
        lastRead.current = now
        setReadout(lang === 'en' ? `Dominant frequency ${d.freq.toFixed(1)} Hz; ${Math.round(d.tremorShare * 100)}% of power in the 4-6 Hz band` : `主要周波数 ${d.freq.toFixed(1)} Hz、電力の${Math.round(d.tremorShare * 100)}%が4〜6Hz帯`)
      }
    }
  }, [lang])

  useEffect(() => { draw() }, [draw])

  return (
    <SimShell
      title={T.title} lang={lang} summary={T.summary} note={DISCLAIMER}
      running={running} onToggle={() => setRunning((r) => !r)}
      onReset={() => { gen.current = createGenerator(7); det.current = new Detector(); hist.current = []; setChip(null); draw() }}
      readout={readout}
      controls={
        <label>{t(T.amp)}
          <input type="range" min={0} max={1} step={0.05} value={level} onChange={(e) => setLevel(+e.target.value)} />
          <span>{Math.round(level * 100)}%</span>
        </label>
      }
    >
      {(active) => (
        <SignalLoop active={active} running={running} step={step} draw={draw}>
          <p role="note" style={{ margin: '0 0 8px', padding: '6px 10px', border: `2px solid ${ORANGE}`, borderRadius: 8, fontWeight: 700, fontSize: 14, color: '#fff' }}>
            {t(DISCLAIMER)}
          </p>
          <canvas ref={cv} width={W} height={H} role="img" aria-label={t(T.alt)} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <div role="status" aria-live="polite" style={{ padding: '6px 14px', borderRadius: 999, border: `2px solid ${chip ? ORANGE : '#2f3a55'}`, background: chip ? 'rgba(255,122,69,0.18)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: 13, minWidth: 190, textAlign: 'center' }}>
              {chip ? `${t(T.detected)}: ${t(G_LABEL[chip])}` : t(T.chipNone)}
            </div>
            <div role="img" aria-label={t(T.led)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span aria-hidden style={{ width: 14, height: 14, borderRadius: '50%', background: chip ? ORANGE : '#2f3a55', boxShadow: chip ? `0 0 12px ${ORANGE}` : 'none', transition: reduced ? 'none' : 'all .2s' }} />
              {t(T.led)}
            </div>
          </div>
        </SignalLoop>
      )}
    </SimShell>
  )
}

function SignalLoop(p: { active: boolean; running: boolean; step: () => void; draw: () => void; children: React.ReactNode }) {
  useSimLoop({ running: p.running, active: p.active, dt: 1 / FS, step: p.step, draw: p.draw })
  return <>{p.children}</>
}
