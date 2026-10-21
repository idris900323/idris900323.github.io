import { describe, expect, it } from 'vitest'
import { EM_DASH, readJson } from './test/fs'

type Slot = { id: string; context: string; options: string[]; selected: number | null; custom: string; status: string }
const en = readJson<Slot[]>('content/jokes/en.json')
const ja = readJson<Slot[]>('content/jokes/ja.json')

describe.each([['en', en], ['ja', ja]] as const)('jokes %s', (_n, slots) => {
  it('ids are unique and non-empty', () => {
    const ids = slots.map((s) => s.id)
    expect(ids.every(Boolean)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('each slot has 3 non-empty options', () => {
    for (const s of slots) {
      expect(s.options, s.id).toHaveLength(3)
      for (const o of s.options) expect(o.trim().length, s.id).toBeGreaterThan(0)
    }
  })
  it('selected is null or a valid option index', () => {
    for (const s of slots) if (s.selected !== null) {
      expect(Number.isInteger(s.selected)).toBe(true)
      expect(s.selected).toBeGreaterThanOrEqual(0)
      expect(s.selected).toBeLessThan(s.options.length)
    }
  })
  it('has no em dash', () => {
    expect(JSON.stringify(slots)).not.toContain(EM_DASH)
  })
  it('has required string fields', () => {
    for (const s of slots) {
      expect(typeof s.custom).toBe('string')
      expect(typeof s.status).toBe('string')
      expect(typeof s.context).toBe('string')
    }
  })
})

describe('jokes en/ja parity', () => {
  it('id sets are equal and in the same order', () => {
    expect(ja.map((s) => s.id)).toEqual(en.map((s) => s.id))
  })
  it('ja options contain Japanese or are sound words shared with en', () => {
    const jp = /[぀-ヿ一-鿿]/
    const bad = ja.filter((s) => s.options.some((o, i) => !jp.test(o) && o !== en.find((e) => e.id === s.id)?.options[i])).map((s) => s.id)
    expect(bad).toEqual([])
  })
  it('every caption id used by code exists', () => {
    const ids = new Set(en.map((s) => s.id))
    for (const id of ['g3', 'g8', 'g13', 'g14', 'warn', 'p2a', 'p2b', 'p2c', 'p3', 'p5', 'p6a', 'p6b', 'p8a', 'p8d', 'p8e', 'p9a', 'p9b']) expect(ids.has(id), id).toBe(true)
  })
})
