/**
 * Spider quadruped model (pure), read from the photo: four legs, each with TWO servo joints (8 servos in total):
 *  - a hip servo at the body corner swings the upper link in the horizontal plane (fore and aft),
 *  - a knee servo at the end of that link tilts a straight blade, which lifts the foot and moves it outward.
 * Body motion is not scripted: it is solved from the planted feet (rigid-body fit), so any gait that keeps feet
 * planted moves the body consistently. Dimensions and angles are illustrative, not measured.
 */
export type Gait = 'crawl' | 'trot'
export type Cmd = 'idle' | 'forward' | 'backward' | 'left' | 'right'

export const LEG_NAME = ['FL', 'FR', 'BL', 'BR'] as const
/** Hip positions in the body frame (x forward, y left), metres. */
export const HIP = [{ x: 0.045, y: 0.035 }, { x: 0.045, y: -0.035 }, { x: -0.045, y: 0.035 }, { x: -0.045, y: -0.035 }]
/** Rest direction of each upper link (radians from +x, counter-clockwise): outward and splayed. */
export const ALPHA0 = [(80 * Math.PI) / 180, (-80 * Math.PI) / 180, (100 * Math.PI) / 180, (-100 * Math.PI) / 180]
const SIDE = [1, -1, 1, -1] // +1 left, -1 right
export const LINK = 0.075 // upper link length
export const BLADE = 0.085 // lower blade length
export const BODY_H = 0.065 // body height above the ground when standing
export const KNEE_STAND = Math.acos(BODY_H / BLADE) // knee angle at which the foot touches the ground
export const KNEE_LIFT = (24 * Math.PI) / 180 // extra knee angle while the foot is lifted
export const SWING = (22 * Math.PI) / 180 // hip swing amplitude

export type Servo = { hip: number; knee: number }
export type SpiderState = {
  phase: number // 0..1 through the gait cycle
  x: number; y: number; th: number // body pose in the world
  servos: Servo[]
  stance: boolean[]
  cycles: number
  prints: { x: number; y: number }[]
}

export const initSpider = (): SpiderState => ({
  phase: 0, x: 0, y: 0, th: 0, servos: standing(), stance: [true, true, true, true], cycles: 0, prints: [],
})
const standing = (): Servo[] => [0, 1, 2, 3].map(() => ({ hip: 0, knee: KNEE_STAND }))

const smooth = (u: number) => u * u * (3 - 2 * u)

/** Swing fraction (0..1 inside a swing, null in stance) and stance progress for a leg at gait phase p. */
export function legPhase(leg: number, p: number, gait: Gait): { swing: number | null; stance: number } {
  if (gait === 'trot') {
    const group = leg === 0 || leg === 3 ? 0 : 1 // diagonal pairs FL+BR and FR+BL
    const q = (p + group * 0.5) % 1
    return q < 0.5 ? { swing: q / 0.5, stance: 0 } : { swing: null, stance: (q - 0.5) / 0.5 }
  }
  // crawl: one leg at a time in the order FL, BR, FR, BL
  const order = [0, 2, 3, 1][leg] // FL 0, FR 2, BL 3, BR 1
  const q = (p + 1 - order * 0.25) % 1
  return q < 0.25 ? { swing: q / 0.25, stance: 0 } : { swing: null, stance: (q - 0.25) / 0.75 }
}

/** Servo targets for every leg. `scale` per side sets stride direction and length (1 forward, -1 backward, per side for turns). */
export function servoTargets(p: number, gait: Gait, scaleL: number, scaleR: number): { servos: Servo[]; stance: boolean[] } {
  const servos: Servo[] = []
  const stance: boolean[] = []
  for (let leg = 0; leg < 4; leg++) {
    const { swing, stance: st } = legPhase(leg, p, gait)
    const s = SIDE[leg] > 0 ? scaleL : scaleR
    let swingPos: number // -1 (back) .. +1 (front), in "stride direction" units
    let lift = 0
    if (swing !== null) { swingPos = -1 + 2 * smooth(swing); lift = Math.sin(Math.PI * swing) } else { swingPos = 1 - 2 * st }
    servos.push({ hip: swingPos * s * SWING, knee: KNEE_STAND + lift * KNEE_LIFT })
    stance.push(swing === null)
  }
  return { servos, stance }
}

