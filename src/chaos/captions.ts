import en from '../content/jokes/en.json'
import ja from '../content/jokes/ja.json'

type Slot = { id: string; context: string; options: string[]; selected: number | null; custom: string; status: string }
const data: Record<'en' | 'ja', Slot[]> = { en: en as Slot[], ja: ja as Slot[] }
const cursor = new Map<string, number>()

/**
 * Pick a caption for a gag. `custom` wins; then the chosen option; otherwise (dev only) rotate through the drafts.
 * In production an unreviewed slot returns null and the gag shows no caption (check:jokes also fails strict CI).
 * Never repeats the same caption twice in a row.
 */
export function caption(id: string, lang: 'en' | 'ja'): string | null {
  const s = data[lang].find((x) => x.id === id)
  if (!s) return null
  if (s.custom.trim()) return s.custom
  if (s.selected !== null && s.options[s.selected]) return s.options[s.selected]
  if (import.meta.env.PROD) return null
  const k = ((cursor.get(id + lang) ?? -1) + 1) % s.options.length
  cursor.set(id + lang, k)
  return s.options[k]
}
