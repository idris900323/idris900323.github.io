import { afterEach, describe, expect, it, vi } from 'vitest'
import en from '../content/jokes/en.json'
import ja from '../content/jokes/ja.json'

type Slot = { id: string; options: string[]; selected: number | null; custom: string }
const ENS = en as Slot[]
const JAS = ja as Slot[]

const clear = (e: Slot[], j: Slot[]) => { for (const s of [...e, ...j]) { s.selected = null; s.custom = '' } }
const load = async (prod: boolean, mutate?: (e: Slot[], j: Slot[]) => void) => {
  vi.resetModules()
  vi.stubEnv('PROD', prod)
  if (mutate) {
    const e = structuredClone(ENS)
    const j = structuredClone(JAS)
    clear(e, j)
    mutate(e, j)
    vi.doMock('../content/jokes/en.json', () => ({ default: e }))
    vi.doMock('../content/jokes/ja.json', () => ({ default: j }))
  }
  return (await import('./captions')).caption
}
afterEach(() => {
  vi.unstubAllEnvs()
  vi.doUnmock('../content/jokes/en.json')
  vi.doUnmock('../content/jokes/ja.json')
})

describe('caption', () => {
  it('returns null for unknown ids', async () => {
    expect((await load(false))('nope', 'en')).toBeNull()
  })
  it('custom text wins over selected', async () => {
    const c = await load(true, (e) => { e[0].custom = 'mine'; e[0].selected = 1 })
    expect(c('g1', 'en')).toBe('mine')
  })
  it('whitespace-only custom is ignored', async () => {
    const c = await load(true, (e) => { e[0].custom = '   '; e[0].selected = 2 })
    expect(c('g1', 'en')).toBe(ENS[0].options[2])
  })
  it('selected option is returned in prod', async () => {
    const c = await load(true, (_e, j) => { j[0].selected = 1 })
    expect(c('g1', 'ja')).toBe(JAS[0].options[1])
  })
  it('unreviewed slot is null in production', async () => {
    expect((await load(true, () => {}))('g1', 'en')).toBeNull()
  })
  it('dev rotates through drafts and never repeats back to back', async () => {
    const c = await load(false, () => {})
    const got = Array.from({ length: 7 }, () => c('g1', 'en'))
    expect(got.slice(0, 3)).toEqual(ENS[0].options)
    expect(got[3]).toBe(got[0])
    for (let i = 1; i < got.length; i++) expect(got[i]).not.toBe(got[i - 1])
  })
  it('languages rotate independently', async () => {
    const c = await load(false, () => {})
    c('g1', 'en'); c('g1', 'en')
    expect(c('g1', 'ja')).toBe(JAS[0].options[0])
  })
})
