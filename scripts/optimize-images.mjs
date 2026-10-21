// Converts src/assets/raw/* to responsive WebP in public/media/img (strips metadata). Run: npm run media
import sharp from 'sharp'
import { readdirSync, mkdirSync } from 'node:fs'
import { parse } from 'node:path'
const src = 'src/assets/raw', out = 'public/media/img'
mkdirSync(out, { recursive: true })
for (const f of readdirSync(src)) {
  if (!/\.(png|jpe?g)$/i.test(f)) continue
  const { name } = parse(f)
  const meta = await sharp(`${src}/${f}`).metadata()
  for (const w of [640, 1280]) {
    if (meta.width && meta.width < w && w !== 640) continue
    await sharp(`${src}/${f}`).rotate().resize({ width: Math.min(w, meta.width ?? w) }).webp({ quality: 78 }).toFile(`${out}/${name}-${w}.webp`)
  }
  console.log(name, meta.width + 'x' + meta.height)
}
