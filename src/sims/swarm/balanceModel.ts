/**
 * Self-balancing two-wheel robot (pure): an inverted pendulum on a wheel (cart-pole).
 * The IMU measures the lean angle; the controller commands wheel acceleration; driving the wheels under the body
 * is what catches the fall. Parameters are illustrative, not measured from a real robot.
 *   body angle th (0 = upright, positive = leaning forward/right), rate om; wheel position x, speed v.
 *   th'' = (g sin th - a cos th) / l   where a is the wheel acceleration the motors produce.
 */
export const G = 9.81
export const L = 0.25 // distance from the axle to the centre of mass (m)
export const A_MAX = 7 // strongest wheel acceleration the motors can produce (m/s^2)
export const FALL = (40 * Math.PI) / 180
export const FRICTION = 0.9

export type Gains = { kp: number; kd: number }
export const PRESETS: Record<'weak' | 'good' | 'harsh', Gains> = {
  weak: { kp: 7, kd: 1 }, // below gravity's pull: cannot catch the fall
  good: { kp: 22, kd: 2.6 },
  harsh: { kp: 40, kd: 0.2 }, // strong but undamped: it catches the fall, then wobbles
}

export type Bot = { x: number; v: number; th: number; om: number; a: number; fallen: boolean; t: number }
export const initBot = (th = 0): Bot => ({ x: 0, v: 0, th, om: 0, a: 0, fallen: false, t: 0 })

/** What the controller asks of the wheels: a = Kp*tilt + Kd*tilt_rate (clamped to what the motors can do). */
export function command(b: Bot, g: Gains, enabled: boolean): number {
  if (!enabled) return 0
  return Math.max(-A_MAX, Math.min(A_MAX, g.kp * b.th + g.kd * b.om))
}

export function stepBot(b: Bot, dt: number, g: Gains, enabled: boolean): Bot {
  if (b.fallen) return { ...b, a: 0, v: b.v * (1 - Math.min(1, 3 * dt)), x: b.x + b.v * dt, t: b.t + dt }
  const a = command(b, g, enabled)
  const om = b.om + ((G * Math.sin(b.th) - a * Math.cos(b.th)) / L) * dt
  const th = b.th + om * dt
  const v = b.v + (a - FRICTION * b.v) * dt
  const x = b.x + v * dt
  return { x, v, th, om, a, fallen: Math.abs(th) > FALL, t: b.t + dt }
}

/** A shove: gives the body a sudden rotation rate (rad/s). Positive pushes it forward. */
export const push = (b: Bot, strength: number): Bot => (b.fallen ? b : { ...b, om: b.om + strength })

/** Largest |tilt| seen over a run after one shove, and whether it fell. */
export function shoveTest(g: Gains, strength = 1.2, seconds = 4, enabled = true) {
  let b = push(initBot(), strength)
  let peak = 0
  let settled = seconds
  for (let i = 0; i < seconds * 240; i++) {
    b = stepBot(b, 1 / 240, g, enabled)
    peak = Math.max(peak, Math.abs(b.th))
    if (!b.fallen && Math.abs(b.th) < 0.01 && Math.abs(b.om) < 0.05 && settled === seconds) settled = b.t
  }
  return { fallen: b.fallen, peak, settled, finalTilt: b.th }
}

/** Number of zero crossings of the tilt after a shove: more means more wobble. */
export function wobbleCount(g: Gains, strength = 1.2, seconds = 4) {
  let b = push(initBot(), strength)
  let crossings = 0
  let last = 0
  for (let i = 0; i < seconds * 240; i++) {
    b = stepBot(b, 1 / 240, g, true)
    if (b.fallen) break
    const s = Math.sign(b.th)
    if (s !== 0 && last !== 0 && s !== last && Math.abs(b.th) > 0.002) crossings++
    if (s !== 0) last = s
  }
  return crossings
}
