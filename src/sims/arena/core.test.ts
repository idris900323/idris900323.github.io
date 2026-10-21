import { describe, expect, it } from 'vitest'
import { ARENA, CHASSIS, GATES, OBSTACLES, PROFILE, checkGates, collide, initBot, initPairing, keysToInput, mix, pwm, runTest, startPairing, stepBot, stepPairing, stickToInput, type Chassis } from './core'

const drive = (kind: Chassis, input: { throttle: number; turn: number }, secs: number) => {
  let b = initBot()
  for (let i = 0; i < secs * 120; i++) b = stepBot(b, 1 / 120, input, kind)
  return b
}

describe('differential drive', () => {
  it('mixes throttle and turn and keeps the ratio when saturated', () => {
    expect(mix({ throttle: 1, turn: 0 })).toEqual({ l: 1, r: 1 })
    expect(mix({ throttle: 0, turn: 1 })).toEqual({ l: 1, r: -1 })
    const m = mix({ throttle: 1, turn: 1 })
    expect(Math.max(Math.abs(m.l), Math.abs(m.r))).toBe(1)
    expect(m.r).toBeCloseTo(0)
  })
  it('PWM maps command magnitude to 0..255', () => {
    expect(pwm(0)).toBe(0); expect(pwm(-1)).toBe(255); expect(pwm(0.5)).toBe(128); expect(pwm(9)).toBe(255)
  })
  it('drives straight, and turns right (clockwise on screen) for positive turn', () => {
    const s = drive('castor', { throttle: 1, turn: 0 }, 1)
    expect(s.x).toBeGreaterThan(60 + 100)
    expect(Math.abs(s.y - 200)).toBeLessThan(1e-6)
    const r = drive('castor', { throttle: 0, turn: 1 }, 0.5)
    expect(r.theta).toBeGreaterThan(0.5)
    expect(Math.hypot(r.x - 60, r.y - 200)).toBeLessThan(2)
  })
  it('tank turns slower than the wheeled chassis and slips sideways', () => {
    const w = drive('castor', { throttle: 0.7, turn: 0.7 }, 1.5)
    const t = drive('tank', { throttle: 0.7, turn: 0.7 }, 1.5)
    expect(Math.abs(t.omega)).toBeLessThan(Math.abs(w.omega))
    expect(Math.abs(t.vy)).toBeGreaterThan(0.5)
    expect(w.vy).toBe(0)
  })
  it('motor lag: heavier chassis accelerates more slowly', () => {
    const a = drive('castor', { throttle: 1, turn: 0 }, 0.15)
    const b = drive('fourwd', { throttle: 1, turn: 0 }, 0.15)
    expect(a.vL).toBeGreaterThan(b.vL)
  })
})

describe('input mapping', () => {
  it('maps WASD and arrows, cancelling opposites', () => {
    expect(keysToInput(new Set(['w']))).toEqual({ throttle: 1, turn: 0 })
    expect(keysToInput(new Set(['arrowleft', 'arrowup']))).toEqual({ throttle: 1, turn: -1 })
    expect(keysToInput(new Set(['w', 's']))).toEqual({ throttle: 0, turn: 0 })
  })
  it('joystick pushes up = forward, and clamps beyond unit radius', () => {
    expect(stickToInput(0, -1)).toEqual({ throttle: 1, turn: 0 })
    const i = stickToInput(3, 0)
    expect(i.turn).toBeCloseTo(1)
  })
})

describe('collisions and laps', () => {
  it('walls keep the bot inside and count a bump at speed', () => {
    let b = { ...initBot(), x: 5, y: 200, vx: 100, vL: 1, vR: 1 }
    b = collide(b, 'castor')
    expect(b.x).toBeGreaterThanOrEqual(CHASSIS.castor.radius)
    expect(b.bumps).toBe(1)
    expect(b.vL).toBeLessThan(1)
    const c = collide({ ...initBot(), x: ARENA.w + 50, y: ARENA.h + 50 }, 'tank')
    expect(c.x).toBeLessThanOrEqual(ARENA.w)
  })
  it('obstacles push the bot out', () => {
    const b = collide({ ...initBot(), x: 320, y: 200 }, 'castor')
    expect(Math.hypot(b.x - 320, b.y - 200)).toBeGreaterThanOrEqual(44 + CHASSIS.castor.radius - 1e-6)
  })
  it('completes a lap only after visiting every gate in order', () => {
    let b = initBot()
    expect(b.next).toBe(1)
    let r = checkGates({ ...b, x: GATES[0].x, y: GATES[0].y })
    expect(r.lap).toBe(false) // wrong gate: nothing happens
    expect(r.bot.next).toBe(1)
    for (const gi of [1, 2, 3]) { r = checkGates({ ...b, x: GATES[gi].x, y: GATES[gi].y }); expect(r.lap).toBe(false); b = r.bot }
    b = { ...b, lapTime: 12.5 }
    r = checkGates({ ...b, x: GATES[0].x, y: GATES[0].y })
    expect(r.lap).toBe(true)
    expect(r.bot.laps).toBe(1)
    expect(r.bot.best).toBe(12.5)
    expect(r.bot.lapTime).toBe(0)
  })
})

