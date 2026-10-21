/** Pure swarm models. Parameters are assumed/illustrative (simulation only). */

// ---- Coordination: range-limited average consensus, decentralised vs boss ----
export type Mode = 'decentral' | 'boss'
export type Unit = { id: number; x: number; y: number; h: number; alive: boolean }
export type Swarm = { units: Unit[]; mode: Mode; range: number; t: number }
export const BOSS_ID = 0
const SPEED = 0.08
const K_CONS = 1.5

export function makeSwarm(n = 5, mode: Mode = 'decentral', headings?: number[], range = 0.6): Swarm {
  const units: Unit[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    units.push({ id: i, x: 0.25 * Math.cos(a), y: 0.25 * Math.sin(a), h: headings?.[i] ?? ((i * 1.7) % 3) - 1.5, alive: true })
  }
  return { units, mode, range, t: 0 }
}
const dist = (a: Unit, b: Unit) => Math.hypot(a.x - b.x, a.y - b.y)
export const alive = (s: Swarm) => s.units.filter((u) => u.alive)
export const bossAlive = (s: Swarm) => s.units.some((u) => u.id === BOSS_ID && u.alive)
export const neighbours = (s: Swarm, u: Unit) => s.units.filter((v) => v.alive && v.id !== u.id && dist(u, v) <= s.range)
/** Boss mode: followers with no living boss are orphaned and lose all commands. */
export const isOrphan = (s: Swarm, u: Unit) => s.mode === 'boss' && u.id !== BOSS_ID && u.alive && !bossAlive(s)

export function kill(s: Swarm, id: number): Swarm {
  return { ...s, units: s.units.map((u) => (u.id === id ? { ...u, alive: false } : u)) }
}

export function stepSwarm(s: Swarm, dt: number): Swarm {
  const boss = s.units.find((u) => u.id === BOSS_ID && u.alive)
  const units = s.units.map((u) => {
    if (!u.alive) return u
    let h = u.h
    let vx = 0, vy = 0, moving = true
    if (s.mode === 'boss') {
      if (u.id !== BOSS_ID) {
        if (boss) {
          h += K_CONS * (boss.h - h) * dt
          const a = (u.id / (s.units.length - 1)) * Math.PI * 2
          const tx = boss.x - 0.2 * Math.cos(boss.h) + 0.18 * Math.cos(a)
          const ty = boss.y - 0.2 * Math.sin(boss.h) + 0.18 * Math.sin(a)
          vx = (tx - u.x) * 1.5
          vy = (ty - u.y) * 1.5
        } else moving = false // orphaned
      }
    } else {
      const nb = neighbours(s, u)
      if (nb.length) {
        h += (K_CONS * nb.reduce((a, v) => a + (v.h - u.h), 0) * dt) / nb.length
        const cx = nb.reduce((a, v) => a + v.x, 0) / nb.length
        const cy = nb.reduce((a, v) => a + v.y, 0) / nb.length
        vx += (cx - u.x) * 0.4 // cohesion
        vy += (cy - u.y) * 0.4
        for (const v of nb) {
          const d = Math.max(dist(u, v), 1e-3) // separation
          if (d < 0.15) {
            vx += ((u.x - v.x) / d) * (0.15 - d) * 3
            vy += ((u.y - v.y) / d) * (0.15 - d) * 3
          }
        }
      }
    }
    if (moving) {
      vx += SPEED * Math.cos(h)
      vy += SPEED * Math.sin(h)
    }
    return { ...u, x: u.x + vx * dt, y: u.y + vy * dt, h }
  })
  return { ...s, units, t: s.t + dt }
}

export function headingSpread(s: Swarm): number {
  const hs = alive(s).map((u) => u.h)
  return hs.length ? Math.max(...hs) - Math.min(...hs) : 0
}
export function connected(s: Swarm): boolean {
  const a = alive(s)
  if (a.length <= 1) return true
  const seen = new Set([a[0].id])
  const q = [a[0]]
  while (q.length) {
    const u = q.pop()!
    for (const v of neighbours(s, u)) if (!seen.has(v.id)) { seen.add(v.id); q.push(v) }
  }
  return seen.size === a.length
}
export const coherent = (s: Swarm) => headingSpread(s) < 0.1 && connected(s) && !s.units.some((u) => isOrphan(s, u))

// ---- Docking: docked platform carrying a payload over bumpy terrain ----
export const UNIT_W = 0.5
export const terrainH = (x: number) => 0.04 * Math.sin(x * 3) + 0.025 * Math.sin(x * 7.3 + 1)
export type Carry = { x: number; gap: number; docking: boolean }
export const newCarry = (): Carry => ({ x: 0, gap: 0.8, docking: false })
export const isDocked = (c: Carry) => c.gap <= 0.02
export function stepCarry(c: Carry, dt: number): Carry {
  const gap = c.docking ? Math.max(0, c.gap - 0.3 * dt) : Math.min(0.8, c.gap + 0.3 * dt)
  const docked = gap <= 0.02
  return { x: docked ? c.x + 0.25 * dt : c.x, gap, docking: c.docking }
}
export function platform(c: Carry) {
  const d = (UNIT_W + c.gap) / 2
  const xl = c.x - d, xr = c.x + d
  const hl = terrainH(xl), hr = terrainH(xr)
  return { xl, xr, hl, hr, tilt: Math.atan2(hr - hl, xr - xl), width: isDocked(c) ? 2 * UNIT_W : UNIT_W }
}
