// Generates public/og.png (1200x630) from inline SVG. Run: node scripts/gen-og.mjs
import sharp from 'sharp'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#14161a"/><rect width="1200" height="12" fill="#ff7a45"/>
<text x="80" y="250" font-family="Arial, sans-serif" font-weight="700" font-size="40" fill="#ff7a45" letter-spacing="6">PORTFOLIO</text>
<text x="80" y="350" font-family="Arial, sans-serif" font-weight="700" font-size="104" fill="#f2f1ec">Idris Sadiq</text>
<text x="80" y="420" font-family="Arial, sans-serif" font-size="34" fill="#a8acb4">Hardware, control and simulation</text>
<text x="80" y="470" font-family="Arial, sans-serif" font-size="30" fill="#a8acb4">B.E. EEE, SRM Easwari Engineering College</text>
<g transform="translate(830,150) scale(3)">
<line x1="60" y1="14" x2="60" y2="28" stroke="#9aa6c8" stroke-width="5"/><circle cx="60" cy="13" r="7" fill="#ff7a45"/>
<rect x="22" y="28" width="76" height="58" rx="20" fill="#e8ecf8" stroke="#ff7a45" stroke-width="5"/>
<rect x="31" y="39" width="58" height="34" rx="15" fill="#14161a"/>
<circle cx="47" cy="56" r="8" fill="#ff7a45"/><circle cx="73" cy="56" r="8" fill="#ff7a45"/>
<rect x="42" y="90" width="36" height="20" rx="7" fill="#b9a8ff"/></g></svg>`

await sharp(Buffer.from(svg)).png().toFile('public/og.png')
console.log('wrote public/og.png')
