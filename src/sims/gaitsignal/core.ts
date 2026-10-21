/** Synthetic IMU + toy gesture detector. Illustrative only: not a medical device. */
export type Gesture = 'raise' | 'tap' | 'hold'
export const GESTURES: Gesture[] = ['raise', 'tap', 'hold']
export const FS = 50
export type Vec3 = [number, number, number]
export type Sample = { t: number; acc: Vec3; gyr: Vec3; truth: Gesture | null }

export function rng(seed: number) {
  let a = seed >>> 0
  const u = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return { u, n: () => Math.sqrt(-2 * Math.log(u() || 1e-9)) * Math.cos(2 * Math.PI * u()) }
}

/** Voluntary-gesture schedule: a repeating raise, tap, hold sequence. */
export const SCHEDULE = { start: 1.0, period: 3.5, dur: { raise: 1.0, tap: 0.08, hold: 2.0 } as Record<Gesture, number> }
export function scheduled(t: number): { g: Gesture; u: number } | null {
  if (t < SCHEDULE.start) return null
  const k = Math.floor((t - SCHEDULE.start) / SCHEDULE.period)
  const local = t - SCHEDULE.start - k * SCHEDULE.period
  const g = GESTURES[k % 3]
  return local < SCHEDULE.dur[g] ? { g, u: local / SCHEDULE.dur[g] } : null
}

export const TREMOR_BAND: [number, number] = [4, 6]
/** Level 0..1 maps to up to 0.25 g and 40 deg/s of tremor. */
export const TREMOR_ACC_G = 0.25, TREMOR_GYR_DPS = 40

export function createGenerator(seed = 1) {
  const r = rng(seed)
  let n = 0
  let phase = 0
  return {
    next(level: number): Sample {
      const t = n / FS; n++
      const f = 5 + 0.8 * Math.sin(2 * Math.PI * 0.1 * t) // drifts inside 4-6 Hz
      phase += (2 * Math.PI * f) / FS
      const env = 0.9 + 0.1 * Math.sin(2 * Math.PI * 0.23 * t)
      const trem = (k: number) => Math.sin(phase + k) * env
      const acc: Vec3 = [0, 0, 1], gyr: Vec3 = [0, 0, 0]
      const s = scheduled(t)
      if (s) {
        const { g, u } = s
        if (g === 'raise') { acc[0] += 0.5 * Math.sin(Math.PI * u); gyr[1] += 70 * Math.cos(Math.PI * u) }
        else if (g === 'tap') { acc[2] += 1.2 * Math.sin(Math.PI * u) }
        else { acc[0] += 0.5 * Math.min(1, u / 0.2); gyr[1] += 15 * Math.sin(Math.PI * Math.min(1, u / 0.2)) }
      }
      const a = level * TREMOR_ACC_G, w = level * TREMOR_GYR_DPS
      acc[0] += a * trem(0); acc[1] += a * 0.7 * trem(1.3); acc[2] += a * 0.5 * trem(2.1)
      gyr[0] += w * 0.8 * trem(0.7); gyr[1] += w * trem(1.9); gyr[2] += w * 0.6 * trem(2.8)
      for (let i = 0; i < 3; i++) { acc[i] += 0.01 * r.n(); gyr[i] += 1.5 * r.n() }
      return { t, acc, gyr, truth: s ? s.g : null }
    },
  }
}

// ---------------- filters ----------------
export type Biquad = { process(x: number): number; prime(x: number): void }
export function biquad(kind: 'lp' | 'hp', fc: number, q = Math.SQRT1_2, fs = FS): Biquad {
  const w0 = (2 * Math.PI * fc) / fs, c = Math.cos(w0), al = Math.sin(w0) / (2 * q)
  let b0: number, b1: number, b2: number
  if (kind === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0 } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0 }
  const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al
  const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  const process = (x: number) => {
    const y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2
    x2 = x1; x1 = x; y2 = y1; y1 = y
    return y
  }
  return { process, prime: (x) => { for (let i = 0; i < 400; i++) process(x) } }
}

/** Gain of a cascade at frequency f, evaluated numerically (used in tests and the UI legend). */
export function cascadeGain(make: () => Biquad[], f: number, fs = FS): number {
  const ch = make()
  let peak = 0
  for (let i = 0; i < fs * 8; i++) {
    let v = Math.sin((2 * Math.PI * f * i) / fs)
    for (const b of ch) v = b.process(v)
    if (i > fs * 4) peak = Math.max(peak, Math.abs(v))
  }
  return peak
}
/** 4th-order low-pass at 3 Hz: keeps voluntary motion, attenuates 4-6 Hz tremor. */
export const makeLowpass = () => [biquad('lp', 3), biquad('lp', 3)]
/** Band-pass 0.3-3 Hz = the low-pass above followed by a 0.3 Hz high-pass (removes gravity/drift). */
export const makeBandpass = () => [biquad('lp', 3), biquad('lp', 3), biquad('hp', 0.3)]

