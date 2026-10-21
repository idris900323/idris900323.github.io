import { describe, expect, it } from 'vitest'
// @ts-expect-error plain JS module shared with the publish check
import { hasIeeeNumber, hasPhone, pdfMetadataStrings } from './patterns.mjs'

describe('personal data patterns', () => {
  it('finds phone numbers in common shapes', () => {
    for (const s of ['+91 98765 43210', 'call 9876543210 now', '98765 43210', '+1 (312) 847-1928', '312-847-1928', '+44 20 7946 0958']) expect(hasPhone(s), s).toBe(true)
  })
  it('leaves ordinary numbers and the GitHub name alone', () => {
    for (const s of ['idris900323', 'USD 3,000', '2026-10-19', '587 solved', 'max streak 74', '1280x720', 'v1.64.1', '12345678 bytes']) expect(hasPhone(s), s).toBe(false)
  })
  it('finds an IEEE membership number', () => {
    expect(hasIeeeNumber('IEEE Member No. 100200300')).toBe(true)
    expect(hasIeeeNumber('IEEE member 4412345')).toBe(true)
    expect(hasIeeeNumber('EPICS in IEEE team grant, USD 3,000')).toBe(false)
    expect(hasIeeeNumber('IEEE Bangalore Section')).toBe(false)
  })
  it('reads PDF Info metadata, literal and hex strings', () => {
    const lit = Buffer.from('/Author (Idris +91 98765 43210) /Title (CV)')
    expect(pdfMetadataStrings(lit).join(' ')).toContain('98765')
    const hex = Buffer.from('/Author <FEFF00490064007200690073>')
    expect(pdfMetadataStrings(hex).join(' ')).toContain('Idris')
  })
})
