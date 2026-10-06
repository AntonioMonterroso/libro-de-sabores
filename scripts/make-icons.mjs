// Genera los iconos PWA a partir del gorro de chef. Uso: node scripts/make-icons.mjs
import sharp from 'sharp'

const hat = `
<g fill="none" stroke="#E0D2C3" stroke-width="3" stroke-linejoin="round"><circle cx="-38" cy="-30" r="27"/><circle cx="38" cy="-30" r="27"/><circle cx="0" cy="-50" r="33"/><path d="M-50 48L-54 -24H54L50 48Z"/></g>
<g fill="#fff"><circle cx="-38" cy="-30" r="27"/><circle cx="38" cy="-30" r="27"/><circle cx="0" cy="-50" r="33"/><path d="M-50 48L-54 -24H54L50 48Z"/></g>
<g fill="none" stroke="#E6DACD" stroke-width="2" stroke-linecap="round"><path d="M-36 -8C-38 12-37 30-35 44M-18 -10C-19 12-19 30-18 44M0 -12V44M18 -10C19 12 19 30 18 44M36 -8C38 12 37 30 35 44"/><path d="M-20 -62C-24 -50-22 -40-18 -30M20 -62C24 -50 22 -40 18 -30"/></g>
<rect x="-56" y="44" width="112" height="28" rx="5" fill="#fff" stroke="#E0D2C3" stroke-width="3"/><rect x="-56" y="44" width="112" height="28" rx="5" fill="#fff"/>
<rect x="-56" y="44" width="112" height="3" fill="#B8975A"/><line x1="-44" y1="59" x2="44" y2="59" stroke="#B8975A" stroke-width="1" stroke-dasharray="2 4"/>`

const svg = (size, scale, rounded) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" ${rounded ? `rx="${size * 0.22}"` : ''} fill="#EFD5D0"/>
<circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.43}" fill="none" stroke="#B8975A" stroke-width="${size * 0.006}"/>
<g transform="translate(${size / 2},${size * 0.52}) scale(${scale})">${hat}</g></svg>`

const jobs = [
  ['public/icons/icon-192.png', 192, (192 / 512) * 1.6, true],
  ['public/icons/icon-512.png', 512, 1.6, true],
  ['public/icons/maskable-512.png', 512, 1.25, false],
  ['public/icons/apple-touch-icon.png', 180, (180 / 512) * 1.6, false],
]
for (const [file, size, scale, rounded] of jobs) {
  await sharp(Buffer.from(svg(size, scale * 1.0, rounded))).png().toFile(file)
  console.log('✓', file)
}
