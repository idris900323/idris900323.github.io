import { describe, expect, it } from 'vitest'
import { BOSS_ID, coherent, headingSpread, isDocked, kill, makeSwarm, newCarry, platform, stepCarry, stepSwarm } from './core'

const run = (s: ReturnType<typeof makeSwarm>, sec: number) => {
  for (let i = 0; i < sec * 120; i++) s = stepSwarm(s, 1 / 120)
  return s
}

describe('consensus', () => {
  it('converges with a unit removed', () => {
    const s = run(kill(makeSwarm(5), 2), 30)
    expect(headingSpread(s)).toBeLessThan(0.01)
    expect(coherent(s)).toBe(true)
  })
  it('boss removal breaks centralised mode but not decentralised', () => {
    const b = run(makeSwarm(5, 'boss'), 10)
    expect(headingSpread(b)).toBeLessThan(0.01)
    const bk = run(kill(makeSwarm(5, 'boss'), BOSS_ID), 10)
    expect(headingSpread(bk)).toBeGreaterThan(0.5)
    expect(coherent(bk)).toBe(false)
    const d = run(kill(makeSwarm(5, 'decentral'), BOSS_ID), 30)
    expect(coherent(d)).toBe(true)
  })
})

describe('platform', () => {
  it('docks into a wider platform then advances with bounded tilt', () => {
    let c = { ...newCarry(), docking: true }
    expect(isDocked(c)).toBe(false)
    for (let i = 0; i < 120 * 4; i++) c = stepCarry(c, 1 / 120)
    expect(isDocked(c)).toBe(true)
    expect(platform(c).width).toBeGreaterThan(platform(newCarry()).width)
    const x0 = c.x
    for (let i = 0; i < 120 * 10; i++) {
      c = stepCarry(c, 1 / 120)
      expect(Math.abs(platform(c).tilt)).toBeLessThan(0.3)
    }
    expect(c.x).toBeGreaterThan(x0)
  })
})
