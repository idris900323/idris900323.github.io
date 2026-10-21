/** CONCEPTUAL, untested. No hardware or in-orbit validation. A toy 2-D model only. */
export type Mode = 'centralised' | 'decentralised'
export type P = { x: number; y: number; px: number; py: number }
export type Debris = { x: number; y: number; vx: number; vy: number; r: number; held?: boolean }
export type Node = {
  /** tension / contraction signal 0..1 */
  c: number
  /** local estimate of debris position (shared only with ring neighbours), or null */
  mx: number | null
  my: number | null
  alive: boolean
  drag: { x: number; y: number } | null
}
export type Constraint = { a: number; b: number; rest: number }
export type NetSim = {
  n: number
  K: number
  mode: Mode
  p: P[]
  cons: Constraint[]
  nodes: Node[]
  debris: Debris[]
  t: number
  closedEver: boolean
  seed: number
}

export const R = 1 // ring radius (arbitrary units)
export const SENSE = 1.15 // node sensing radius
export const CLOSE_AREA = 0.45 // closed when polygon area < this fraction of the open ring
export const CONTROLLER = 0
const TIGHT = 0.3

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const nodeIndex = (s: Pick<NetSim, 'n' | 'K'>, i: number) => (s.K - 1) * s.n + (((i % s.n) + s.n) % s.n)
const baseAngle = (n: number, i: number) => (2 * Math.PI * i) / n

export function createNet(n = 8, mode: Mode = 'decentralised', seed = 1, K = 4): NetSim {
  const p: P[] = []
  for (let k = 1; k <= K; k++) {
    for (let i = 0; i < n; i++) {
      const r = (R * k) / K, a = baseAngle(n, i)
      const x = r * Math.cos(a), y = r * Math.sin(a)
      p.push({ x, y, px: x, py: y })
    }
  }
  p.push({ x: 0, y: 0, px: 0, py: 0 }) // centre
  const centre = p.length - 1
  const cons: Constraint[] = []
  const add = (a: number, b: number) => cons.push({ a, b, rest: Math.hypot(p[a].x - p[b].x, p[a].y - p[b].y) })
  for (let k = 0; k < K; k++) {
    for (let i = 0; i < n; i++) {
      add(k * n + i, k * n + ((i + 1) % n))
      if (k < K - 1) add(k * n + i, (k + 1) * n + i)
    }
  }
  for (let i = 0; i < n; i++) add(centre, i)
  const nodes: Node[] = Array.from({ length: n }, () => ({ c: 0, mx: null, my: null, alive: true, drag: null }))
  return { n, K, mode, p, cons, nodes, debris: [], t: 0, closedEver: false, seed }
}

export function addDebris(s: NetSim, count = 1) {
  const r = mulberry(s.seed + s.debris.length * 977 + Math.floor(s.t * 100))
  for (let j = 0; j < count; j++) {
    const a = r() * Math.PI * 2, d = 1.9 + r() * 0.4
    const ta = r() * Math.PI * 2, td = r() * 0.35
    const tx = td * Math.cos(ta), ty = td * Math.sin(ta)
    const x = d * Math.cos(a), y = d * Math.sin(a)
    const sp = 0.12 + r() * 0.06
    const L = Math.hypot(tx - x, ty - y)
    s.debris.push({ x, y, vx: ((tx - x) / L) * sp, vy: ((ty - y) / L) * sp, r: 0.07 })
  }
}

export const MAX_DEBRIS = 8
export const MAX_THROW = 0.7
const clampV = (v: number) => Math.max(-MAX_THROW, Math.min(MAX_THROW, v))

/** Drop a piece of debris at a world position with an initial velocity (a throw). With no velocity it drifts gently toward the centre. */
export function spawnDebris(s: NetSim, x: number, y: number, vx = 0, vy = 0): boolean {
  if (s.debris.length >= MAX_DEBRIS) s.debris.shift() // oldest leaves, so the user can keep playing
  if (Math.hypot(vx, vy) < 0.02) {
    const L = Math.hypot(x, y) || 1
    vx = (-x / L) * 0.12; vy = (-y / L) * 0.12
  }
  s.debris.push({ x, y, vx: clampV(vx), vy: clampV(vy), r: 0.07 })
  return true
}

/** Index of the debris nearest to a world point within `reach`, or -1. */
export function debrisAt(s: NetSim, x: number, y: number, reach = 0.22): number {
  let best = -1, bd = reach
  s.debris.forEach((d, i) => { const dd = Math.hypot(d.x - x, d.y - y); if (dd < bd) { bd = dd; best = i } })
  return best
}