describe('simulated pairing', () => {
  const run = (failures: number, attempts: number) => {
    let p = initPairing()
    const out = []
    for (let a = 0; a < attempts; a++) {
      p = startPairing(p)
      for (let i = 0; i < 400 && (p.phase === 'scanning' || p.phase === 'pairing'); i++) p = stepPairing(p, 0.01, failures)
      out.push({ ...p })
    }
    return out
  }
  it('connects first time by default', () => {
    expect(run(0, 1)[0].phase).toBe('connected')
  })
  it('fails the configured number of times with escalating message indices, then connects', () => {
    const r = run(3, 4)
    expect(r.map((x) => x.phase)).toEqual(['failed', 'failed', 'failed', 'connected'])
    expect(r.slice(0, 3).map((x) => x.failMsg)).toEqual([0, 1, 2])
  })
  it('caps the message index and ignores start while busy', () => {
    const r = run(9, 9)
    expect(r[8].failMsg).toBe(4)
    const busy = startPairing(startPairing(initPairing()))
    expect(busy.attempts).toBe(1)
  })
})

describe('the three chassis drive differently', () => {
  it('the castor car pivots on the spot and turns fastest', () => {
    const c = runTest('castor', 'pivot').result
    const f = runTest('fourwd', 'pivot').result
    const t = runTest('tank', 'pivot').result
    expect(c.drift).toBeLessThan(2)
    expect(c.spinDegPerS).toBeGreaterThan(f.spinDegPerS)
    expect(c.spinDegPerS).toBeGreaterThan(t.spinDegPerS)
  })

  it('the 4-wheel car and the tank scrub: sharper arcs, slower, and they slide sideways', () => {
    const c = runTest('castor', 'arc').result
    const f = runTest('fourwd', 'arc').result
    const t = runTest('tank', 'arc').result
    expect(c.speed).toBeGreaterThan(f.speed)
    expect(f.speed).toBeGreaterThan(t.speed)
    const slide = (k: Chassis) => { let b = initBot(); for (let i = 0; i < 400; i++) b = stepBot(b, 1 / 120, { throttle: 0.8, turn: 0.55 }, k); return Math.abs(b.vy) }
    expect(slide('castor')).toBe(0)
    expect(slide('fourwd')).toBeGreaterThan(0)
    expect(slide('tank')).toBeGreaterThan(slide('fourwd'))
  })

  it('only the castor car flutters in reverse; none do when driving forward', () => {
    const yaw = (k: Chassis, throttle: number) => { let b = initBot(); let sum = 0; for (let i = 0; i < 360; i++) { b = stepBot(b, 1 / 120, { throttle, turn: 0 }, k); sum += Math.abs(b.omega) } return sum }
    expect(yaw('castor', 1)).toBe(0)
    expect(yaw('castor', -1)).toBeGreaterThan(0.1)
    expect(yaw('fourwd', -1)).toBe(0)
    expect(yaw('tank', -1)).toBe(0)
  })

  it('the tank drives over small rubble; wheeled cars are blocked by it', () => {
    const rub = OBSTACLES.find((o) => o.rubble)!
    const t = collide({ ...initBot(), x: rub.x, y: rub.y }, 'tank')
    expect(t.x).toBeCloseTo(rub.x, 6)
    expect(t.onRubble).toBe(true)
    const w = collide({ ...initBot(), x: rub.x, y: rub.y }, 'fourwd')
    expect(Math.hypot(w.x - rub.x, w.y - rub.y)).toBeGreaterThanOrEqual(rub.r + CHASSIS.fourwd.radius - 1e-6)
    // the big obstacle is solid for everyone
    const big = collide({ ...initBot(), x: 320, y: 200 }, 'tank')
    expect(Math.hypot(big.x - 320, big.y - 200)).toBeGreaterThanOrEqual(44 + CHASSIS.tank.radius - 1e-6)
  })

  it('profiles are ordered the way the machines behave', () => {
    expect(PROFILE.castor.agility).toBeGreaterThan(PROFILE.tank.agility)
    expect(PROFILE.tank.obstacles).toBeGreaterThan(PROFILE.castor.obstacles)
    expect(PROFILE.tank.grip).toBeGreaterThanOrEqual(PROFILE.fourwd.grip)
  })
})
