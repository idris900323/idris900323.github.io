import { describe, expect, it } from 'vitest'
import { assemble, initialState, loadPreset, stepClock, stepInstruction, type CpuState } from './core'

const run = (s: CpuState, max = 2000) => {
  const outs: number[] = []
  for (let i = 0; i < max && !s.halted && !s.fault; i++) {
    s = stepClock(s)
    if (s.event === 'out') outs.push(s.out)
  }
  return { s, outs }
}
const prog = (lines: string[]) => initialState(assemble(lines))

describe('instructions', () => {
  it('LDA loads A from RAM', () => {
    const s = stepInstruction(prog(['LDA 5', 'HLT', 'ORG 5', 'DB 42']))
    expect(s.a).toBe(42)
    expect(s.t).toBe(6)
  })
  it('ADD and SUB use the ALU and set flags', () => {
    let s = stepInstruction(prog(['LDA 5', 'ADD 6', 'SUB 6', 'HLT', 'ORG 5', 'DB 10', 'DB 4']))
    s = stepInstruction(s)
    expect(s.a).toBe(14)
    s = stepInstruction(s)
    expect(s.a).toBe(10)
    expect(s.zero).toBe(false)
    const z = run(prog(['LDA 5', 'SUB 5', 'HLT', 'ORG 5', 'DB 7'])).s
    expect(z.a).toBe(0)
    expect(z.zero).toBe(true)
  })
  it('STA writes A to RAM', () => {
    expect(run(prog(['LDI 9', 'STA 12', 'HLT'])).s.ram[12]).toBe(9)
  })
  it('LDI loads the immediate', () => {
    expect(run(prog(['LDI 13', 'HLT'])).s.a).toBe(13)
  })
  it('JMP sets the PC', () => {
    const s = run(prog(['JMP 3', 'LDI 1', 'HLT', 'LDI 7', 'HLT'])).s
    expect(s.a).toBe(7)
  })
  it('OUT copies A to output', () => {
    expect(run(prog(['LDI 6', 'OUT', 'HLT'])).outs).toEqual([6])
  })
  it('HLT stops the clock', () => {
    const s = run(prog(['HLT'])).s
    expect(s.halted).toBe(true)
    expect(s.event).toBe('halt')
    const again = stepClock(s)
    expect(again.ticks).toBe(s.ticks)
    expect(again.pc).toBe(s.pc)
  })
})

describe('programs', () => {
  it('Add 2+3 outputs 5', () => {
    const r = run(loadPreset('add'))
    expect(r.outs).toEqual([5])
    expect(r.s.halted).toBe(true)
  })
  it('Count up increments and wraps with overflow', () => {
    let s = loadPreset('up')
    const outs: number[] = []
    const events: string[] = []
    for (let i = 0; i < 6 * 5 * 260 && outs.length < 258; i++) {
      s = stepClock(s)
      if (s.event === 'out') outs.push(s.out)
      if (s.event === 'overflow') events.push('overflow')
    }
    expect(outs.slice(0, 3)).toEqual([1, 2, 3])
    expect(outs[254]).toBe(255)
    expect(outs[255]).toBe(0)
    expect(outs[256]).toBe(1)
    expect(events.length).toBeGreaterThanOrEqual(1)
    expect(s.overflow).toBe(true)
  })
  it('Countdown reaches 0 and halts', () => {
    const r = run(loadPreset('down'))
    expect(r.outs).toEqual([5, 4, 3, 2, 1, 0])
    expect(r.s.halted).toBe(true)
  })
  it('255 + 1 wraps to 0 and flags overflow', () => {
    const s = run(prog(['LDA 14', 'ADD 15', 'HLT', 'ORG 14', 'DB 255', 'DB 1'])).s
    expect(s.a).toBe(0)
    expect(s.overflow).toBe(true)
    expect(s.carry).toBe(true)
  })
})

describe('faults and micro-steps', () => {
  it('illegal opcode faults', () => {
    const s = run(prog(['DB 0x90'])).s
    expect(s.fault).toMatch(/Illegal opcode 1001/)
    expect(s.event).toBe('illegal')
    expect(stepClock(s).ticks).toBe(s.ticks)
  })
  it('micro-step sequence is T1..T6 repeating', () => {
    let s = prog(['LDI 1', 'LDI 2', 'HLT'])
    const ts: number[] = []
    for (let i = 0; i < 12; i++) { s = stepClock(s); ts.push(s.t) }
    expect(ts).toEqual([1, 2, 3, 4, 5, 6, 1, 2, 3, 4, 5, 6])
  })
  it('exposes active blocks, bus and text', () => {
    let s = prog(['LDI 3', 'HLT'])
    s = stepClock(s)
    expect(s.active).toContain('PC')
    expect(s.active).toContain('MAR')
    expect(s.microOp).toMatch(/PC/)
    s = stepClock(s)
    expect(s.active).toContain('IR')
    expect(s.bus).toBe(0x53)
  })
})

describe('assembler', () => {
  it('encodes opcode and operand', () => {
    expect(assemble(['LDA 5', 'OUT', 'HLT'])).toEqual([0x15, 0xe0, 0xf0, ...new Array(13).fill(0)])
  })
  it('resolves labels and ORG', () => {
    const r = assemble(['JMP end', 'ORG 4', 'end: HLT'])
    expect(r[0]).toBe(0x64)
    expect(r[4]).toBe(0xf0)
  })
  it.each([
    [['FOO 1'], /unknown mnemonic/],
    [['LDA'], /needs an operand/],
    [['OUT 3'], /takes no operand/],
    [['LDA 16'], /4 bits/],
    [['DB 256'], /8 bits/],
    [['JMP nowhere'], /unknown label/],
    [['a: HLT', 'a: HLT'], /duplicate label/],
    [Array(17).fill('HLT'), /fit in 16/],
    [['LDA xyz1!'], /bad number|unknown label/],
  ])('rejects %j', (src, re) => {
    expect(() => assemble(src as string[])).toThrow(re as RegExp)
  })
})