/** Pick up (pos given) or release (pos null, with a flick velocity) a piece of debris. */
export function holdDebris(s: NetSim, i: number, pos: { x: number; y: number } | null, vx = 0, vy = 0) {
  const d = s.debris[i]
  if (!d) return
  if (pos) { d.held = true; d.x = pos.x; d.y = pos.y; d.vx = 0; d.vy = 0 }
  else { d.held = false; d.vx = clampV(vx); d.vy = clampV(vy) }
}

export const clearDebris = (s: NetSim) => { s.debris.length = 0 }

export function setMode(s: NetSim, m: Mode) { s.mode = m }

/** Fail one node. Centralised mode: the controller (node 0) goes first, which is the point of the demo. Returns the index or -1. */
export function failNode(s: NetSim, pick?: number): number {
  let i = pick ?? -1
  if (i < 0) {
    if (s.mode === 'centralised' && s.nodes[CONTROLLER].alive) i = CONTROLLER
    else {
      const alive = s.nodes.map((nd, k) => (nd.alive ? k : -1)).filter((k) => k >= 0)
      if (!alive.length) return -1
      const r = mulberry(s.seed + Math.floor(s.t * 1000) + alive.length)
      i = alive[Math.floor(r() * alive.length)]
    }
  }
  if (!s.nodes[i]?.alive) return -1
  s.nodes[i].alive = false
  s.nodes[i].drag = null
  const q = s.p[nodeIndex(s, i)]
  const a = baseAngle(s.n, i)
  q.px = q.x - Math.cos(a) * 0.004; q.py = q.y - Math.sin(a) * 0.004 // lets go and drifts outward slowly
  return i
}
export const controllerAlive = (s: NetSim) => s.nodes[CONTROLLER].alive

export function dragNode(s: NetSim, i: number, to: { x: number; y: number } | null) {
  if (s.nodes[i]?.alive) s.nodes[i].drag = to
}

const nbrs = (s: NetSim, i: number) => {
  // nearest alive ring neighbours on each side (a failed node is bridged over)
  const find = (dir: number) => {
    for (let j = 1; j < s.n; j++) { const k = (((i + dir * j) % s.n) + s.n) % s.n; if (s.nodes[k].alive) return k }
    return -1
  }
  return [find(-1), find(1)].filter((k, idx, arr) => k >= 0 && k !== i && arr.indexOf(k) === idx)
}

/** One tick of the tension / estimate update. Decentralised: reads ONLY own sensing and ring neighbours' previous values. */
export function updateTension(s: NetSim, dt: number) {
  const rate = Math.min(1, 5 * dt)
  const c0 = s.nodes.map((nd) => nd.c)
  const m0 = s.nodes.map((nd) => (nd.mx === null || nd.my === null ? null : { x: nd.mx, y: nd.my }))
  const active = s.debris.filter((d) => Math.hypot(d.x, d.y) < 1.5 * R)
  if (s.mode === 'centralised') {
    if (!controllerAlive(s)) return // no commands arrive: every node holds its last state
    let tgt = 0, mx: number | null = null, my: number | null = null
    if (active.length) {
      tgt = 1
      mx = active.reduce((a, d) => a + d.x, 0) / active.length
      my = active.reduce((a, d) => a + d.y, 0) / active.length
    }
    s.nodes.forEach((nd) => {
      if (!nd.alive) return
      nd.c += (tgt - nd.c) * rate
      nd.mx = mx; nd.my = my
    })
    return
  }
  s.nodes.forEach((nd, i) => {
    if (!nd.alive) return
    const q = s.p[nodeIndex(s, i)]
    const seen = s.debris.filter((d) => Math.hypot(d.x - q.x, d.y - q.y) < SENSE)
    const nb = nbrs(s, i)
    let tgt = 0
    for (const j of nb) tgt = Math.max(tgt, 0.93 * c0[j])
    if (seen.length) tgt = 1
    nd.c += (tgt - nd.c) * rate
    if (nd.c < 1e-6) nd.c = 0
    if (seen.length) {
      nd.mx = seen.reduce((a, d) => a + d.x, 0) / seen.length
      nd.my = seen.reduce((a, d) => a + d.y, 0) / seen.length
    } else {
      const ms = nb.map((j) => m0[j]).filter((m): m is { x: number; y: number } => m !== null)
      if (ms.length && tgt > 0) { nd.mx = ms.reduce((a, m) => a + m.x, 0) / ms.length; nd.my = ms.reduce((a, m) => a + m.y, 0) / ms.length }
      else if (nd.c === 0) { nd.mx = null; nd.my = null }
    }
  })
}

