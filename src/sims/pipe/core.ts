/** Pure in-pipe leak inspection model. Illustrative hydraulics, not measured data. */
export const N_SEG = 10
export const P_IN = 6 // bar at inlet
export const P_DECAY = 0.1 // bar lost per segment (friction)
export const V_IN = 2 // m/s nominal flow
export const LEAK_DROP = 2.2 // bar, permanent step downstream of a leak
export const FLOW_FACTOR = 0.65 // downstream flow multiplier after a leak
export const LEAK_THRESHOLD = 4 // bar
export const LOW_FLOW_THRESHOLD = 1.5 // m/s
export const SCAN_SPEED = 0.8 // segments per second

export type Reading = { pressure: number; flow: number }

/** Reading at 1-based segment `seg`. A leak at k affects segments k..N (downstream). */
export function reading(seg: number, leakAt: number | null): Reading {
  let pressure = P_IN - P_DECAY * (seg - 1)
  let flow = V_IN
  if (leakAt !== null && seg >= leakAt) {
    pressure -= LEAK_DROP
    flow *= FLOW_FACTOR
  }
  return { pressure, flow }
}

/** Alarm needs both a pressure drop and a flow reduction (a permanent, not transient, signature). */
export function isAlarm(r: Reading): boolean {
  return r.pressure < LEAK_THRESHOLD && r.flow < LOW_FLOW_THRESHOLD
}

export type Scan = { pos: number; found: number | null; done: boolean }

export const newScan = (): Scan => ({ pos: 0, found: null, done: false })

export const currentSegment = (s: Scan): number => Math.min(N_SEG, Math.floor(s.pos) + 1)

export const progress = (s: Scan): number =>
  s.done && s.found === null ? 100 : Math.round((Math.min(s.pos, N_SEG) / N_SEG) * 100)

/** Advance the robot; checks the segment it stands in. Stops when a leak is detected or the pipe ends. */
export function stepScan(s: Scan, leakAt: number | null, dt: number, speed = SCAN_SPEED): Scan {
  if (s.done) return s
  const seg = currentSegment(s)
  if (isAlarm(reading(seg, leakAt))) return { pos: s.pos, found: seg, done: true }
  const pos = s.pos + speed * dt
  if (pos >= N_SEG) return { pos: N_SEG, found: null, done: true }
  return { pos, found: null, done: false }
}
