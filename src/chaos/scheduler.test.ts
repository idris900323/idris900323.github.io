import { describe, expect, it } from 'vitest'
import { Scheduler } from './scheduler'

const mk = () => {
  let t = 0
  const s = new Scheduler(() => t)
  return { s, at: (v: number) => { t = v } }
}

describe('Scheduler', () => {
  it('blocks unprompted gags for the first 6 s', () => {
    const { s, at } = mk()
    at(5000)
    expect(s.canRun({ id: 'a', tier: 'A', prompted: false })).toBe(false)
    at(6500)
    expect(s.canRun({ id: 'a', tier: 'A', prompted: false })).toBe(true)
  })
  it('never starts tier C unprompted, but allows it when prompted once', () => {
    const { s, at } = mk()
    at(60000)
    expect(s.canRun({ id: 'g1', tier: 'C', prompted: false })).toBe(false)
    expect(s.start({ id: 'g1', tier: 'C', prompted: true })).toBe(true)
    s.end('g1')
    at(200000)
    expect(s.canRun({ id: 'g1', tier: 'C', prompted: true })).toBe(false) // per-session cap
  })
  it('allows only one tier C at a time and three gags overall', () => {
    const { s, at } = mk()
    at(60000)
    expect(s.start({ id: 'c1', tier: 'C', prompted: true })).toBe(true)
    expect(s.start({ id: 'c2', tier: 'C', prompted: true })).toBe(false)
    expect(s.start({ id: 'b1', tier: 'B', prompted: true })).toBe(true)
    expect(s.start({ id: 'b2', tier: 'B', prompted: true })).toBe(true)
    expect(s.start({ id: 'b3', tier: 'B', prompted: true })).toBe(false)
  })
  it('keeps a 20 s gap between unprompted gags and an 8 s ambient gap', () => {
    const { s, at } = mk()
    at(10000)
    expect(s.start({ id: 'a1', tier: 'A', prompted: false })).toBe(true)
    s.end('a1')
    at(25000)
    expect(s.canRun({ id: 'a2', tier: 'A', prompted: false })).toBe(false)
    at(31000)
    expect(s.canRun({ id: 'a2', tier: 'A', prompted: false })).toBe(true)
  })
  it('applies cooldown and the tier B per-session cap', () => {
    const { s, at } = mk()
    at(60000)
    for (let i = 0; i < 3; i++) {
      expect(s.start({ id: 'b', tier: 'B', prompted: true, cooldownMs: 100 })).toBe(true)
      s.end('b')
      at(60000 + (i + 1) * 1000)
    }
    expect(s.canRun({ id: 'b', tier: 'B', prompted: true, cooldownMs: 100 })).toBe(false)
  })
  it('pauses unprompted gags while the visitor is reading', () => {
    const { s, at } = mk()
    at(60000)
    s.setReading(true)
    expect(s.canRun({ id: 'a', tier: 'A', prompted: false })).toBe(false)
    s.setReading(false)
    expect(s.canRun({ id: 'a', tier: 'A', prompted: false })).toBe(true)
  })
  it('goes calmer after three dismissals', () => {
    const { s, at } = mk()
    at(60000)
    expect(s.ambientDensity()).toBe(1)
    s.noteDismiss(); s.noteDismiss(); s.noteDismiss()
    expect(s.calmer).toBe(true)
    expect(s.ambientDensity()).toBeLessThan(0.5)
    expect(s.canRun({ id: 'b', tier: 'B', prompted: false })).toBe(false)
    expect(s.canRun({ id: 'b', tier: 'B', prompted: true })).toBe(true)
  })
})
