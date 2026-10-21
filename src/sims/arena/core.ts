/**
 * Drive-a-bot arena model (pure). Three chassis, matching the three builds:
 *  - castor: two driven wheels plus a free-swivelling castor (differential drive, pivots on the spot, light and quick)
 *  - fourwd: four driven wheels (skid steering: turning scrubs the tyres, so it turns less sharply and loses speed)
 *  - tank: two tracks (skid steering with large sideways slip, slow, strong, and it climbs over small rubble)
 * Parameters are illustrative and not measured from the robots.
 */
export type Chassis = 'castor' | 'fourwd' | 'tank'

type Spec = {
  maxSpeed: number // px/s
  track: number // effective wheel separation px (sets the yaw rate)
  tau: number // motor lag s
  turnEff: number // fraction of the ideal yaw rate achieved
  slip: number // how fast sideways slip relaxes (0 = none)
  drift: number // how strongly turning at speed pushes the robot sideways
  scrub: number // forward speed lost while turning (tyre scrub)
  radius: number // collision radius px
  climb: boolean // can drive over small rubble
  wobble: number // castor flutter when reversing
}
export const CHASSIS: Record<Chassis, Spec> = {
  castor: { maxSpeed: 180, track: 70, tau: 0.12, turnEff: 1, slip: 0, drift: 0, scrub: 0, radius: 29, climb: false, wobble: 0.55 },
  fourwd: { maxSpeed: 150, track: 80, tau: 0.22, turnEff: 0.65, slip: 2.2, drift: 0.16, scrub: 0.4, radius: 34, climb: false, wobble: 0 },
  tank: { maxSpeed: 105, track: 80, tau: 0.2, turnEff: 0.6, slip: 1.4, drift: 0.3, scrub: 0.15, radius: 37, climb: true, wobble: 0 },
}

/** Qualitative 0..1 ratings shown to the user (illustrative, derived from the parameters above and how each type drives). */
export const PROFILE: Record<Chassis, { agility: number; speed: number; grip: number; obstacles: number }> = {
  castor: { agility: 0.95, speed: 0.95, grip: 0.55, obstacles: 0.15 },
  fourwd: { agility: 0.5, speed: 0.8, grip: 0.8, obstacles: 0.35 },
  tank: { agility: 0.45, speed: 0.55, grip: 1, obstacles: 0.95 },
}

export const ARENA = { w: 640, h: 400 }
export type Circle = { x: number; y: number; r: number; rubble?: boolean }
export const OBSTACLES: Circle[] = [
  { x: 320, y: 200, r: 44 },
  { x: 170, y: 110, r: 22, rubble: true },
  { x: 470, y: 300, r: 22, rubble: true },
]
/** Checkpoints visited in order; the first one doubles as the start/finish gate. */
export const GATES: Circle[] = [
  { x: 540, y: 90, r: 34 },
  { x: 540, y: 320, r: 34 },
  { x: 100, y: 320, r: 34 },
  { x: 100, y: 90, r: 34 },
]

export type Input = { throttle: number; turn: number }
export type Bot = {
  x: number; y: number; theta: number
  vL: number; vR: number // normalised wheel speeds -1..1 (after motor lag)
  vx: number; vy: number; omega: number
  next: number; lapTime: number; laps: number; best: number | null
  bumps: number; shake: number
  castor: number // swivel angle of the castor wheel (rad), only drawn for the castor chassis
  onRubble: boolean
  clock: number
}

export const initBot = (): Bot => ({ x: 60, y: 200, theta: 0, vL: 0, vR: 0, vx: 0, vy: 0, omega: 0, next: 1, lapTime: 0, laps: 0, best: null, bumps: 0, shake: 0, castor: 0, onRubble: false, clock: 0 })

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))

/** Mix throttle/turn into left/right commands (-1..1), preserving the ratio when saturating. */
export function mix(i: Input): { l: number; r: number } {
  const t = clamp(i.throttle, -1, 1), u = clamp(i.turn, -1, 1)
  let l = t + u, r = t - u
  const m = Math.max(1, Math.abs(l), Math.abs(r))
  l /= m; r /= m
  return { l, r }
}
/** 0..255 PWM duty from a normalised command. */
export const pwm = (c: number) => Math.round(clamp(Math.abs(c), 0, 1) * 255)

