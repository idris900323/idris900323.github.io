import { useCallback, useEffect, useRef, useState } from 'react'
import { StepForward } from 'lucide-react'
import SimShell, { type L } from '../SimShell'
import { useReducedMotion } from '../../lib/hooks'
import {
  PRESETS, loadPreset, mnemonicOf, stepClock,
  type Block, type CpuEvent, type CpuState, type MicroId, type Preset,
} from './core'

// NEEDS-NATIVE-REVIEW (all Japanese strings in this file)
const ORANGE = '#FF7A45'

const T = {
  title: { en: '8-bit CPU (SAP-1 style)', ja: '8ビットCPU（SAP-1方式）' },
  summary: {
    en: 'A schematic of an 8-bit computer after Ben Eater: program counter, memory address register, 16 bytes of RAM, instruction register, A and B registers, ALU, output register, clock and control logic, all sharing one 8-bit bus. Step the clock to watch each instruction run through micro-steps T1 to T6.',
    ja: 'Ben Eater 氏の設計に基づく8ビットコンピュータの回路図です。プログラムカウンタ、メモリアドレスレジスタ、16バイトRAM、命令レジスタ、A/Bレジスタ、ALU、出力レジスタ、クロック、制御回路が1本の8ビットバスを共有します。クロックを進めると、各命令がマイクロステップT1〜T6で実行される様子を確認できます。',
  },
  note: { en: 'Design inspired by Ben Eater.', ja: '設計は Ben Eater 氏に着想を得ています。' },
  step: { en: 'Step clock', ja: 'クロックを1つ進める' },
  speed: { en: 'Speed', ja: '速度' },
  program: { en: 'Program', ja: 'プログラム' },
  bus: { en: 'Bus', ja: 'バス' },
  tstate: { en: 'Step', ja: 'ステップ' },
  next: { en: 'next', ja: '次' },
  ok: { en: 'Running normally.', ja: '正常に動作中です。' },
  halted: { en: 'Halted (HLT).', ja: '停止しました（HLT）。' },
  overflow: { en: 'Integer overflow: 255 + 1 wrapped to 0.', ja: '整数オーバーフロー：255 + 1 が 0 に戻りました。' },
  flags: { en: 'Flags', ja: 'フラグ' },
  mem: { en: 'RAM', ja: 'RAM' },
} satisfies Record<string, L>

const MICRO: Record<MicroId, L> = {
  ready: { en: 'Ready. Press Step clock.', ja: '準備完了。「クロックを1つ進める」を押してください。' },
  'pc>mar': { en: 'PC -> bus -> MAR', ja: 'PC → バス → MAR' },
  'ram>ir,pc++': { en: 'RAM[MAR] -> bus -> IR; PC + 1', ja: 'RAM[MAR] → バス → IR、PC + 1' },
  'ir>mar': { en: 'IR operand -> bus -> MAR', ja: 'IRオペランド → バス → MAR' },
  'ram>a': { en: 'RAM[MAR] -> bus -> A', ja: 'RAM[MAR] → バス → A' },
  'ram>b': { en: 'RAM[MAR] -> bus -> B', ja: 'RAM[MAR] → バス → B' },
  'alu>a': { en: 'ALU result -> bus -> A', ja: 'ALU結果 → バス → A' },
  'a>ram': { en: 'A -> bus -> RAM[MAR]', ja: 'A → バス → RAM[MAR]' },
  'ir>a': { en: 'IR operand -> bus -> A', ja: 'IRオペランド → バス → A' },
  'ir>pc': { en: 'IR operand -> bus -> PC (jump)', ja: 'IRオペランド → バス → PC（ジャンプ）' },
  'a>out': { en: 'A -> bus -> OUT', ja: 'A → バス → OUT' },
  halt: { en: 'HLT: clock stopped', ja: 'HLT：クロック停止' },
  idle: { en: 'No operation this step', ja: 'このステップでは何もしません' },
  fault: { en: 'Illegal opcode: decode failed', ja: '不正なオペコード：デコード失敗' },
  stopped: { en: 'Stopped. Press Reset.', ja: '停止中。リセットしてください。' },
}

