import { describe, expect, it } from 'vitest'
import { LEAK_THRESHOLD, LOW_FLOW_THRESHOLD, N_SEG, currentSegment, isAlarm, newScan, progress, reading, stepScan } from './core'

function run(leak: number | null) {
  let s = newScan()
  const seen: number[] = []
  for (let i = 0; i < 100000 && !s.done; i++) {
    seen.push(currentSegment(s))
    s = stepScan(s, leak, 1 / 60)
  }
  return { s, seen }
}

describe('pipe', () => {
  it('no leak: never alarms, completes at 100%', () => {
    for (let k = 1; k <= N_SEG; k++) expect(isAlarm(reading(k, null))).toBe(false)
    const { s } = run(null)
    expect(s.found).toBeNull()
    expect(s.done).toBe(true)
    expect(progress(s)).toBe(100)
  })
  it('leak at k is detected at k and not before', () => {
    for (let k = 1; k <= N_SEG; k++) {
      for (let j = 1; j < k; j++) expect(isAlarm(reading(j, k))).toBe(false)
      expect(isAlarm(reading(k, k))).toBe(true)
      const { s, seen } = run(k)
      expect(s.found).toBe(k)
      expect(Math.max(...seen)).toBe(k)
    }
  })
  it('leak adds a permanent downstream drop in pressure and flow', () => {
    const a = reading(5, null), b = reading(5, 3), c = reading(10, 3)
    expect(b.pressure).toBeLessThan(a.pressure)
    expect(b.flow).toBeLessThan(a.flow)
    expect(c.flow).toBe(b.flow)
  })
  it('thresholds: one signal alone does not alarm', () => {
    expect(isAlarm({ pressure: LEAK_THRESHOLD - 0.1, flow: LOW_FLOW_THRESHOLD + 0.1 })).toBe(false)
    expect(isAlarm({ pressure: LEAK_THRESHOLD + 0.1, flow: LOW_FLOW_THRESHOLD - 0.1 })).toBe(false)
    expect(isAlarm({ pressure: LEAK_THRESHOLD - 0.1, flow: LOW_FLOW_THRESHOLD - 0.1 })).toBe(true)
  })
})