// ---------------- FFT ----------------
export function fft(re: number[], im: number[]) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]] }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len
    for (let i = 0; i < n; i += len) {
      for (let k = 0; k < len / 2; k++) {
        const wr = Math.cos(ang * k), wi = Math.sin(ang * k)
        const a = i + k, b = i + k + len / 2
        const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi
      }
    }
  }
}
/** Magnitude spectrum (bins 0..n/2) of a Hann-windowed, mean-removed signal. */
export function spectrum(x: number[]): number[] {
  const n = x.length
  const m = x.reduce((a, b) => a + b, 0) / n
  const re = x.map((v, i) => (v - m) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)))), im = new Array<number>(n).fill(0)
  fft(re, im)
  return Array.from({ length: n / 2 + 1 }, (_, i) => Math.hypot(re[i], im[i]) / n)
}
export function dominant(x: number[], fs = FS): { freq: number; mag: number; tremorShare: number } {
  const sp = spectrum(x), n = x.length
  let k = 1
  for (let i = 2; i < sp.length; i++) if (sp[i] > sp[k]) k = i
  let tot = 0, band = 0
  sp.forEach((v, i) => { if (i === 0) return; const p = v * v; tot += p; const f = (i * fs) / n; if (f >= TREMOR_BAND[0] && f <= TREMOR_BAND[1]) band += p })
  return { freq: (k * fs) / n, mag: sp[k], tremorShare: tot > 0 ? band / tot : 0 }
}

// ---------------- features + classifier ----------------
export type Features = { jerkZ: number; gyroYRms: number; tiltMin: number; tiltRange: number }
export const THRESH = { jerk: 0.35, gyro: 25, tilt: 0.3, steady: 0.08 }

/** Pure threshold classifier over one feature window. Priority: tap, raise, hold. */
export function classify(f: Features): Gesture | null {
  if (f.jerkZ > THRESH.jerk) return 'tap'
  if (f.gyroYRms > THRESH.gyro) return 'raise'
  if (f.tiltMin > THRESH.tilt && f.tiltRange < THRESH.steady) return 'hold'
  return null
}

const W = 32 // 0.64 s feature window
export type Frame = {
  t: number
  raw: { acc: Vec3; gyr: Vec3 }
  lp: { acc: Vec3; gyr: Vec3 }
  bp: { acc: Vec3; gyr: Vec3 }
  features: Features | null
  candidate: Gesture | null
  emitted: Gesture | null
}

export class Detector {
  private lp: Biquad[][] = Array.from({ length: 6 }, makeLowpass)
  private bp: Biquad[][] = Array.from({ length: 6 }, makeBandpass)
  private primed = false
  private prevZ: number | null = null
  private jerkBuf: number[] = []
  private gyBuf: number[] = []
  private tiltBuf: number[] = []
  private n = 0
  private last: Gesture | null = null
  private quiet = 0
  private warmup = 2 * FS

  push(s: Sample): Frame {
    const raw = [...s.acc, ...s.gyr]
    if (!this.primed) {
      raw.forEach((v, i) => { this.lp[i].forEach((b) => b.prime(v)); this.bp[i].forEach((b) => b.prime(v)) })
      this.primed = true
    }
    const run = (chain: Biquad[], v: number) => chain.reduce((x, b) => b.process(x), v)
    const lp = raw.map((v, i) => run(this.lp[i], v))
    const bp = raw.map((v, i) => run(this.bp[i], v))
    const push = (b: number[], v: number) => { b.push(v); if (b.length > W) b.shift() }
    push(this.jerkBuf, Math.abs(s.acc[2] - (this.prevZ ?? s.acc[2])))
    this.prevZ = s.acc[2]
    push(this.gyBuf, bp[4])
    push(this.tiltBuf, lp[0])
    this.n++
    let features: Features | null = null, candidate: Gesture | null = null, emitted: Gesture | null = null
    if (this.tiltBuf.length === W) {
      features = {
        jerkZ: Math.max(...this.jerkBuf),
        gyroYRms: Math.sqrt(this.gyBuf.reduce((a, b) => a + b * b, 0) / W),
        tiltMin: Math.min(...this.tiltBuf),
        tiltRange: Math.max(...this.tiltBuf) - Math.min(...this.tiltBuf),
      }
      if (this.n > this.warmup) {
        candidate = classify(features)
        if (candidate === null) { this.quiet++; if (this.quiet > 0.4 * FS) this.last = null }
        else {
          this.quiet = 0
          if (candidate !== this.last) { emitted = candidate; this.last = candidate }
        }
      }
    }
    return {
      t: s.t,
      raw: { acc: s.acc, gyr: s.gyr },
      lp: { acc: [lp[0], lp[1], lp[2]], gyr: [lp[3], lp[4], lp[5]] },
      bp: { acc: [bp[0], bp[1], bp[2]], gyr: [bp[3], bp[4], bp[5]] },
      features, candidate, emitted,
    }
  }
}

export const DISCLAIMER = {
  en: 'Illustrative simulation. Not a medical device. Demonstration only.',
  ja: '医療機器ではありません。デモ用です。',
}
