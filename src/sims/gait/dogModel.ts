/**
 * RoboDog mechanism model (pure). Based on James Bruton's six-servo open-source robot dog:
 *  - the body is two stacked plates; each plate carries one DIAGONAL pair of legs,
 *  - each leg has ONE servo driving a four-bar linkage that lifts the foot (4 lift servos),
 *  - one servo slides the plates against each other (steps), one rotates them against each other (turns).
 * A walk cycle lifts pair A, shifts it, lowers it, then lifts pair B and shifts the plates back, so each plate
 * advances in turn while the other stays planted. Illustrative simulation; timings are not measured from any robot.
 */
export type Cmd = 'idle' | 'forward' | 'backward' | 'left' | 'right'
export type Pair = 'A' | 'B'

/** Leg indices: 0 = front-left, 1 = front-right, 2 = back-left, 3 = back-right. Pair A = FL + BR, pair B = FR + BL. */
export const LEG_PAIR: Pair[] = ['A', 'B', 'B', 'A']
export const LEG_NAME = ['FL', 'FR', 'BL', 'BR']
/** Foot offsets in the body frame (x forward, y left), in metres. */
export const FOOT: { x: number; y: number }[] = [
  { x: 0.09, y: 0.06 }, { x: 0.09, y: -0.06 }, { x: -0.09, y: 0.06 }, { x: -0.09, y: -0.06 },
]
export const STEP_LEN = 0.05 // slide travel per half-cycle (m)
export const TURN_ANGLE = 0.35 // rotation per half-cycle (rad)
export const ACTIONS = 6 // lift A, shift, lower A, lift B, shift back, lower B

export type Servos = { lift: [number, number, number, number]; slide: number; rot: number }
export type Plate = { x: number; y: number; th: number }
export type DogState = {
  /** time inside the cycle, in action units 0..6 */
  t: number
  cmd: Cmd
  pending: Cmd
  A: Plate
  B: Plate
  /** servo outputs: lift 0 (foot down) .. 1 (foot up); slide/rot -1..1 */
  servos: Servos
  cycles: number
  /** footprints dropped when a foot lands: world x, y, leg */
  prints: { x: number; y: number; leg: number }[]
}

export const initDog = (): DogState => ({
  t: 0, cmd: 'idle', pending: 'idle', A: { x: 0, y: 0, th: 0 }, B: { x: 0, y: 0, th: 0 },
  servos: { lift: [0, 0, 0, 0], slide: 0, rot: 0 }, cycles: 0, prints: [],
})

const ease = (u: number) => u * u * (3 - 2 * u)
const clamp01 = (u: number) => Math.max(0, Math.min(1, u))

/** Servo targets at cycle position `t` (0..6) for a command. A pair is lifted only while its plate is the one that moves. */
export function servoAt(t: number, cmd: Cmd): Servos {
  const seg = Math.min(ACTIONS - 1, Math.floor(t))
  const u = ease(clamp01(t - seg))
  let liftA = 0, liftB = 0, shift = 0
  if (seg === 0) liftA = u
  else if (seg === 1) { liftA = 1; shift = u }
  else if (seg === 2) { liftA = 1 - u; shift = 1 }
  else if (seg === 3) { liftB = u; shift = 1 }
  else if (seg === 4) { liftB = 1; shift = 1 - u }
  else { liftB = 1 - u; shift = 0 }
  const dirSlide = cmd === 'forward' ? 1 : cmd === 'backward' ? -1 : 0
  const dirRot = cmd === 'left' ? 1 : cmd === 'right' ? -1 : 0
  const lift = LEG_PAIR.map((p) => (p === 'A' ? liftA : liftB)) as [number, number, number, number]
  return { lift, slide: shift * dirSlide, rot: shift * dirRot }
}

/** Is a pair clear of the ground (so its plate may move)? */
export const pairFree = (s: Servos, pair: Pair) => (pair === 'A' ? s.lift[0] : s.lift[1]) > 0.85

export function stepDog(s: DogState, dt: number, cmd: Cmd, actionTime = 0.35): DogState {
  let { t, pending } = s
  let active = s.cmd
  pending = cmd
  const atStart = t === 0
  if (atStart) active = pending // a new command only takes effect at a cycle boundary
  if (active === 'idle') {
    return { ...s, cmd: 'idle', pending, servos: servoAt(0, 'idle') }
  }
  const prev = servoAt(t, active)
  t += dt / actionTime
  let cycles = s.cycles
  if (t >= ACTIONS) { t = 0; cycles++ }
  const next = servoAt(t === 0 ? ACTIONS - 1e-9 : t, active)
  // plates move only while their pair is clear of the ground
  const ds = (next.slide - prev.slide) * STEP_LEN
  const dr = (next.rot - prev.rot) * TURN_ANGLE
  const A = { ...s.A }, B = { ...s.B }
  const heading = (A.th + B.th) / 2
  const ux = Math.cos(heading), uy = Math.sin(heading)
  const prints = s.prints
  if (pairFree(prev, 'A') && !pairFree(prev, 'B')) { A.x += ds * ux; A.y += ds * uy; A.th += dr }
  else if (pairFree(prev, 'B') && !pairFree(prev, 'A')) { B.x -= ds * ux; B.y -= ds * uy; B.th -= dr }
  // footprints when a foot comes back down
  let newPrints = prints
  for (let leg = 0; leg < 4; leg++) {
    if (prev.lift[leg] > 0.9 && next.lift[leg] <= 0.9) {
      const p = footWorld({ ...s, A, B }, leg)
      newPrints = [...newPrints.slice(-40), { x: p.x, y: p.y, leg }]
    }
  }
  const done = t === 0
  return { ...s, t, cmd: done ? 'idle' : active, pending, A, B, servos: done ? servoAt(0, 'idle') : next, cycles, prints: newPrints }
}

/** World position of a foot (the plate that carries it, turned by its own heading). */
export function footWorld(s: DogState, leg: number) {
  const plate = LEG_PAIR[leg] === 'A' ? s.A : s.B
  const f = FOOT[leg]
  const c = Math.cos(plate.th), sn = Math.sin(plate.th)
  return { x: plate.x + f.x * c - f.y * sn, y: plate.y + f.x * sn + f.y * c }
}

/** Body pose: average of the two plates. */
export const bodyPose = (s: DogState) => ({ x: (s.A.x + s.B.x) / 2, y: (s.A.y + s.B.y) / 2, th: (s.A.th + s.B.th) / 2 })

/** Number of feet on the ground (lift below the threshold). */
export const feetDown = (s: DogState) => s.servos.lift.filter((l) => l < 0.15).length

/** Four-bar linkage lift: foot height and a small fore/aft arc (m) for a lift servo value 0..1. */
export function legLift(u: number) {
  return { h: 0.035 * u, swing: 0.008 * Math.sin(Math.PI * u) }
}
