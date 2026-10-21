import { describe, expect, it } from 'vitest'
import {
  R, capturedCount, createNet, dragNode, failNode, insideRing, isClosed, nodeIndex, openArea, ringArea, setMode, stepNet, updateTension,
  type Mode, type NetSim,
} from './core'

const run = (s: NetSim, secs: number, dt = 1 / 60) => { for (let i = 0; i < secs / dt; i++) stepNet(s, dt) }
const withDebris = (mode: Mode, n = 8) => {
  const s = createNet(n, mode, 4)
  s.debris.push({ x: 0.35, y: 0.1, vx: 0, vy: 0, r: 0.07 })
  return s
}

describe('net structure', () => {
  it('builds a ring of n nodes with the expected area', () => {
    const s = createNet(8)
    expect(s.nodes).toHaveLength(8)
    expect(ringArea(s)).toBeCloseTo(openArea(s), 6)
    expect(isClosed(s)).toBe(false)
    const p = s.p[nodeIndex(s, 3)]
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(R, 6)
  })
  it('stays stable with no debris', () => {
    const s = createNet(8)
    run(s, 5)
    expect(ringArea(s)).toBeCloseTo(openArea(s), 2)
    expect(s.p.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y))).toBe(true)
  })
  it('point-in-ring works', () => {
    const s = createNet(8)
    expect(insideRing(s, 0, 0)).toBe(true)
    expect(insideRing(s, 2, 0)).toBe(false)
  })
  it('keeps interior link stretch bounded when a node is dragged', () => {
    const s = createNet(8)
    dragNode(s, 0, { x: 1.4, y: 0 })
    run(s, 2)
    for (const c of s.cons) {
      const a = s.p[c.a], b = s.p[c.b]
      const pinnedBoth = [c.a, c.b].every((i) => i >= 3 * s.n && i < 4 * s.n)
      if (!pinnedBoth) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(c.rest * 1.6)
    }
    expect(s.p[nodeIndex(s, 0)].x).toBeGreaterThan(1.3)
  })
})

describe('decentralised rule is local', () => {
  it('a sensing node informs only its ring neighbours on the first tick, then spreads hop by hop', () => {
    const s = createNet(12, 'decentralised')
    s.debris.push({ x: 1.0, y: 0.0, vx: 0, vy: 0, r: 0.07 })
    // shrink sensing by placing debris right at node 0 and far from the others
    s.debris[0].x = 1.9; s.debris[0].y = 0
    updateTension(s, 1 / 60)
    const sensing = s.nodes.map((nd) => nd.c > 0)
    expect(sensing[0]).toBe(true)
    expect(sensing.filter(Boolean).length).toBeLessThanOrEqual(3)
    expect(s.nodes[6].c).toBe(0)
    for (let i = 0; i < 6; i++) updateTension(s, 1 / 60)
    expect(s.nodes[2].c).toBeGreaterThan(0)
    expect(s.nodes[3].c).toBeLessThanOrEqual(s.nodes[1].c)
  })
  it('tension decays with ring distance from the sensing node', () => {
    const s = createNet(12, 'decentralised')
    s.debris.push({ x: 1.6, y: 0, vx: 0, vy: 0, r: 0.07 })
    for (let i = 0; i < 400; i++) updateTension(s, 1 / 60)
    const c = s.nodes.map((nd) => nd.c)
    expect(c[0]).toBeGreaterThanOrEqual(c[2])
    expect(c[2]).toBeGreaterThanOrEqual(c[4])
    expect(c[4]).toBeGreaterThanOrEqual(c[6])
  })
})

describe('closing around debris', () => {
  it('decentralised net closes and captures drifting debris', () => {
    const s = withDebris('decentralised')
    run(s, 8)
    expect(isClosed(s)).toBe(true)
    expect(capturedCount(s)).toBe(1)
    expect(s.closedEver).toBe(true)
  })
  it('centralised net also closes while its controller is alive', () => {
    const s = withDebris('centralised')
    run(s, 8)
    expect(capturedCount(s)).toBe(1)
  })
  it('centralised net does nothing once the controller fails (single point of failure)', () => {
    const s = withDebris('centralised')
    expect(failNode(s)).toBe(0) // controller goes first in centralised mode
    run(s, 8)
    expect(isClosed(s)).toBe(false)
    expect(capturedCount(s)).toBe(0)
    expect(s.nodes.filter((nd) => nd.alive).every((nd) => nd.c === 0)).toBe(true)
  })
  it('decentralised net degrades gracefully with a failed node', () => {
    const s = withDebris('decentralised')
    expect(failNode(s, 0)).toBe(0)
    run(s, 10)
    expect(s.nodes.filter((nd) => nd.alive)).toHaveLength(7)
    expect(isClosed(s)).toBe(true)
    expect(capturedCount(s)).toBe(1)
  })
})

describe('failure bookkeeping', () => {
  it('only fails alive nodes and returns -1 when none are left', () => {
    const s = createNet(6, 'decentralised', 2)
    const failed = new Set<number>()
    for (let i = 0; i < 6; i++) { const k = failNode(s); expect(k).toBeGreaterThanOrEqual(0); expect(failed.has(k)).toBe(false); failed.add(k); s.t += 0.37 }
    expect(failNode(s)).toBe(-1)
    expect(failNode(s, 2)).toBe(-1)
  })
  it('mode switch keeps the net intact', () => {
    const s = createNet(8)
    setMode(s, 'centralised')
    expect(s.mode).toBe('centralised')
    expect(s.nodes.every((nd) => nd.alive)).toBe(true)
  })
})