/** Foot position in the body frame and its height above the ground for a leg with the given servo angles. */
export function footBody(leg: number, sv: Servo) {
  const side = SIDE[leg]
  const alpha = ALPHA0[leg] - side * sv.hip // hip swings the link; positive hip = foot forward
  const ux = Math.cos(alpha), uy = Math.sin(alpha)
  const kx = HIP[leg].x + LINK * ux, ky = HIP[leg].y + LINK * uy
  const out = BLADE * Math.sin(sv.knee)
  return { x: kx + out * ux, y: ky + out * uy, z: BODY_H - BLADE * Math.cos(sv.knee), kx, ky }
}

export const speedFactor = (cmd: Cmd) => (cmd === 'idle' ? 0 : 1)
export const sides = (cmd: Cmd): [number, number] => (cmd === 'forward' ? [1, 1] : cmd === 'backward' ? [-1, -1] : cmd === 'left' ? [-0.8, 0.8] : cmd === 'right' ? [0.8, -0.8] : [0, 0])

/** Advance the gait by dt; the body is moved so that planted feet stay fixed on the ground. */
export function stepSpider(s: SpiderState, dt: number, cmd: Cmd, gait: Gait, cycleSeconds = 2.4): SpiderState {
  const moving = cmd !== 'idle'
  const [sl, sr] = sides(cmd)
  let phase = s.phase
  if (moving) phase = (phase + dt / cycleSeconds) % 1
  const cycles = s.cycles + (moving && phase < s.phase ? 1 : 0)
  const { servos, stance } = moving ? servoTargets(phase, gait, sl, sr) : { servos: standing(), stance: [true, true, true, true] }
  // rigid-body fit on the feet that were planted in both the old and the new pose
  const idx = [0, 1, 2, 3].filter((i) => s.stance[i] && stance[i])
  let { x, y, th } = s
  if (idx.length >= 2) {
    const old = idx.map((i) => footBody(i, s.servos[i])), nw = idx.map((i) => footBody(i, servos[i]))
    const cx = old.reduce((a, f) => a + f.x, 0) / idx.length, cy = old.reduce((a, f) => a + f.y, 0) / idx.length
    let tx = 0, ty = 0, num = 0, den = 0
    idx.forEach((_, k) => {
      const dx = nw[k].x - old[k].x, dy = nw[k].y - old[k].y
      tx += dx; ty += dy
      const rx = old[k].x - cx, ry = old[k].y - cy
      num += rx * dy - ry * dx; den += rx * rx + ry * ry
    })
    tx /= idx.length; ty /= idx.length
    const dth = den > 1e-9 ? -num / den : 0
    const c = Math.cos(th), sn = Math.sin(th)
    // feet stay put, so the body moves opposite to the foot's motion relative to the body
    x += -(tx * c - ty * sn); y += -(tx * sn + ty * c); th += dth
  }
  let prints = s.prints
  for (let i = 0; i < 4; i++) {
    if (!s.stance[i] && stance[i]) {
      const f = footBody(i, servos[i]), c = Math.cos(th), sn = Math.sin(th)
      prints = [...prints.slice(-40), { x: x + f.x * c - f.y * sn, y: y + f.x * sn + f.y * c }]
    }
  }
  return { phase, x, y, th, servos, stance, cycles, prints }
}

export const footWorld = (s: SpiderState, leg: number) => {
  const f = footBody(leg, s.servos[leg]), c = Math.cos(s.th), sn = Math.sin(s.th)
  return { x: s.x + f.x * c - f.y * sn, y: s.y + f.x * sn + f.y * c, z: f.z }
}