export function keysToInput(keys: ReadonlySet<string>): Input {
  const has = (...k: string[]) => k.some((x) => keys.has(x))
  return {
    throttle: (has('w', 'arrowup') ? 1 : 0) - (has('s', 'arrowdown') ? 1 : 0),
    turn: (has('d', 'arrowright') ? 1 : 0) - (has('a', 'arrowleft') ? 1 : 0),
  }
}

export function stickToInput(dx: number, dy: number): Input {
  // dx,dy in -1..1 with y down on screen; forward = up
  const m = Math.hypot(dx, dy)
  const k = m > 1 ? 1 / m : 1
  return { throttle: -dy * k, turn: dx * k }
}

export function stepBot(b: Bot, dt: number, input: Input, kind: Chassis): Bot {
  const c = CHASSIS[kind]
  const { l, r } = mix(input)
  const a = 1 - Math.exp(-dt / c.tau)
  const vL = b.vL + (l - b.vL) * a
  const vR = b.vR + (r - b.vR) * a
  const omegaIdeal = (((vL - vR) * c.maxSpeed) / c.track) * c.turnEff
  // skid-steered chassis scrub their tyres or tracks when turning, so they lose forward speed
  const scrub = 1 - c.scrub * Math.min(1, Math.abs(omegaIdeal) / 2.5)
  const vForward = ((vL + vR) / 2) * c.maxSpeed * scrub * (b.onRubble && c.climb ? 0.6 : 1)
  let { vy } = b
  if (c.slip > 0) {
    // skid steering: sideways drift builds with yaw rate and speed, then relaxes as the wheels or tracks regain grip
    vy += (-c.drift * vForward * omegaIdeal - c.slip * vy) * dt
  }
  const clock = b.clock + dt
  // a trailing castor flutters when the robot reverses (it has to swing around to lead)
  const flutter = c.wobble > 0 && vForward < -10 ? c.wobble * Math.sin(clock * 11) * (Math.abs(vForward) / c.maxSpeed) : 0
  const theta = b.theta + (omegaIdeal + flutter) * dt
  const cs = Math.cos(theta), sn = Math.sin(theta)
  const x = b.x + (vForward * cs - vy * sn) * dt
  const y = b.y + (vForward * sn + vy * cs) * dt
  // castor swivel (visual): trails the direction of travel, follows the spin when turning
  const target = c.wobble > 0 ? clamp(Math.atan2(-omegaIdeal * 14, Math.max(20, Math.abs(vForward))) * (vForward < 0 ? -1 : 1), -1.2, 1.2) : 0
  const castor = b.castor + (target - b.castor) * (1 - Math.exp(-dt / 0.12))
  return { ...b, x, y, theta, vL, vR, vx: vForward, vy, omega: omegaIdeal + flutter, lapTime: b.lapTime + dt, shake: Math.max(0, b.shake - dt * 3), castor, clock }
}

/** Resolve collisions with walls and circular obstacles. Tracked chassis drive over small rubble instead of hitting it. */
export function collide(b: Bot, kind: Chassis): Bot {
  const spec = CHASSIS[kind]
  const R = spec.radius
  let { x, y, vL, vR, bumps, shake } = b
  let hit = false
  let onRubble = false
  if (x < R) { x = R; hit = true }
  if (x > ARENA.w - R) { x = ARENA.w - R; hit = true }
  if (y < R) { y = R; hit = true }
  if (y > ARENA.h - R) { y = ARENA.h - R; hit = true }
  for (const o of OBSTACLES) {
    const dx = x - o.x, dy = y - o.y, d = Math.hypot(dx, dy), min = R + o.r
    if (d < min) {
      if (o.rubble && spec.climb) { onRubble = true; continue }
      const nx = d === 0 ? 1 : dx / d, ny = d === 0 ? 0 : dy / d
      x = o.x + nx * min; y = o.y + ny * min; hit = true
    }
  }
  if (hit) {
    // lose most forward speed on impact
    const impact = Math.abs(b.vx) > 20
    if (impact) { vL *= 0.3; vR *= 0.3; bumps += 1; shake = Math.min(1, shake + 0.6) }
  }
  return { ...b, x, y, vL, vR, bumps, shake, onRubble }
}

