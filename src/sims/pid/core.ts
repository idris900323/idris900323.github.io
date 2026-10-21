/**
 * PID digital-twin physics (pure TypeScript, no DOM).
 *
 * ILLUSTRATIVE ONLY. The numbers below are plausible round values chosen so the
 * demo behaves sensibly. They are NOT taken from a real motor datasheet and are
 * not measured data. The structure echoes a 12 V, 180:1 geared servo (like the
 * RMCS-3013 used in the real project): voltage -> armature current (L = 0, so
 * algebraic) -> motor torque -> gearbox -> output-side inertia with optional
 * gravity torque m*g*L*sin(theta). Angle 0 = arm hanging straight down.
 */

export const DT = 0.001 // 1 kHz, semi-implicit Euler
export const VMAX = 12 // supply, volts
const N = 180 // gear ratio
const ETA = 0.8 // gearbox efficiency (illustrative)
const R = 1.6 // ohm
const K = 5.687e-3 // Kt = Ke, SI (illustrative)
const JM = 5e-7 // rotor inertia kg m^2
const BM = 1e-6 // rotor viscous friction
const G = 9.81
const M_ARM = 0.05 // kg, arm rod itself
const TAU_D = 0.01 // derivative filter, s

export type Gains = { kp: number; ki: number; kd: number }
export type Plant = {
  armCm: number
  payloadKg: number
  gravity: boolean
  /** 10..100 : percentage of full voltage available to the motor */
  speedLimitPct: number
}
export const DEFAULT_GAINS: Gains = { kp: 5, ki: 20, kd: 0.05 }
export const DEFAULT_PLANT: Plant = { armCm: 15, payloadKg: 0.5, gravity: true, speedLimitPct: 100 }
export const RANGES = { kp: [0, 50], ki: [0, 100], kd: [0, 1] } as const

export const PRESETS: Record<'sluggish' | 'oscillatory' | 'tuned', Gains> = {
  sluggish: { kp: 1, ki: 0.5, kd: 0 },
  oscillatory: { kp: 6, ki: 100, kd: 0 },
  tuned: { kp: 15, ki: 20, kd: 0.4 },
}

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

export type State = { theta: number; omega: number } // rad, rad/s (output shaft)

/** Advance the motor+gearbox+arm by one step. Returns the new state (mutates s). */
export function plantStep(s: State, volts: number, p: Plant, dt = DT): State {
  const L = p.armCm / 100
  const m = p.payloadKg
  const J = JM * N * N + (m + M_ARM / 3) * L * L
  const c1 = (N * ETA * K) / R // output torque per volt
  const c2 = c1 * K * N // back-EMF damping
  const b = BM * N * N
  const tauG = p.gravity ? (m + M_ARM / 2) * G * L * Math.sin(s.theta) : 0
  const alpha = (c1 * volts - (c2 + b) * s.omega - tauG) / J
  s.omega += alpha * dt // semi-implicit: velocity first,
  s.theta += s.omega * dt // then position with the new velocity
  return s
}

export class PID {
  integ = 0
  gains: Gains
  private prev = NaN
  private dFilt = 0
  constructor(gains: Gains) { this.gains = gains }
  reset(meas: number) { this.integ = 0; this.prev = meas; this.dFilt = 0 }
  /** Anti-windup: conditional integration + clamp of the integral term. Derivative on measurement. */
  step(setpoint: number, meas: number, vmax: number, dt = DT): number {
    if (Number.isNaN(this.prev)) this.prev = meas
    const { kp, ki, kd } = this.gains
    const e = setpoint - meas
    const d = (meas - this.prev) / dt
    this.prev = meas
    this.dFilt += (dt / (TAU_D + dt)) * (d - this.dFilt)
    const unsat = kp * e + this.integ - kd * this.dFilt
    const u = clamp(unsat, -vmax, vmax)
    const pushing = (unsat > vmax && e > 0) || (unsat < -vmax && e < 0)
    if (!pushing) this.integ += ki * e * dt
    this.integ = clamp(this.integ, -vmax, vmax)
    return u
  }
}

export type Trace = { t: number[]; y: number[]; u: number[] }

/** Closed-loop step from angle `from` to `to` (radians). `every` = decimation of stored samples. */
export function simulateStep(
  plant: Plant, gains: Gains, from: number, to: number, seconds = 3, every = 5,
): Trace {
  const s: State = { theta: from, omega: 0 }
  const pid = new PID(gains)
  pid.reset(from)
  const vmax = (VMAX * plant.speedLimitPct) / 100
  const tr: Trace = { t: [], y: [], u: [] }
  const n = Math.round(seconds / DT)
  for (let i = 0; i <= n; i++) {
    const u = pid.step(to, s.theta, vmax)
    if (i % every === 0) { tr.t.push(i * DT); tr.y.push(s.theta); tr.u.push(u) }
    plantStep(s, u, plant)
  }
  return tr
}

export type Metrics = {
  riseS: number | null
  overshootPct: number
  settleS: number | null
  sseRad: number
}

