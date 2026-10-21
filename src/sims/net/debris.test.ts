import { describe, expect, it } from 'vitest'
import { MAX_DEBRIS, MAX_THROW, clearDebris, createNet, debrisAt, holdDebris, spawnDebris, stepNet } from './core'

const fresh = () => { const s = createNet(8, 'decentralised', 3); clearDebris(s); return s }

describe('debris interaction', () => {
  it('spawns debris at the clicked point, drifting toward the centre when not thrown', () => {
    const s = fresh()
    spawnDebris(s, 1.5, 0)
    const d = s.debris[0]
    expect(d.x).toBe(1.5)
    expect(d.vx).toBeLessThan(0)
    expect(Math.abs(d.vy)).toBeLessThan(1e-9)
  })

  it('clamps throw speed and keeps the throw direction', () => {
    const s = fresh()
    spawnDebris(s, -1.5, 0, 50, 0)
    expect(s.debris[0].vx).toBeCloseTo(MAX_THROW, 6)
    expect(s.debris[0].vy).toBe(0)
  })

  it('caps the number of pieces by dropping the oldest', () => {
    const s = fresh()
    for (let i = 0; i < MAX_DEBRIS + 3; i++) spawnDebris(s, 1.6, i * 0.01)
    expect(s.debris).toHaveLength(MAX_DEBRIS)
    expect(s.debris[0].y).toBeCloseTo(3 * 0.01, 6) // the first three were dropped
  })

  it('finds the nearest debris within reach only', () => {
    const s = fresh()
    spawnDebris(s, 1, 1); spawnDebris(s, -1, -1)
    expect(debrisAt(s, 1.05, 1.0)).toBe(0)
    expect(debrisAt(s, -1.02, -1.0)).toBe(1)
    expect(debrisAt(s, 0, 0)).toBe(-1)
  })

  it('held debris does not move; released debris flies with the flick velocity', () => {
    const s = fresh()
    spawnDebris(s, 1.8, 0, 0.3, 0)
    holdDebris(s, 0, { x: 1.8, y: 0.2 })
    for (let i = 0; i < 30; i++) stepNet(s, 1 / 60)
    expect(s.debris[0].x).toBeCloseTo(1.8, 6)
    expect(s.debris[0].y).toBeCloseTo(0.2, 6)
    holdDebris(s, 0, null, -0.4, 0)
    for (let i = 0; i < 30; i++) stepNet(s, 1 / 60)
    expect(s.debris[0].x).toBeLessThan(1.8 - 0.1)
  })

  it('clearDebris empties the field', () => {
    const s = fresh()
    spawnDebris(s, 1, 1)
    clearDebris(s)
    expect(s.debris).toHaveLength(0)
  })
})