/** Gate/lap logic. Returns updated bot and whether a lap just completed. */
export function checkGates(b: Bot): { bot: Bot; lap: boolean } {
  const g = GATES[b.next % GATES.length]
  if (Math.hypot(b.x - g.x, b.y - g.y) > g.r) return { bot: b, lap: false }
  const nxt = (b.next + 1) % GATES.length
  if (b.next % GATES.length === 0) {
    const t = b.lapTime
    return { bot: { ...b, next: nxt, laps: b.laps + 1, best: b.best === null ? t : Math.min(b.best, t), lapTime: 0 }, lap: true }
  }
  return { bot: { ...b, next: nxt }, lap: false }
}

// ---- guided tests so the differences are easy to see ----
export type TestKind = 'arc' | 'pivot'
export const TEST_SECONDS = 2.6
export const testInput = (k: TestKind): Input => (k === 'arc' ? { throttle: 0.8, turn: 0.55 } : { throttle: 0, turn: 1 })
export const TEST_START = { x: 320, y: 330 }

export type TestResult = { kind: TestKind; radius: number | null; spinDegPerS: number; drift: number; speed: number }
/** Run a guided test from a clear patch of the arena and summarise it. */
export function runTest(kind: Chassis, test: TestKind): { result: TestResult; path: { x: number; y: number }[] } {
  let b = { ...initBot(), x: TEST_START.x, y: TEST_START.y, theta: -Math.PI / 2 }
  const path: { x: number; y: number }[] = []
  const dt = 1 / 120
  const start = { x: b.x, y: b.y, th: b.theta }
  let vSum = 0, n = 0
  for (let i = 0; i < TEST_SECONDS * 120; i++) {
    b = stepBot(b, dt, testInput(test), kind)
    if (i % 6 === 0) path.push({ x: b.x, y: b.y })
    if (i > 60) { vSum += Math.hypot(b.vx, b.vy); n++ }
  }
  const spin = ((b.theta - start.th) * 180) / Math.PI / TEST_SECONDS
  const v = n ? vSum / n : 0
  const w = Math.abs(b.omega)
  return {
    result: {
      kind: test,
      radius: test === 'arc' && w > 0.05 ? Math.abs(b.vx) / w : null,
      spinDegPerS: Math.abs(spin),
      drift: Math.hypot(b.x - start.x, b.y - start.y),
      speed: v,
    },
    path,
  }
}

// ---- simulated Bluetooth pairing (purely visual, no radio involved) ----
export type PairPhase = 'idle' | 'scanning' | 'pairing' | 'connected' | 'failed'
export type Pairing = { phase: PairPhase; t: number; attempts: number; failMsg: number }
export const initPairing = (): Pairing => ({ phase: 'idle', t: 0, attempts: 0, failMsg: -1 })
export const SCAN_S = 1.2, PAIR_S = 1.3
export const FAILURE_MESSAGE_COUNT = 5

export function startPairing(p: Pairing): Pairing {
  if (p.phase === 'scanning' || p.phase === 'pairing' || p.phase === 'connected') return p
  return { ...p, phase: 'scanning', t: 0, attempts: p.attempts + 1 }
}
export function stepPairing(p: Pairing, dt: number, failures: number): Pairing {
  if (p.phase !== 'scanning' && p.phase !== 'pairing') return p
  const t = p.t + dt
  if (p.phase === 'scanning') return t >= SCAN_S ? { ...p, phase: 'pairing', t: 0 } : { ...p, t }
  if (t < PAIR_S) return { ...p, t }
  return p.attempts <= failures
    ? { ...p, phase: 'failed', t: 0, failMsg: Math.min(p.attempts - 1, FAILURE_MESSAGE_COUNT - 1) }
    : { ...p, phase: 'connected', t: 0, failMsg: -1 }
}
export const disconnect = (p: Pairing): Pairing => ({ ...p, phase: 'idle', t: 0 })
