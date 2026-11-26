// Artwork text is drawn on a canvas that axe cannot see, so check every theme's text colours here.
// The image is usually viewed shrunk on a phone, so all text must meet the 4.5:1 normal-text bar.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { contrast, derivePalette, fromOklch, isHex, mix, toOklch } from '../src/palette.ts'
import { suggestPhotoPalettes } from '../src/photo-palette.ts'

const src = fs.readFileSync(new URL('../src/ProfileArtwork.tsx', import.meta.url), 'utf8')
const themes = [...src.matchAll(/name: '(\w+)', background: '(#\w{6})', surface: '(#\w{6})', ink: '(#\w{6})', muted: '(#\w{6})', gold: '(#\w{6})'/g)]
assert.ok(themes.length >= 6, 'theme definitions not found; update this parser')
for (const [, name, bg, surface, ink, muted, gold] of themes) {
  // Background is a surface→background gradient; alternate rows add a ~5% ink band.
  const grounds = [bg, surface, mix(ink, bg, 0.05), mix(ink, surface, 0.05)]
  for (const [role, colour] of [['ink', ink], ['gold', gold], ['muted', muted]]) {
    const worst = Math.min(...grounds.map(g => contrast(colour, g)))
    assert.ok(worst >= 4.5, `${name} ${role} ${colour} is ${worst.toFixed(2)}:1, needs 4.5:1`)
  }
  // Paired rows: every other group sits on a 14% accent band, with ink text only.
  assert.ok([bg, surface].every(g => contrast(ink, mix(gold, g, 0.14)) >= 4.5), `${name} ink on the accent band`)
}
console.log(`Artwork contrast ok (${themes.length} themes)`)

// Custom palettes: any chosen colour (and accent) must produce text that passes on every ground.
const samples = ['#000000', '#ffffff', '#777777', '#808080', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff8800', '#1f5c4a', '#f6efdf', '#e91e63']
for (let i = 0; i < 400; i++) samples.push('#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0'))
let adjusted = 0
for (const colour of samples) for (const accent of ['', '#ffd700', '#0066ff', colour]) {
  const p = derivePalette(colour, accent)
  assert.ok([p.background, p.surface, p.ink, p.muted, p.gold].every(isHex), `bad hex for ${colour}`)
  const grounds = [p.background, p.surface, mix(p.ink, p.background, 0.05), mix(p.ink, p.surface, 0.05)]
  for (const [role, c] of [['ink', p.ink], ['gold', p.gold], ['muted', p.muted]]) {
    const worst = Math.min(...grounds.map(g => contrast(c, g)))
    assert.ok(worst >= 4.5, `custom ${colour}/${accent || 'auto'} ${role} ${c} is ${worst.toFixed(2)}:1`)
  }
  assert.ok([p.background, p.surface].every(g => contrast(p.ink, mix(p.gold, g, 0.14)) >= 4.5), `custom ${colour}/${accent || 'auto'} ink on the accent band`)
  if (!accent && !p.adjusted) assert.equal(p.background, colour, 'unadjusted palette keeps the chosen colour')
  if (p.adjusted) adjusted++
}
console.log(`Custom palettes ok (${samples.length * 4} combinations, ${adjusted} needed a background nudge)`)

// OKLCH conversion: hex → OKLCH → hex must round-trip, and out-of-gamut input must still yield a valid colour.
for (const colour of samples) assert.equal(fromOklch(toOklch(colour)), colour, `OKLCH round-trip ${colour}`)
assert.ok(isHex(fromOklch([0.7, 0.4, 150])), 'out-of-gamut chroma is reduced to a displayable colour')
console.log(`OKLCH round-trip ok (${samples.length} colours); oklch(0.7 0.1 178) = ${fromOklch([0.7, 0.1, 178])}`)

const photo = new Uint8ClampedArray([
  31, 92, 74, 255, 31, 92, 74, 255, 230, 163, 84, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 0, 0, 0,
])
const suggestions = suggestPhotoPalettes(photo)
assert.ok(suggestions.length >= 2 && suggestions.length <= 3)
assert.equal(suggestions[0].main, '#1f5c4a', 'prefer the brand colour over the neutral backdrop')
assert.equal(suggestions[0].accent, '#e6a354')
for (const { main, accent, palette, minimum } of suggestions) {
  assert.ok(minimum >= 4.5)
  assert.deepEqual(palette, derivePalette(main, accent), 'saved custom colours reproduce the suggestion')
}
assert.deepEqual(suggestPhotoPalettes(new Uint8ClampedArray([255, 0, 0, 0])), [])
assert.equal(suggestPhotoPalettes(new Uint8ClampedArray([0, 0, 0, 255])).length, 1)
console.log('Photo-derived palette checks passed')