/** Step-response metrics for a response y(t) going from y0 to target. */
export function metrics(t: number[], y: number[], y0: number, target: number): Metrics {
  const step = target - y0
  const out: Metrics = { riseS: null, overshootPct: 0, settleS: null, sseRad: NaN }
  const n = y.length
  if (n < 2 || Math.abs(step) < 1e-9) return out
  const sgn = Math.sign(step)
  const f = y.map((v) => ((v - y0) * sgn) / Math.abs(step)) // normalised: 0 -> 1
  const cross = (lvl: number) => {
    for (let i = 1; i < n; i++) {
      if (f[i] >= lvl && f[i - 1] < lvl) return t[i - 1] + ((lvl - f[i - 1]) / (f[i] - f[i - 1])) * (t[i] - t[i - 1])
    }
    return null
  }
  const t10 = cross(0.1), t90 = cross(0.9)
  if (t10 !== null && t90 !== null) out.riseS = t90 - t10
  out.overshootPct = Math.max(0, Math.max(...f) - 1) * 100
  // settling: last time the response is outside the 2 % band; null if still outside at the end
  let last = -1
  for (let i = 0; i < n; i++) if (Math.abs(f[i] - 1) > 0.02) last = i
  if (last < n - 1) out.settleS = last < 0 ? 0 : t[last + 1]
  const tail = Math.max(1, Math.floor(n * 0.05))
  let sum = 0
  for (let i = n - tail; i < n; i++) sum += y[i]
  out.sseRad = target - sum / tail
  return out
}

/** Cost for the demo tuner: ITAE (normalised step) + overshoot penalty + unsettled penalty. */
export function cost(plant: Plant, g: Gains, from = 0.26, to = 1.3): number {
  const T = 2.5
  const tr = simulateStep(plant, g, from, to, T, 5)
  const span = Math.abs(to - from)
  let itae = 0
  for (let i = 0; i < tr.t.length; i++) itae += tr.t[i] * (Math.abs(to - tr.y[i]) / span) * 0.005
  const m = metrics(tr.t, tr.y, from, to)
  return itae + 0.02 * m.overshootPct + (m.settleS === null ? 1 : 0)
}

function rng(seed: number) { // mulberry32
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clampG = (v: number[]): Gains => ({
  kp: clamp(v[0], RANGES.kp[0], RANGES.kp[1]),
  ki: clamp(v[1], RANGES.ki[0], RANGES.ki[1]),
  kd: clamp(v[2], RANGES.kd[0], RANGES.kd[1]),
})

/**
 * Demo auto-tuner: seeded random search, then Nelder-Mead refinement on the
 * ITAE + overshoot cost. A plain search optimiser, NOT the research RL tuner.
 * Deterministic for a given seed.
 */
export function autoTune(plant: Plant, seed = 1, evals = 220): { gains: Gains; cost: number } {
  const rand = rng(seed)
  const f = (v: number[]) => cost(plant, clampG(v))
  const nRand = Math.floor(evals * 0.45)
  const pts: { v: number[]; c: number }[] = []
  for (let i = 0; i < nRand; i++) {
    const v = [rand() * 50, rand() * rand() * 100, rand() * rand()]
    pts.push({ v, c: f(v) })
  }
  pts.sort((a, b) => a.c - b.c)
  let sim = [pts[0], pts[1], pts[2], pts[3]].map((p) => ({ v: p.v.slice(), c: p.c }))
  for (let it = 0; it < evals - nRand; it += 1) {
    sim.sort((a, b) => a.c - b.c)
    const best = sim[0], worst = sim[3]
    const cen = [0, 1, 2].map((d) => (sim[0].v[d] + sim[1].v[d] + sim[2].v[d]) / 3)
    const at = (k: number) => cen.map((c, d) => c + k * (worst.v[d] - c))
    const xr = clampG(at(-1)); const vr = [xr.kp, xr.ki, xr.kd]; const cr = f(vr)
    if (cr < best.c) {
      const xe = clampG(at(-2)); const ve = [xe.kp, xe.ki, xe.kd]; const ce = f(ve)
      sim[3] = ce < cr ? { v: ve, c: ce } : { v: vr, c: cr }
    } else if (cr < sim[2].c) {
      sim[3] = { v: vr, c: cr }
    } else {
      const xc = clampG(at(0.5)); const vc = [xc.kp, xc.ki, xc.kd]; const cc = f(vc)
      if (cc < worst.c) sim[3] = { v: vc, c: cc }
      else sim = sim.map((p, i) => {
        if (i === 0) return p
        const v = p.v.map((x, d) => best.v[d] + 0.5 * (x - best.v[d]))
        const g = clampG(v)
        return { v: [g.kp, g.ki, g.kd], c: f([g.kp, g.ki, g.kd]) }
      })
    }
  }
  sim.sort((a, b) => a.c - b.c)
  return { gains: clampG(sim[0].v), cost: sim[0].c }
}
