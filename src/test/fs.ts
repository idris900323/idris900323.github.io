// Vitest-only helpers (node env). Not imported by app code.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

export const ROOT = resolve(__dirname, '..', '..')
export const SRC = join(ROOT, 'src')

export function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}
export const read = (p: string) => readFileSync(p, 'utf8')
export const readJson = <T>(rel: string): T => JSON.parse(read(join(SRC, rel))) as T
export const EM_DASH = String.fromCharCode(0x2014)
