import { describe, expect, it } from 'vitest'
import { projects } from './content'
import { openFields, personal } from './personal'

const slugs = new Set(projects.map((p) => p.slug))

describe('personal', () => {
  it('openFields keys are real project slugs', () => {
    expect(Object.keys(openFields).filter((k) => !slugs.has(k))).toEqual([])
  })
  it('placeholder slots stay empty-or-valid', () => {
    for (const v of [personal.cv.en]) if (v) expect(v).toMatch(/\.pdf$/)
    for (const v of Object.values(personal.links)) if (v) expect(v).toMatch(/^https:\/\//)
  })
})
