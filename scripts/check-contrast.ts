// Artwork text is drawn on a canvas that axe cannot see, so check every theme's text colours here.
// The image is usually viewed shrunk on a phone, so all text must meet the 4.5:1 normal-text bar.
import assert from 'node:assert/strict'
import fs from 'node:fs'

const src = fs.readFileSync(new URL('../src/ProfileArtwork.tsx', import.meta.url), 'utf8')
const themes = [...src.matchAll(/name: '(\w+)', background: '(#\w{6})', surface: '(#\w{6})', ink: '(#\w{6})', muted: '(#\w{6})', gold: '(#\w{6})'/g)]
assert.ok(themes.length >= 6, 'theme definitions not found; update this parser')
const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const lum = (c: number[]) => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const mix = (fg: number[], bg: number[], a: number) => fg.map((v, i) => Math.round(v * a + bg[i] * (1 - a)))

for (const [, name, bg, surface, ink, muted, gold] of themes) {
  // Background is a surface→background gradient; alternate rows add a ~5% ink band.
  const grounds = [rgb(bg), rgb(surface), mix(rgb(ink), rgb(bg), 0.05), mix(rgb(ink), rgb(surface), 0.05)]
  for (const [role, colour] of [['ink', ink], ['gold', gold], ['muted', muted]]) {
    const worst = Math.min(...grounds.map(g => ratio(rgb(colour), g)))
    assert.ok(worst >= 4.5, `${name} ${role} ${colour} is ${worst.toFixed(2)}:1, needs 4.5:1`)
  }
}
console.log(`Artwork contrast ok (${themes.length} themes)`)
