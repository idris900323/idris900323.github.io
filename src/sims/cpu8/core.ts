/** Pure SAP-1 style 8-bit CPU (Ben Eater design). 4-bit opcode + 4-bit operand, 16 bytes RAM. */

export type Block = 'PC' | 'MAR' | 'RAM' | 'IR' | 'A' | 'B' | 'ALU' | 'OUT' | 'CLK' | 'CTRL'
export type CpuEvent = 'overflow' | 'illegal' | 'halt' | 'out'
export type MicroId =
  | 'ready' | 'pc>mar' | 'ram>ir,pc++' | 'ir>mar' | 'ram>a' | 'ram>b' | 'alu>a' | 'a>ram'
  | 'ir>a' | 'ir>pc' | 'a>out' | 'halt' | 'idle' | 'fault' | 'stopped'

export const OPCODES = { LDA: 0x1, ADD: 0x2, SUB: 0x3, STA: 0x4, LDI: 0x5, JMP: 0x6, OUT: 0xe, HLT: 0xf } as const
export type Mnemonic = keyof typeof OPCODES
const NAME_BY_OP: Record<number, Mnemonic> = Object.fromEntries(
  (Object.entries(OPCODES) as [Mnemonic, number][]).map(([k, v]) => [v, k]),
)
export const mnemonicOf = (byte: number): Mnemonic | null => NAME_BY_OP[(byte >> 4) & 0xf] ?? null

export interface CpuState {
  pc: number
  mar: number
  ram: number[]
  ir: number
  a: number
  b: number
  out: number
  carry: boolean
  zero: boolean
  /** Sticky: an ADD wrapped past 255 back through 0. */
  overflow: boolean
  halted: boolean
  fault: string | null
  /** Micro-step just executed: 0 before the first step, then 1..6. */
  t: number
  /** Completed clock ticks. */
  ticks: number
  bus: number
  active: Block[]
  microId: MicroId
  microOp: string
  /** Event raised by the latest step only. */
  event: CpuEvent | null
}

export const RAM_SIZE = 16

export function initialState(ram: number[] = []): CpuState {
  const mem = Array.from({ length: RAM_SIZE }, (_, i) => (ram[i] ?? 0) & 0xff)
  return {
    pc: 0, mar: 0, ram: mem, ir: 0, a: 0, b: 0, out: 0,
    carry: false, zero: false, overflow: false, halted: false, fault: null,
    t: 0, ticks: 0, bus: 0, active: [], microId: 'ready', microOp: 'Ready', event: null,
  }
}

export function stepClock(s: CpuState): CpuState {
  if (s.halted || s.fault) {
    return { ...s, event: null, active: [], microId: 'stopped', microOp: s.fault ? 'Stopped: ' + s.fault : 'Halted' }
  }
  const t = (s.t % 6) + 1
  const n: CpuState = { ...s, ram: s.ram.slice(), t, ticks: s.ticks + 1, event: null }
  const set = (active: Block[], microId: MicroId, microOp: string, bus: number) => {
    n.active = ['CLK', 'CTRL', ...active]
    n.microId = microId
    n.microOp = microOp
    n.bus = bus & 0xff
  }
  const idle = () => set([], 'idle', 'No operation this step', n.bus)

  if (t === 1) { n.mar = n.pc; set(['PC', 'MAR'], 'pc>mar', 'PC -> bus -> MAR', n.pc); return n }
  if (t === 2) {
    n.ir = n.ram[n.mar]
    n.pc = (n.pc + 1) & 0xf
    set(['RAM', 'IR', 'PC'], 'ram>ir,pc++', 'RAM[MAR] -> bus -> IR; PC + 1', n.ir)
    return n
  }
  const op = (n.ir >> 4) & 0xf
  const arg = n.ir & 0xf
  const m = NAME_BY_OP[op]
  if (!m) {
    if (t === 3) {
      n.fault = `Illegal opcode ${op.toString(2).padStart(4, '0')} at address ${(n.pc - 1) & 0xf}`
      n.event = 'illegal'
      set([], 'fault', 'Decode failed: ' + n.fault, n.bus)
    } else idle()
    return n
  }
  if (t >= 6) { idle(); return n }
  switch (m) {
    case 'LDA':
      if (t === 3) { n.mar = arg; set(['IR', 'MAR'], 'ir>mar', 'IR operand -> bus -> MAR', arg) }
      else if (t === 4) { n.a = n.ram[n.mar]; set(['RAM', 'A'], 'ram>a', 'RAM[MAR] -> bus -> A', n.a) }
      else idle()
      break
    case 'ADD':
    case 'SUB':
      if (t === 3) { n.mar = arg; set(['IR', 'MAR'], 'ir>mar', 'IR operand -> bus -> MAR', arg) }
      else if (t === 4) { n.b = n.ram[n.mar]; set(['RAM', 'B'], 'ram>b', 'RAM[MAR] -> bus -> B', n.b) }
      else {
        const raw = m === 'ADD' ? n.a + n.b : n.a - n.b
        const r = raw & 0xff
        n.a = r
        n.carry = m === 'ADD' ? raw > 255 : raw >= 0
        n.zero = r === 0
        if (m === 'ADD' && raw > 255) { n.overflow = true; n.event = 'overflow' }
        set(['ALU', 'A', 'B'], 'alu>a', `ALU (A ${m === 'ADD' ? '+' : '-'} B) -> bus -> A`, r)
      }
      break
    case 'STA':
      if (t === 3) { n.mar = arg; set(['IR', 'MAR'], 'ir>mar', 'IR operand -> bus -> MAR', arg) }
      else if (t === 4) { n.ram[n.mar] = n.a; set(['A', 'RAM'], 'a>ram', 'A -> bus -> RAM[MAR]', n.a) }
      else idle()
      break
    case 'LDI':
      if (t === 3) { n.a = arg; set(['IR', 'A'], 'ir>a', 'IR operand -> bus -> A', arg) } else idle()
      break
    case 'JMP':
      if (t === 3) { n.pc = arg; set(['IR', 'PC'], 'ir>pc', 'IR operand -> bus -> PC', arg) } else idle()
      break
    case 'OUT':
      if (t === 3) { n.out = n.a; n.event = 'out'; set(['A', 'OUT'], 'a>out', 'A -> bus -> OUT', n.a) } else idle()
      break
    case 'HLT':
      if (t === 3) { n.halted = true; n.event = 'halt'; set([], 'halt', 'HLT: clock stopped', n.bus) } else idle()
      break
  }
  return n
}

