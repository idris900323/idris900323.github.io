import { useEffect, useRef, useState } from 'react'
import SimShell, { type L } from '../SimShell'
import { useReducedMotion, useSimLoop } from '../../lib/hooks'
import {
  LEAK_THRESHOLD, LOW_FLOW_THRESHOLD, N_SEG, currentSegment, newScan, progress, reading, stepScan, type Scan,
} from './core'

// NEEDS-NATIVE-REVIEW (all ja strings)
const T = {
  title: { en: 'In-pipe leak inspection', ja: '管内リーク検査' } as L,
  summary: {
    en: 'A robot scans a pipe of ten segments from upstream to downstream. Place a leak on any segment; the robot detects the permanent pressure drop and flow reduction downstream of it and pins the location.',
    ja: '10区間の配管を上流から下流へロボットが走査します。任意の区間にリークを置くと、その下流の恒久的な圧力低下と流量低下を検出し、位置を表示します。',
  } as L,
  note: { en: 'Proposed design, simulated only.', ja: '提案設計であり、シミュレーションのみです。' } as L,
  scan: { en: 'Scan', ja: 'スキャン' } as L,
  clear: { en: 'Clear leak', ja: 'リークを除去' } as L,
  place: { en: 'Place leak on segment', ja: 'リークを置く区間' } as L,
  up: { en: 'UPSTREAM', ja: '上流' } as L,
  down: { en: 'DOWNSTREAM', ja: '下流' } as L,
  pressure: { en: 'Pressure (bar)', ja: '圧力 (bar)' } as L,
  flow: { en: 'Flow (m/s)', ja: '流量 (m/s)' } as L,
  leakTh: { en: 'Leak Threshold', ja: 'リーク閾値' } as L,
  flowTh: { en: 'Low Flow Threshold', ja: '低流量閾値' } as L,
  progress: { en: 'Progress', ja: '進捗' } as L,
}

const W = 640, H = 320, X0 = 30, SW = 58, PY = 86, PH = 38
const GREEN = '#2ECC71', RED = '#E74C3C', ORANGE = '#FF7A45'

/** Mirrors SimShell's render-prop `active` flag into parent state. */
function ActiveSync({ active, onChange }: { active: boolean; onChange: (a: boolean) => void }) {
  useEffect(() => { onChange(active) }, [active, onChange])
  return null
}

