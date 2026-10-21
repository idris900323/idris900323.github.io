import { describe, expect, it } from 'vitest'
import { BODY_H, BLADE, KNEE_STAND, footBody, footWorld, initSpider, legPhase, servoTargets, stepSpider, type Cmd, type Gait } from './spiderModel'

const run = (cmd: Cmd, gait: Gait, seconds: number) => {
  let s = initSpider()
  let minDown = 4
  let maxHeight = 0
  for (let i = 0; i < seconds * 120; i++) {
    s = stepSpider(s, 1 / 120, cmd, gait)
    minDown = Math.min(minDown, s.stance.filter(Boolean).length)
    for (let l = 0; l < 4; l++) maxHeight = Math.max(maxHeight, footBody(l, s.servos[l]).z)
  }
  return { s, minDown, maxHeight }
}

describe('spider quadruped (two joints per leg, eight servos)', () => {
  it('each leg has exactly two servo angles: hip and knee', () => {
    const { servos } = servoTargets(0.3, 'crawl', 1, 1)
    expect(servos).toHaveLength(4)
    for (const sv of servos) expect(Object.keys(sv).sort()).toEqual(['hip', 'knee'])
  })

  it('a standing foot touches the ground', () => {
    for (let l = 0; l < 4; l++) expect(Math.abs(footBody(l, { hip: 0, knee: KNEE_STAND }).z)).toBeLessThan(1e-9)
    expect(BODY_H).toBeLessThan(BLADE)
  })

  it('the knee lifts the foot and the hip swings it fore and aft', () => {
    const base = footBody(0, { hip: 0, knee: KNEE_STAND })
    expect(footBody(0, { hip: 0, knee: KNEE_STAND + 0.4 }).z).toBeGreaterThan(base.z + 0.01)
    expect(footBody(0, { hip: 0.5, knee: KNEE_STAND }).x).toBeGreaterThan(base.x)
    expect(footBody(0, { hip: -0.5, knee: KNEE_STAND }).x).toBeLessThan(base.x)
    // the right-hand legs swing the same way (positive hip = foot forward)
    const baseR = footBody(1, { hip: 0, knee: KNEE_STAND })
    expect(footBody(1, { hip: 0.5, knee: KNEE_STAND }).x).toBeGreaterThan(baseR.x)
  })

  it('crawl lifts one leg at a time; trot lifts a diagonal pair', () => {
    for (let p = 0; p < 1; p += 0.02) {
      const crawl = [0, 1, 2, 3].filter((l) => legPhase(l, p, 'crawl').swing !== null)
      expect(crawl.length).toBeLessThanOrEqual(1)
      const trot = [0, 1, 2, 3].filter((l) => legPhase(l, p, 'trot').swing !== null)
      expect(trot.length).toBe(2)
      expect(trot.includes(0) === trot.includes(3)).toBe(true) // FL goes with BR
    }
  })

  it('walks forward with at least three feet planted in a crawl, and the body moves forward', () => {
    const { s, minDown, maxHeight } = run('forward', 'crawl', 12)
    expect(minDown).toBeGreaterThanOrEqual(3)
    expect(s.x).toBeGreaterThan(0.05)
    expect(Math.abs(s.y)).toBeLessThan(0.2 * s.x) // a little yaw drift is expected from a one-leg-at-a-time crawl
    expect(maxHeight).toBeGreaterThan(0.01)
  })

  it('trot keeps two diagonal feet planted and is faster than crawl', () => {
    const c = run('forward', 'crawl', 10).s.x
    const t = run('forward', 'trot', 10)
    expect(t.minDown).toBeGreaterThanOrEqual(2)
    expect(t.s.x).toBeGreaterThan(c)
  })

  it('walks backward and turns on the spot', () => {
    expect(run('backward', 'crawl', 10).s.x).toBeLessThan(-0.03)
    const l = run('left', 'trot', 10).s
    expect(l.th).toBeGreaterThan(0.2)
    expect(Math.hypot(l.x, l.y)).toBeLessThan(0.1)
    expect(run('right', 'trot', 10).s.th).toBeLessThan(-0.2)
  })

  it('planted feet do not slide on the ground', () => {
    let s = initSpider()
    const planted = new Map<number, { x: number; y: number }>()
    let worst = 0
    for (let i = 0; i < 1200; i++) {
      s = stepSpider(s, 1 / 120, 'forward', 'crawl')
      for (let l = 0; l < 4; l++) {
        if (s.stance[l]) {
          const w = footWorld(s, l)
          const p = planted.get(l)
          if (p) worst = Math.max(worst, Math.hypot(w.x - p.x, w.y - p.y)); else planted.set(l, { x: w.x, y: w.y })
        } else planted.delete(l)
      }
    }
    expect(worst).toBeLessThan(0.02) // a 2-joint leg cannot follow a straight line exactly, so a little scrub is expected
  })

  it('stops when idle: all feet down', () => {
    let s = initSpider()
    for (let i = 0; i < 300; i++) s = stepSpider(s, 1 / 120, 'forward', 'crawl')
    for (let i = 0; i < 10; i++) s = stepSpider(s, 1 / 120, 'idle', 'crawl')
    expect(s.stance.every(Boolean)).toBe(true)
  })
})