export function nodeTarget(s: NetSim, i: number) {
  const nd = s.nodes[i], a = baseAngle(s.n, i)
  const bx = R * Math.cos(a), by = R * Math.sin(a)
  if (nd.mx === null || nd.my === null) return { x: bx, y: by }
  const k = Math.min(1, nd.c)
  const tx = nd.mx + bx * TIGHT, ty = nd.my + by * TIGHT
  return { x: bx + (tx - bx) * k, y: by + (ty - by) * k }
}

export function ringArea(s: NetSim): number {
  let a = 0
  for (let i = 0; i < s.n; i++) {
    const p = s.p[nodeIndex(s, i)], q = s.p[nodeIndex(s, i + 1)]
    a += p.x * q.y - q.x * p.y
  }
  return Math.abs(a) / 2
}
export const openArea = (s: NetSim) => (s.n / 2) * Math.sin((2 * Math.PI) / s.n) * R * R
export const isClosed = (s: NetSim) => ringArea(s) < CLOSE_AREA * openArea(s)

export function insideRing(s: NetSim, x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = s.n - 1; i < s.n; j = i++) {
    const a = s.p[nodeIndex(s, i)], b = s.p[nodeIndex(s, j)]
    if (a.y > y !== b.y > y && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}
export const capturedCount = (s: NetSim) => (isClosed(s) ? s.debris.filter((d) => insideRing(s, d.x, d.y)).length : 0)

export function stepNet(s: NetSim, dt: number) {
  s.t += dt
  updateTension(s, dt)
  const nodeIdx = new Set(s.nodes.map((_, i) => nodeIndex(s, i)))
  // node actuation (kinematic with lag), dragging overrides
  s.nodes.forEach((nd, i) => {
    if (!nd.alive) return
    const q = s.p[nodeIndex(s, i)]
    const tgt = nd.drag ?? nodeTarget(s, i)
    const k = nd.drag ? 1 : Math.min(1, 3 * dt)
    q.x += (tgt.x - q.x) * k; q.y += (tgt.y - q.y) * k
    q.px = q.x; q.py = q.y
  })
  // Verlet integrate free particles
  s.p.forEach((q, idx) => {
    const free = !nodeIdx.has(idx) || !s.nodes[idx - (s.K - 1) * s.n].alive
    if (!free) return
    const vx = (q.x - q.px) * 0.96, vy = (q.y - q.py) * 0.96
    q.px = q.x; q.py = q.y
    q.x += vx; q.y += vy
  })
  // membrane smoothing for interior particles (keeps the mesh from clumping)
  for (let k = 0; k < s.K - 1; k++) {
    for (let i = 0; i < s.n; i++) {
      const q = s.p[k * s.n + i]
      const nbs = [s.p[k * s.n + ((i + 1) % s.n)], s.p[k * s.n + ((i + s.n - 1) % s.n)], s.p[(k + 1) * s.n + i], k > 0 ? s.p[(k - 1) * s.n + i] : s.p[s.p.length - 1]]
      const ax = nbs.reduce((a, b) => a + b.x, 0) / 4, ay = nbs.reduce((a, b) => a + b.y, 0) / 4
      q.x += (ax - q.x) * 0.02; q.y += (ay - q.y) * 0.02
    }
  }
  // debris motion + interaction with the net
  for (const d of s.debris) {
    if (d.held) continue // being carried by the pointer
    d.x += d.vx * dt; d.y += d.vy * dt
    for (const q of s.p) {
      const dx = q.x - d.x, dy = q.y - d.y, dist = Math.hypot(dx, dy), min = d.r + 0.05
      if (dist < min && dist > 1e-6) {
        const push = (min - dist) / dist
        q.x += dx * push * 0.5; q.y += dy * push * 0.5
        d.vx *= 0.995; d.vy *= 0.995
      }
    }
    if (insideRing(s, d.x, d.y)) { d.vx *= 1 - 0.8 * dt; d.vy *= 1 - 0.8 * dt }
  }
  // rope constraints: resist stretching, not compression
  for (let it = 0; it < 10; it++) {
    for (const c of s.cons) {
      const a = s.p[c.a], b = s.p[c.b]
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy)
      if (d <= c.rest || d === 0) continue
      const diff = (d - c.rest) / d
      const fa = !isPinned(s, c.a), fb = !isPinned(s, c.b)
      const wa = fa ? (fb ? 0.5 : 1) : 0, wb = fb ? (fa ? 0.5 : 1) : 0
      a.x += dx * diff * wa; a.y += dy * diff * wa
      b.x -= dx * diff * wb; b.y -= dy * diff * wb
    }
  }
  if (!s.closedEver && isClosed(s) && capturedCount(s) > 0) s.closedEver = true
}

function isPinned(s: NetSim, idx: number) {
  const base = (s.K - 1) * s.n
  return idx >= base && idx < base + s.n && s.nodes[idx - base].alive
}
