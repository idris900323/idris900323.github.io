import { describe, expect, it } from 'vitest'
import { A_MAX, PRESETS, command, initBot, push, shoveTest, stepBot, wobbleCount } from './balanceModel'

describe('self-balancing robot (cart-pole)', () => {
  it('upright and untouched stays upright', () => {
    let b = initBot()
    for (let i = 0; i < 2400; i++) b = stepBot(b, 1 / 240, PRESETS.good, true)
    expect(b.fallen).toBe(false)
    expect(Math.abs(b.th)).toBeLessThan(1e-9)
  })

  it('without the controller a tiny lean grows until it falls', () => {
    let b = initBot(0.02)
    for (let i = 0; i < 2400; i++) b = stepBot(b, 1 / 240, PRESETS.good, false)
    expect(b.fallen).toBe(true)
  })

  it('good gains catch a shove and settle upright', () => {
    const r = shoveTest(PRESETS.good)
    expect(r.fallen).toBe(false)
    expect(Math.abs(r.finalTilt)).toBeLessThan(0.02)
    expect(r.peak).toBeLessThan(0.5)
  })

  it('gains that are too weak cannot catch the fall (Kp must beat gravity)', () => {
    expect(shoveTest(PRESETS.weak).fallen).toBe(true)
  })

  it('no damping means more wobble than good damping', () => {
    expect(wobbleCount(PRESETS.harsh)).toBeGreaterThan(wobbleCount(PRESETS.good))
  })

  it('the wheels move toward the lean to get under the body', () => {
    let b = push(initBot(), 1.0) // shoved forward
    let maxV = 0
    for (let i = 0; i < 240; i++) { b = stepBot(b, 1 / 240, PRESETS.good, true); maxV = Math.max(maxV, b.v) }
    expect(maxV).toBeGreaterThan(0.1)
    expect(command({ ...initBot(0.1) }, PRESETS.good, true)).toBeGreaterThan(0)
    expect(command({ ...initBot(-0.1) }, PRESETS.good, true)).toBeLessThan(0)
  })

  it('motor command is limited to what the motors can do', () => {
    expect(command({ ...initBot(1), om: 5 }, PRESETS.harsh, true)).toBe(A_MAX)
    expect(command({ ...initBot(-1), om: -5 }, PRESETS.harsh, true)).toBe(-A_MAX)
  })

  it('a push that is too hard exceeds the motor limit and the robot falls', () => {
    expect(shoveTest(PRESETS.good, 1.2).fallen).toBe(false)
    let limit = 0
    for (let st = 1; st <= 12; st += 0.25) { if (shoveTest(PRESETS.good, st).fallen) { limit = st; break } }
    expect(limit).toBeGreaterThan(1.5) // survives a normal shove
    expect(limit).toBeGreaterThan(0)
    expect(limit).toBeLessThanOrEqual(12) // but not an unlimited one
  })
})