export default function PipeSim({ lang, onEvent }: { lang: 'en' | 'ja'; onEvent?: (e: string) => void }) {
  const reduced = useReducedMotion()
  const [running, setRunning] = useState(() => !reduced)
  const [active, setActive] = useState(false)
  const [leak, setLeak] = useState<number | null>(null)
  const [ui, setUi] = useState({ seg: 1, found: null as number | null, done: false })
  const cv = useRef<HTMLCanvasElement>(null)
  const scan = useRef<Scan>(newScan())
  const leakRef = useRef<number | null>(null)
  const t = (l: L) => l[lang]

  const status = (seg: number, found: number | null, done: boolean) =>
    found !== null
      ? lang === 'en' ? `Leak detected in Segment ${found}: permanent pressure drop and flow reduction downstream` : `区間${found}でリークを検出：下流で恒久的な圧力低下と流量低下`
      : done
        ? lang === 'en' ? 'Scan complete: no leak detected' : 'スキャン完了：リークなし'
        : lang === 'en' ? `Scanning Segment ${seg}: Normal pressure & flow detected` : `区間${seg}をスキャン中：圧力・流量は正常です`

  function draw() {
    const c = cv.current
    const g = c?.getContext('2d')
    if (!c || !g) return
    const s = scan.current
    const seg = currentSegment(s)
    const r = reading(seg, leakRef.current)
    const alarm = s.found !== null
    g.fillStyle = '#0b0d12'
    g.fillRect(0, 0, W, H)
    g.font = '11px ui-monospace, monospace'
    g.textAlign = 'center'
    for (let i = 1; i <= N_SEG; i++) {
      const x = X0 + (i - 1) * SW
      const downOfLeak = leakRef.current !== null && i >= leakRef.current
      g.fillStyle = downOfLeak ? '#3a2226' : '#1c2733'
      g.fillRect(x, PY, SW - 2, PH)
      g.strokeStyle = i === seg && !s.done ? ORANGE : '#3b4a5c'
      g.lineWidth = i === seg ? 2 : 1
      g.strokeRect(x, PY, SW - 2, PH)
      g.fillStyle = '#9fb0c4'
      g.fillText(`S${i}`, x + SW / 2 - 1, PY - 8)
      if (leakRef.current === i) {
        g.fillStyle = RED
        g.beginPath(); g.moveTo(x + SW / 2 - 1, PY + PH + 4); g.quadraticCurveTo(x + SW / 2 + 9, PY + PH + 20, x + SW / 2 - 1, PY + PH + 26); g.quadraticCurveTo(x + SW / 2 - 11, PY + PH + 20, x + SW / 2 - 1, PY + PH + 4); g.fill()
      }
    }
    g.fillStyle = '#9fb0c4'
    g.textAlign = 'left'; g.fillText(`< ${t(T.up)}`, X0, 26)
    g.textAlign = 'right'; g.fillText(`${t(T.down)} >`, X0 + N_SEG * SW - 2, 26)
    // robot
    const rx = X0 + Math.min(s.pos, N_SEG - 0.5 + 0.01) * SW
    const cx = Math.min(rx, X0 + N_SEG * SW - 14)
    g.fillStyle = alarm ? RED : ORANGE
    g.beginPath(); g.arc(cx + 14, PY + PH / 2, 11, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#0b0d12'; g.fillRect(cx + 17, PY + PH / 2 - 3, 6, 6)
    // bars
    const bar = (y: number, label: string, v: number, max: number, th: number, thLabel: string) => {
      const bw = 460, bx = 150
      g.textAlign = 'left'; g.fillStyle = '#e8ecf8'; g.fillText(label, 16, y + 12)
      g.fillStyle = '#1c2733'; g.fillRect(bx, y, bw, 18)
      g.fillStyle = v < th ? RED : GREEN
      g.fillRect(bx, y, (Math.max(0, v) / max) * bw, 18)
      const tx = bx + (th / max) * bw
      g.strokeStyle = '#ffd24a'; g.setLineDash([4, 3]); g.lineWidth = 1.5
      g.beginPath(); g.moveTo(tx, y - 4); g.lineTo(tx, y + 22); g.stroke(); g.setLineDash([])
      g.fillStyle = '#ffd24a'; g.textAlign = 'center'; g.fillText(thLabel, tx, y + 34)
      g.fillStyle = '#e8ecf8'; g.textAlign = 'right'; g.fillText(v.toFixed(2), bx + bw, y - 5)
    }
    bar(168, t(T.pressure), r.pressure, 7, LEAK_THRESHOLD, `${t(T.leakTh)} ${LEAK_THRESHOLD}`)
    bar(232, t(T.flow), r.flow, 2.5, LOW_FLOW_THRESHOLD, `${t(T.flowTh)} ${LOW_FLOW_THRESHOLD}`)
    // status + progress
    g.textAlign = 'left'; g.font = 'bold 13px ui-monospace, monospace'
    g.fillStyle = alarm ? RED : GREEN
    g.fillText(status(seg, s.found, s.done), 16, 292)
    g.textAlign = 'right'; g.fillStyle = '#e8ecf8'
    g.fillText(`${t(T.progress)} ${progress(s)}%`, W - 16, 316)
  }

  useSimLoop({
    running, active, dt: 1 / 60,
    step: (dt) => { scan.current = stepScan(scan.current, leakRef.current, dt) },
    draw: () => {
      draw()
      const s = scan.current
      const seg = currentSegment(s)
      setUi((u) => (u.seg === seg && u.found === s.found && u.done === s.done ? u : { seg, found: s.found, done: s.done }))
    },
  })
  useEffect(() => { draw() })
  useEffect(() => { if (ui.found !== null) onEvent?.('leak-found') }, [ui.found, onEvent])

  const rescan = (run = true) => {
    scan.current = newScan()
    setUi({ seg: 1, found: null, done: false })
    if (run) setRunning(true)
  }
  const pick = (k: number | null) => {
    leakRef.current = k
    setLeak(k)
    rescan(true)
  }
  const onCanvas = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const b = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - b.left) / b.width) * W
    const k = Math.floor((x - X0) / SW) + 1
    if (k >= 1 && k <= N_SEG) pick(leak === k ? null : k)
  }

  const label = lang === 'en'
    ? `Pipe with ten segments S1 to S10. ${leak ? `Leak placed on segment ${leak}.` : 'No leak placed.'} Click a segment to place a leak.`
    : `S1からS10までの10区間の配管。${leak ? `区間${leak}にリークあり。` : 'リークなし。'}区間をクリックしてリークを置けます。`

  return (
    <SimShell
      title={T.title} lang={lang} summary={T.summary} note={T.note}
      running={running} onToggle={() => setRunning((r) => !r)}
      onReset={() => { leakRef.current = null; setLeak(null); rescan(false); setRunning(false) }}
      controls={
        <>
          <button className="btn" onClick={() => rescan(true)}>{t(T.scan)}</button>
          <button className="btn" onClick={() => pick(null)} disabled={leak === null}>{t(T.clear)}</button>
          <label>{t(T.place)}
            <select value={leak ?? 0} onChange={(e) => pick(Number(e.target.value) || null)}>
              <option value={0}>-</option>
              {Array.from({ length: N_SEG }, (_, i) => i + 1).map((k) => <option key={k} value={k}>{`S${k}`}</option>)}
            </select>
          </label>
        </>
      }
      readout={<>{status(ui.seg, ui.found, ui.done)}</>}
    >
      {(a) => (
        <>
          <ActiveSync active={a} onChange={setActive} />
          <canvas ref={cv} width={W} height={H} role="img" aria-label={label} onClick={onCanvas} style={{ cursor: 'pointer' }} />
        </>
      )}
    </SimShell>
  )
}