/** Run steps until the next instruction boundary (t === 6), halt or fault. */
export function stepInstruction(s: CpuState): CpuState {
  let c = stepClock(s)
  for (let i = 0; i < 6 && c.t !== 6 && !c.halted && !c.fault; i++) c = stepClock(c)
  return c
}

export const isStopped = (s: CpuState) => s.halted || s.fault !== null

/** Tiny assembler. Syntax: `[label:] MNEMONIC [operand]`, `DB n`, `ORG n`, `; comment`. Operand: number or label. */
export function assemble(lines: string[]): number[] {
  const ram = new Array<number>(RAM_SIZE).fill(0)
  const labels = new Map<string, number>()
  type Item = { addr: number; word: string; arg: string | undefined; line: number }
  const items: Item[] = []
  let addr = 0
  const num = (txt: string, line: number): number => {
    const v = /^0x[0-9a-f]+$/i.test(txt) ? parseInt(txt, 16) : /^0b[01]+$/i.test(txt) ? parseInt(txt.slice(2), 2) : /^\d+$/.test(txt) ? parseInt(txt, 10) : NaN
    if (Number.isNaN(v)) throw new Error(`Line ${line}: bad number "${txt}"`)
    return v
  }
  lines.forEach((raw, i) => {
    const line = i + 1
    let text = raw.split(';')[0].trim()
    if (!text) return
    const lm = /^([A-Za-z_]\w*):\s*(.*)$/.exec(text)
    if (lm) {
      if (labels.has(lm[1].toUpperCase())) throw new Error(`Line ${line}: duplicate label "${lm[1]}"`)
      labels.set(lm[1].toUpperCase(), addr)
      text = lm[2]
      if (!text) return
    }
    const parts = text.split(/\s+/)
    const word = parts[0].toUpperCase()
    if (parts.length > 2) throw new Error(`Line ${line}: too many operands`)
    if (word === 'ORG') {
      if (parts.length !== 2) throw new Error(`Line ${line}: ORG needs an address`)
      const v = num(parts[1], line)
      if (v >= RAM_SIZE) throw new Error(`Line ${line}: address ${v} out of range 0-15`)
      addr = v
      return
    }
    if (addr >= RAM_SIZE) throw new Error(`Line ${line}: program does not fit in 16 bytes`)
    if (word !== 'DB' && !(word in OPCODES)) throw new Error(`Line ${line}: unknown mnemonic "${parts[0]}"`)
    items.push({ addr, word, arg: parts[1], line })
    addr++
  })
  for (const it of items) {
    if (it.word === 'DB') {
      if (it.arg === undefined) throw new Error(`Line ${it.line}: DB needs a value`)
      const v = num(it.arg, it.line)
      if (v > 255) throw new Error(`Line ${it.line}: value ${v} does not fit in 8 bits`)
      ram[it.addr] = v
      continue
    }
    const op = OPCODES[it.word as Mnemonic]
    const needsArg = !['OUT', 'HLT'].includes(it.word)
    if (needsArg && it.arg === undefined) throw new Error(`Line ${it.line}: ${it.word} needs an operand`)
    if (!needsArg && it.arg !== undefined) throw new Error(`Line ${it.line}: ${it.word} takes no operand`)
    let v = 0
    if (it.arg !== undefined) {
      const lab = labels.get(it.arg.toUpperCase())
      v = lab !== undefined ? lab : /^[A-Za-z_]/.test(it.arg) ? NaN : num(it.arg, it.line)
      if (Number.isNaN(v)) throw new Error(`Line ${it.line}: unknown label "${it.arg}"`)
      if (v > 15) throw new Error(`Line ${it.line}: operand ${v} does not fit in 4 bits`)
    }
    ram[it.addr] = (op << 4) | v
  }
  return ram
}

export interface Preset { id: 'add' | 'up' | 'down'; name: { en: string; ja: string }; source: string[] }

export const PRESETS: Preset[] = [
  {
    id: 'add', name: { en: 'Add 2+3', ja: '2+3 を足す' },
    source: ['LDA x', 'ADD y', 'OUT', 'HLT', 'ORG 14', 'x: DB 2', 'y: DB 3'],
  },
  {
    id: 'up', name: { en: 'Count up', ja: 'カウントアップ' },
    source: ['top: LDA n', 'ADD one', 'OUT', 'STA n', 'JMP top', 'ORG 14', 'n: DB 0', 'one: DB 1'],
  },
  {
    id: 'down', name: { en: 'Countdown', ja: 'カウントダウン' },
    source: ['LDI 5', 'OUT', ...Array.from({ length: 5 }, () => ['SUB one', 'OUT']).flat(), 'HLT', 'ORG 15', 'one: DB 1'],
  },
]

export const loadPreset = (id: Preset['id']): CpuState => initialState(assemble(PRESETS.find((p) => p.id === id)!.source))
