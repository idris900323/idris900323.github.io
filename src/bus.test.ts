import { describe, expect, it, vi } from 'vitest'
import { emit, subscribe } from './bus'

describe('bus', () => {
  it('delivers events to subscribers', () => {
    const f = vi.fn()
    const off = subscribe(f)
    emit('a'); emit('b')
    expect(f.mock.calls).toEqual([['a'], ['b']])
    off()
  })
  it('unsubscribe stops delivery', () => {
    const f = vi.fn()
    subscribe(f)()
    emit('x')
    expect(f).not.toHaveBeenCalled()
  })
  it('emit with no subscribers is a no-op', () => {
    expect(() => emit('nobody')).not.toThrow()
  })
  it('fans out to multiple subscribers', () => {
    const a = vi.fn(), b = vi.fn()
    const o1 = subscribe(a), o2 = subscribe(b)
    emit('z')
    expect(a).toHaveBeenCalledWith('z'); expect(b).toHaveBeenCalledWith('z')
    o1(); o2()
  })
  it('same function subscribed twice is called once (Set semantics)', () => {
    const f = vi.fn()
    const o = subscribe(f); subscribe(f)
    emit('q')
    expect(f).toHaveBeenCalledTimes(1)
    o()
  })
})
