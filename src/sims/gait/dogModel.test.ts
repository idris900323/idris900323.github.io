import { describe, expect, it } from 'vitest'
import { ACTIONS, STEP_LEN, TURN_ANGLE, bodyPose, feetDown, initDog, legLift, servoAt, stepDog, type Cmd } from './dogModel'

const run = (cmd: Cmd, cycles: number, actionTime = 0.35) => {
  let s = initDog()
  const dt = 1 / 120
  let minDown = 4
  let maxFree = 0
  const total = Math.round((cycles * ACTIONS * actionTime) / dt) + 5
  for (let i = 0; i < total; i++) {
    s = stepDog(s, dt, i < total - 400 ? cmd : 'idle', actionTime)
    minDown = Math.min(minDown, feetDown(s))
    maxFree = Math.max(maxFree, s.servos.lift.filter((l) => l > 0.5).length)
  }
  return { s, minDown, maxFree }
}

describe('RoboDog six-servo mechanism', () => {
  it('has six servo values: four lifts, one slide, one rotation, all in range', () => {
    for (let t = 0; t < ACTIONS; t += 0.05) {
      const v = servoAt(t, 'forward')
      expect(v.lift).toHaveLength(4)
      for (const l of v.lift) { expect(l).toBeGreaterThanOrEqual(0); expect(l).toBeLessThanOrEqual(1) }
      expect(Math.abs(v.slide)).toBeLessThanOrEqual(1)
      expect(v.rot).toBe(0)
    }
  })

  it('always keeps at least two feet planted and lifts only one diagonal pair at a time', () => {
    const { minDown, maxFree } = run('forward', 3)
    expect(minDown).toBeGreaterThanOrEqual(2)
    expect(maxFree).toBeLessThanOrEqual(2)
  })

  it('walks forward about one step length per plate per cycle, without sideways drift', () => {
    const { s } = run('forward', 3)
    const b = bodyPose(s)
    expect(b.x).toBeGreaterThan(0.8 * STEP_LEN * s.cycles)
    expect(b.x).toBeLessThan(1.2 * STEP_LEN * s.cycles)
    expect(Math.abs(b.y)).toBeLessThan(1e-6)
    expect(Math.abs(b.th)).toBeLessThan(1e-9)
  })

  it('walks backward with the slide servo reversed', () => {
    const { s } = run('backward', 2)
    expect(bodyPose(s).x).toBeLessThan(-0.5 * STEP_LEN)
  })

  it('turns on the spot with the rotation servo: heading changes, position does not', () => {
    const { s } = run('left', 2)
    const b = bodyPose(s)
    expect(b.th).toBeGreaterThan(0.8 * TURN_ANGLE * s.cycles)
    expect(Math.hypot(b.x, b.y)).toBeLessThan(1e-6)
    const r = run('right', 2)
    expect(bodyPose(r.s).th).toBeLessThan(-0.5 * TURN_ANGLE)
  })

  it('finishes the current cycle before stopping and returns all legs to the ground', () => {
    let s = initDog()
    for (let i = 0; i < 100; i++) s = stepDog(s, 1 / 120, 'forward')
    expect(s.t).toBeGreaterThan(0)
    for (let i = 0; i < 2000 && (s.t > 0 || s.cmd !== 'idle'); i++) s = stepDog(s, 1 / 120, 'idle')
    expect(s.cmd).toBe('idle')
    expect(feetDown(s)).toBe(4)
  })

  it('lifts the foot with a bounded four-bar motion', () => {
    expect(legLift(0).h).toBe(0)
    expect(legLift(1).h).toBeGreaterThan(0.02)
    expect(legLift(0.5).swing).toBeGreaterThan(0)
  })
})