const bin8 = (n: number) => n.toString(2).padStart(8, '0')
const bin4 = (n: number) => n.toString(2).padStart(4, '0')

type Box = { id: Block; x: number; y: number; w: number; h: number; bits: 4 | 8 | 0; get?: (s: CpuState) => number }
const BOXES: Box[] = [
  { id: 'CLK', x: 20, y: 16, w: 100, h: 78, bits: 0 },
  { id: 'PC', x: 140, y: 16, w: 120, h: 78, bits: 4, get: (s) => s.pc },
  { id: 'MAR', x: 280, y: 16, w: 120, h: 78, bits: 4, get: (s) => s.mar },
  { id: 'RAM', x: 420, y: 16, w: 280, h: 78, bits: 8, get: (s) => s.ram[s.mar] },
  { id: 'IR', x: 20, y: 176, w: 130, h: 78, bits: 8, get: (s) => s.ir },
  { id: 'A', x: 170, y: 176, w: 130, h: 78, bits: 8, get: (s) => s.a },
  { id: 'ALU', x: 320, y: 176, w: 100, h: 78, bits: 0 },
  { id: 'B', x: 440, y: 176, w: 130, h: 78, bits: 8, get: (s) => s.b },
  { id: 'OUT', x: 590, y: 176, w: 110, h: 78, bits: 8, get: (s) => s.out },
  { id: 'CTRL', x: 20, y: 276, w: 680, h: 52, bits: 0 },
]
const BUS_Y = 135

function Runner(p: { active: boolean; hz: number; onTick: () => void }) {
  const { active, hz, onTick } = p
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(onTick, 1000 / hz)
    return () => window.clearInterval(id)
  }, [active, hz, onTick])
  return null
}

