import { describe, expect, it } from 'vitest'
import { DEFAULT_PLANT, PRESETS, autoTune, cost, metrics, simulateStep } from './core'

const A = 0.26, B = 1.3
const run = (g = PRESETS.tuned, p = DEFAULT_PLANT, secs = 3) => {
  const tr = simulateStep(p, g, A, B, secs)
  return { tr, m: metrics(tr.t, tr.y, A, B) }
}

describe('pid core', () => {
  it('tuned preset: low overshoot and settles', () => {
    const { m } = run()
    console.log('tuned', m)
    expect(m.overshootPct).toBeLessThan(10)
    expect(m.settleS).not.toBeNull()
    expect(m.riseS).not.toBeNull()
  })
  it('oscillatory preset overshoots more than tuned', () => {
    const o = run(PRESETS.oscillatory).m, t = run().m
    console.log('osc', o)
    expect(o.overshootPct).toBeGreaterThan(t.overshootPct + 10)
  })
  it('gravity increases steady-state error without Ki', () => {
    const g = { kp: 5, ki: 0, kd: 0.05 }
    const withG = run(g, { ...DEFAULT_PLANT, gravity: true }).m
    const noG = run(g, { ...DEFAULT_PLANT, gravity: false }).m
    expect(Math.abs(withG.sseRad)).toBeGreaterThan(Math.abs(noG.sseRad) + 0.05)
    // and Ki removes it
    const withKi = run({ kp: 5, ki: 20, kd: 0.05 }, DEFAULT_PLANT, 6).m
    expect(Math.abs(withKi.sseRad)).toBeLessThan(Math.abs(withG.sseRad))
  })
  it('autotune is deterministic, fast, and beats sluggish', () => {
    const t0 = performance.now()
    const a = autoTune(DEFAULT_PLANT, 7)
    const ms = performance.now() - t0
    console.log('autotune', a, ms.toFixed(0), 'ms')
    expect(autoTune(DEFAULT_PLANT, 7)).toEqual(a)
    expect(a.cost).toBeLessThan(cost(DEFAULT_PLANT, PRESETS.sluggish))
    expect(ms).toBeLessThan(3000) // generous: a slow CI machine must not fail the deploy
  })
  it('metrics match an analytic first-order response', () => {
    const tau = 0.5, n = 5000, t: number[] = [], y: number[] = []
    for (let i = 0; i < n; i++) { const ti = (i * 5) / n; t.push(ti); y.push(2 + 3 * (1 - Math.exp(-ti / tau))) }
    const m = metrics(t, y, 2, 5)
    expect(m.riseS!).toBeCloseTo(tau * Math.log(9), 2)
    expect(m.settleS!).toBeCloseTo(tau * Math.log(50), 2)
    expect(m.overshootPct).toBe(0)
    expect(Math.abs(m.sseRad)).toBeLessThan(0.01)
  })
  it('metrics report overshoot of an underdamped response', () => {
    const t: number[] = [], y: number[] = []
    for (let i = 0; i < 4000; i++) { const ti = i * 0.001; t.push(ti); y.push(1 - Math.exp(-ti) * Math.cos(6 * ti)) }
    expect(metrics(t, y, 0, 1).overshootPct).toBeGreaterThan(5)
  })
})
