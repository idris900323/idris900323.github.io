// Patterns for personal data that must never appear in published text. Shared by check-publish and its tests.
export const PHONE = [
  /\+\d{1,3}[\s-]?\(?\d{2,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}/, // +91 98765 43210, +1 (312) 847-1928
  /(?<![\w.])[6-9]\d{9}(?![\w.])/, // ten-digit Indian mobile number
  /(?<!\d)\d{5}[\s-]\d{5}(?!\d)/, // 98765 43210
  /(?<!\d)\d{3}[\s-]\d{3}[\s-]\d{4}(?!\d)/, // 312-847-1928
]
export const IEEE_NUMBER = /ieee[^\n]{0,40}?\d{6,}/i
export const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/

export const hasPhone = (s) => PHONE.some((re) => re.test(s))
export const hasIeeeNumber = (s) => IEEE_NUMBER.test(s)

/** Author, Title, Subject, Keywords and XMP text of a PDF, read from the raw bytes (enough for Word and most exporters). */
export function pdfMetadataStrings(buf) {
  const raw = buf.toString('latin1')
  const out = []
  for (const m of raw.matchAll(/\/(Author|Title|Subject|Keywords)\s*\(((?:[^()\\]|\\.)*)\)/g)) out.push(`${m[1]}: ${m[2]}`)
  for (const m of raw.matchAll(/\/(Author|Title|Subject|Keywords)\s*<([0-9A-Fa-f\s]+)>/g)) {
    const bytes = Buffer.from(m[2].replace(/\s/g, ''), 'hex')
    const text = bytes[0] === 0xfe && bytes[1] === 0xff ? Buffer.from(bytes.subarray(2)).swap16().toString('utf16le') : bytes.toString('latin1')
    out.push(`${m[1]}: ${text}`)
  }
  const xmp = raw.match(/<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/)
  if (xmp) out.push('XMP: ' + xmp[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 400))
  return out
}
