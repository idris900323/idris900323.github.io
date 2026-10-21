import { describe, expect, it } from 'vitest'
import { DISCLAIMER, Detector, FS, classify, cascadeGain, createGenerator, dominant, fft, makeBandpass, makeLowpass, scheduled, spectrum, type Gesture } from './core'

const run = (level: number, secs: number, seed = 3) => {
  const g = createGenerator(seed), d = new Detector()
  const frames = [], samples = []
  for (let i = 0; i < secs * FS; i++) { const s = g.next(level); samples.push(s); frames.push(d.push(s)) }
  return { frames, samples }
}

describe('fft', () => {
  it('finds a pure tone and parseval-ish magnitude', () => {
    const n = 128, f = 5
    const x = Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * f * i) / FS))
    const d = dominant(x)
    expect(Math.abs(d.freq - f)).toBeLessThan(0.4)
    expect(d.tremorShare).toBeGreaterThan(0.8)
    expect(spectrum(x)).toHaveLength(n / 2 + 1)
  })
  it('impulse has a flat spectrum', () => {
    const re = new Array<number>(16).fill(0), im = new Array<number>(16).fill(0)
    re[0] = 1; fft(re, im)
    re.forEach((v) => expect(v).toBeCloseTo(1))
  })
})

describe('filters', () => {
  it('low-pass keeps 1 Hz and strongly attenuates the 4-6 Hz tremor band', () => {
    expect(cascadeGain(makeLowpass, 1)).toBeGreaterThan(0.9)
    expect(cascadeGain(makeLowpass, 5)).toBeLessThan(0.2)
  })
  it('band-pass removes DC/gravity', () => {
    expect(cascadeGain(makeBandpass, 0.05)).toBeLessThan(0.3)
    expect(cascadeGain(makeBandpass, 1)).toBeGreaterThan(0.8)
  })
})

describe('generator', () => {
  it('is deterministic per seed', () => {
    expect(run(0.5, 2, 9).samples.map((s) => s.acc[0])).toEqual(run(0.5, 2, 9).samples.map((s) => s.acc[0]))
  })
  it('tremor at 0 is absent, and sits in 4-6 Hz when on', () => {
    const quiet = run(0, 6).samples.map((s) => s.acc[1])
    expect(Math.max(...quiet) - Math.min(...quiet)).toBeLessThan(0.1)
    const y = run(1, 8).samples.map((s) => s.acc[1]).slice(-128)
    const d = dominant(y)
    expect(d.freq).toBeGreaterThanOrEqual(4)
    expect(d.freq).toBeLessThanOrEqual(6)
    expect(d.tremorShare).toBeGreaterThan(0.7)
  })
  it('schedule rotates raise, tap, hold', () => {
    expect(scheduled(0.5)).toBeNull()
    expect(scheduled(1.2)?.g).toBe('raise')
    expect(scheduled(4.52)?.g).toBe('tap')
    expect(scheduled(8.5)?.g).toBe('hold')
  })
})

describe('classifier', () => {
  it('applies thresholds with tap > raise > hold priority', () => {
    expect(classify({ jerkZ: 0.8, gyroYRms: 60, tiltMin: 0.5, tiltRange: 0.01 })).toBe('tap')
    expect(classify({ jerkZ: 0.05, gyroYRms: 60, tiltMin: 0.5, tiltRange: 0.01 })).toBe('raise')
    expect(classify({ jerkZ: 0.05, gyroYRms: 5, tiltMin: 0.5, tiltRange: 0.01 })).toBe('hold')
    expect(classify({ jerkZ: 0.05, gyroYRms: 5, tiltMin: 0.1, tiltRange: 0.01 })).toBeNull()
  })
})

describe('end-to-end detection', () => {
  for (const level of [0, 0.5, 1]) {
    it(`detects scheduled gestures with tremor level ${level}`, () => {
      const secs = 1 + 3.5 * 6
      const { frames } = run(level, secs)
      const events = frames.filter((f) => f.emitted).map((f) => ({ t: f.t, g: f.emitted as Gesture }))
      const expected: Gesture[] = ['raise', 'tap', 'hold', 'raise', 'tap', 'hold']
      let hits = 0
      expected.forEach((g, k) => {
        const start = 1 + 3.5 * k
        if (events.some((e) => e.g === g && e.t >= start && e.t <= start + 1.6)) hits++
      })
      expect(hits).toBeGreaterThanOrEqual(5)
      const false_ = events.filter((e) => !expected.some((g, k) => g === e.g && e.t >= 1 + 3.5 * k && e.t <= 1 + 3.5 * k + 1.6))
      expect(false_.length).toBeLessThanOrEqual(1)
    })
  }
  it('stays quiet during idle gaps even at full tremor', () => {
    const { frames } = run(1, 5)
    const idle = frames.filter((f) => f.t >= 2.8 && f.t <= 4.4)
    expect(idle.length).toBeGreaterThan(50)
    expect(idle.every((f) => f.candidate === null)).toBe(true)
  })
})

describe('disclaimer', () => {
  it('has the required EN and JA text', () => {
    expect(DISCLAIMER.en).toBe('Illustrative simulation. Not a medical device. Demonstration only.')
    expect(DISCLAIMER.ja).toBe('医療機器ではありません。デモ用です。')
  })
})