export default function Cpu8Sim({ lang, onEvent }: { lang: 'en' | 'ja'; onEvent?: (e: CpuEvent) => void }) {
  const t = (l: L) => l[lang]
  const reduced = useReducedMotion()
  const [presetId, setPresetId] = useState<Preset['id']>('add')
  const [cpu, setCpu] = useState<CpuState>(() => loadPreset('add'))
  const [running, setRunning] = useState(false) // never auto-runs
  const [hz, setHz] = useState(3)
  const [live, setLive] = useState('')
  const cpuRef = useRef(cpu)
  const onEventRef = useRef(onEvent)
  useEffect(() => { cpuRef.current = cpu; onEventRef.current = onEvent })

  // Surface step events to the caller once per tick.
  useEffect(() => {
    if (cpu.event) onEventRef.current?.(cpu.event)
  }, [cpu.ticks, cpu.event])

  const stopped = cpu.halted || cpu.fault !== null

  const doStep = useCallback(() => setCpu((c) => stepClock(c)), [])
  const reset = useCallback((id: Preset['id']) => { setCpu(loadPreset(id)); setRunning(false) }, [])

  const faultText = cpu.fault ? (lang === 'en' ? cpu.fault : '不正なオペコードを検出しました：' + cpu.fault.replace('Illegal opcode ', '')) : null
  const statusText = faultText ?? (cpu.halted ? t(T.halted) : cpu.overflow ? t(T.overflow) : t(T.ok))

  // aria-live text, refreshed at most every 2 s.
  useEffect(() => {
    const upd = () => {
      const c = cpuRef.current
      const m = mnemonicOf(c.ir)
      setLive(`${lang === 'en' ? 'Step' : 'ステップ'} T${c.t || '-'}; PC ${c.pc}; A ${c.a}; B ${c.b}; OUT ${c.out}${m ? '; ' + m : ''}`)
    }
    upd()
    const id = window.setInterval(upd, 2000)
    return () => window.clearInterval(id)
  }, [lang])

  const activeSet = new Set<Block>(cpu.active)
  const nextT = stopped ? 0 : (cpu.t % 6) + 1
  const mnem = mnemonicOf(cpu.ir)

  return (
    <SimShell
      title={T.title}
      lang={lang}
      summary={T.summary}
      note={T.note}
      running={running && !stopped}
      onToggle={() => { if (!stopped) setRunning((r) => !r) }}
      onReset={() => reset(presetId)}
      controls={
        <>
          <button className="btn" onClick={doStep} disabled={stopped}>
            <StepForward size={14} aria-hidden="true" /> {t(T.step)}
          </button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            {t(T.speed)}
            <input type="range" min={1} max={10} step={1} value={hz} onChange={(e) => setHz(Number(e.target.value))} aria-valuetext={`${hz} Hz`} />
            <span style={{ minWidth: 34, fontVariantNumeric: 'tabular-nums' }}>{hz} Hz</span>
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            {t(T.program)}
            <select
              value={presetId}
              onChange={(e) => { const id = e.target.value as Preset['id']; setPresetId(id); reset(id) }}
              style={{ background: 'var(--bg-card, #1E2128)', color: 'var(--text, #F2F1EC)', border: '1px solid var(--line, #3A3F47)', borderRadius: 6, padding: '0 8px' }}
            >
              {PRESETS.map((pr) => <option key={pr.id} value={pr.id}>{t(pr.name)}</option>)}
            </select>
          </label>
        </>
      }
      readout={live}
    >
      {(visible) => (
        <div>
          <Runner active={visible && running && !stopped} hz={hz} onTick={doStep} />
          <svg
            viewBox="0 0 720 420"
            role="img"
            aria-label={t(T.title)}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            <rect width="720" height="420" fill="#000" />
            {/* bus */}
            <rect x="20" y={BUS_Y - 6} width="680" height="12" rx="6" fill="#2a2d34" />
            <text x="26" y={BUS_Y - 12} fill="#A8ACB4" fontSize="11">{t(T.bus)} (8-bit)</text>
            {BOXES.filter((b) => b.id !== 'CTRL' && b.id !== 'CLK').map((b) => {
              const cx = b.x + b.w / 2
              const top = b.y < BUS_Y
              return <line key={'w' + b.id} x1={cx} x2={cx} y1={top ? b.y + b.h : BUS_Y} y2={top ? BUS_Y : b.y} stroke={activeSet.has(b.id) ? ORANGE : '#3A3F47'} strokeWidth="2" />
            })}
            {/* bus LEDs */}
            {Array.from({ length: 8 }, (_, i) => {
              const on = ((cpu.bus >> (7 - i)) & 1) === 1
              return <circle key={i} cx={470 + i * 26} cy={BUS_Y} r="8" fill={on ? ORANGE : '#14161A'} stroke={on ? '#ffc2a8' : '#3A3F47'} strokeWidth="1.5" />
            })}
            <text x="440" y={BUS_Y + 4} fill="#F2F1EC" fontSize="12" textAnchor="end" style={{ fontVariantNumeric: 'tabular-nums' }}>{cpu.bus}</text>
            {BOXES.map((b) => {
              const on = activeSet.has(b.id)
              const v = b.get?.(cpu)
              return (
                <g key={b.id}>
                  <rect
                    x={b.x} y={b.y} width={b.w} height={b.h} rx="8"
                    fill={on ? 'rgba(255,122,69,0.16)' : '#1E2128'}
                    stroke={on ? ORANGE : '#3A3F47'} strokeWidth={on ? 2.5 : 1.5}
                    style={{ filter: on ? `drop-shadow(0 0 8px ${ORANGE})` : undefined, transition: reduced ? undefined : 'all 120ms' }}
                  />
                  <text x={b.x + 10} y={b.y + 20} fill={on ? ORANGE : '#F2F1EC'} fontSize="14" fontWeight="700">
                    {b.id === 'CTRL' ? (lang === 'en' ? 'CONTROL' : '制御') : b.id}
                  </text>
                  {v !== undefined && (
                    <>
                      <text x={b.x + 10} y={b.y + 46} fill="#F2F1EC" fontSize="15" fontFamily="ui-monospace, Menlo, monospace">
                        {b.bits === 4 ? bin4(v) : bin8(v)}
                      </text>
                      <text x={b.x + 10} y={b.y + 66} fill="#A8ACB4" fontSize="12" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {v}{b.id === 'IR' && mnem ? ` ${mnem} ${v & 15}` : ''}
                      </text>
                    </>
                  )}
                  {b.id === 'CLK' && <text x={b.x + 10} y={b.y + 50} fill="#A8ACB4" fontSize="12">{cpu.ticks} ticks</text>}
                  {b.id === 'ALU' && <text x={b.x + 10} y={b.y + 50} fill="#A8ACB4" fontSize="12">C={+cpu.carry} Z={+cpu.zero}</text>}
                  {b.id === 'CTRL' && (
                    <>
                      {[1, 2, 3, 4, 5, 6].map((n, i) => (
                        <g key={n}>
                          <circle cx={b.x + 120 + i * 40} cy={b.y + 26} r="12" fill={cpu.t === n ? ORANGE : '#14161A'} stroke={nextT === n ? '#F2F1EC' : '#3A3F47'} strokeWidth="1.5" strokeDasharray={nextT === n && cpu.t !== n ? '3 2' : undefined} />
                          <text x={b.x + 120 + i * 40} y={b.y + 30} textAnchor="middle" fontSize="11" fontWeight="700" fill={cpu.t === n ? '#000' : '#A8ACB4'}>T{n}</text>
                        </g>
                      ))}
                      <text x={b.x + 380} y={b.y + 31} fill="#F2F1EC" fontSize="13">{t(MICRO[cpu.microId])}</text>
                    </>
                  )}
                </g>
              )
            })}
            {/* RAM contents strip */}
            <g aria-hidden="true">
              <text x="20" y="352" fill="#A8ACB4" fontSize="11">{t(T.mem)}</text>
              {cpu.ram.map((v, i) => (
                <g key={i}>
                  <rect x={20 + i * 42.5} y="358" width="40" height="44" rx="4" fill={i === cpu.mar && activeSet.has('RAM') ? 'rgba(255,122,69,0.2)' : '#14161A'} stroke={i === cpu.pc ? '#F2F1EC' : '#3A3F47'} />
                  <text x={20 + i * 42.5 + 20} y="372" fill="#A8ACB4" fontSize="9" textAnchor="middle">{i}</text>
                  <text x={20 + i * 42.5 + 20} y="386" fill="#F2F1EC" fontSize="10" textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace">{v.toString(16).toUpperCase().padStart(2, '0')}</text>
                  <text x={20 + i * 42.5 + 20} y="398" fill="#A8ACB4" fontSize="8" textAnchor="middle">{mnemonicOf(v) ?? ''}</text>
                </g>
              ))}
            </g>
          </svg>
          <p style={{ margin: '8px 4px 0', fontSize: 13, lineHeight: 1.5 }}>
            <strong style={{ color: ORANGE }}>{t(T.tstate)} {cpu.t ? 'T' + cpu.t : '-'}</strong>
            {' · '}{t(MICRO[cpu.microId])}
            {nextT ? <span style={{ color: 'var(--text-muted, #A8ACB4)' }}> ({t(T.next)}: T{nextT})</span> : null}
          </p>
          <p style={{ margin: '4px 4px 8px', fontSize: 12, color: 'var(--text-muted, #A8ACB4)' }}>
            {statusText}
            {' · '}{t(T.flags)}: C={+cpu.carry} Z={+cpu.zero}
          </p>
        </div>
      )}
    </SimShell>
  )
}
