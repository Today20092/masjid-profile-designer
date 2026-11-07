// Builds a readable artwork palette from one chosen colour (and an optional accent).
// Colours are adjusted in OKLCH, where lightness steps look even across hues and a colour keeps
// its hue as it gets lighter or darker. Pass/fail is still the WCAG 2 contrast ratio: every text
// colour must reach 4.5:1 against every surface it sits on (background, gradient surface, row bands).

export type Palette = { name: string; background: string; surface: string; ink: string; muted: string; gold: string }
type Oklch = [l: number, c: number, h: number]

export const TEXT_CONTRAST = 4.5
const TARGET = 4.6 // small margin above AA so rounding never lands on the line
const BAND_ALPHA = 0.05
const ACCENT_DISTINCT = 1.6
const STEP = 0.01

export const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value)
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const toHex = (c: number[]) => '#' + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
const toLinear = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const fromLinear = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
const luminance = (hex: string) => { const [r, g, b] = rgb(hex).map(toLinear); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
export const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
export const mix = (fg: string, bg: string, alpha: number) => toHex(rgb(fg).map((v, i) => v * alpha + rgb(bg)[i] * (1 - alpha)))
export const isLight = (hex: string) => contrast(hex, '#000000') > contrast(hex, '#ffffff')

// OKLab matrices from Björn Ottosson, https://bottosson.github.io/posts/oklab/
export function toOklch(hex: string): Oklch {
  const [r, g, b] = rgb(hex).map(toLinear)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360]
}
function linearRgb([L, C, h]: Oklch) {
  const A = C * Math.cos(h * Math.PI / 180), B = C * Math.sin(h * Math.PI / 180)
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
}
const inGamut = (c: number[]) => c.every(v => v >= -1e-4 && v <= 1 + 1e-4)
/** OKLCH → hex. Colours outside what screens can show keep their lightness and hue and lose chroma until they fit. */
export function fromOklch([L, C, h]: Oklch) {
  L = Math.min(1, Math.max(0, L))
  if (!inGamut(linearRgb([L, C, h]))) {
    let low = 0, high = C
    while (high - low > 0.0005) { const mid = (low + high) / 2; if (inGamut(linearRgb([L, mid, h]))) low = mid; else high = mid }
    C = low
  }
  return toHex(linearRgb([L, C, h]).map(fromLinear))
}

// Step OKLCH lightness toward the readable extreme until the colour passes on every ground.
function fit([l, c, h]: Oklch, grounds: string[], lighter: boolean, target = TARGET) {
  for (let step = l; step >= 0 && step <= 1; step += lighter ? STEP : -STEP) {
    const hex = fromOklch([step, c, h])
    if (grounds.every(g => contrast(hex, g) >= target)) return hex
  }
  return null
}

function attempt(background: string, accent: string | null): Palette | null {
  const [l, c, h] = toOklch(background)
  const light = isLight(background)
  const surface = fromOklch([l + (light ? 0.02 : 0.035), c, h])
  const ink = fit([light ? 0.25 : 0.97, Math.min(c, 0.03), h], [background, surface], !light, 7) ?? fit([light ? 0 : 1, 0, h], [background, surface], !light)
  if (!ink) return null
  const grounds = [background, surface, mix(ink, background, BAND_ALPHA), mix(ink, surface, BAND_ALPHA)]
  // Default accent is a warm gold like the preset themes; a chosen accent keeps its hue and chroma.
  const gold = fit(accent ? toOklch(accent) : [light ? 0.45 : 0.8, 0.1, 75], grounds, !light)
  const muted = fit([light ? 0.45 : 0.8, Math.min(c, 0.04), h], grounds, !light)
  // An accent that ends up almost the same as the text colour stops working as an accent; move the background instead.
  if (!gold || !muted || contrast(gold, ink) < ACCENT_DISTINCT) return null
  return { name: 'Custom', background, surface, ink, muted, gold }
}

/** Returns a palette that always meets 4.5:1. `adjusted` is true when the background itself had to move. */
export function derivePalette(background: string, accent = ''): Palette & { adjusted: boolean } {
  const base = isHex(background) ? background.toLowerCase() : '#1f5c4a'
  const chosenAccent = isHex(accent) ? accent : null
  const [l, c, h] = toOklch(base)
  const exact = attempt(base, chosenAccent)
  if (exact) return { ...exact, adjusted: false }
  // Mid-tones can be unreadable with any text colour, so move the background away from the middle.
  // Deeper first (richer for a profile photo, and OKLCH keeps the hue true); lighter first only for already-light picks.
  for (const direction of l > 0.72 ? [1, -1] : [-1, 1]) {
    for (let shift = 0.02; shift <= 0.6; shift = Math.round((shift + 0.02) * 100) / 100) {
      // When the background has to move, keep the chosen colour visible by using it as the accent.
      const palette = attempt(fromOklch([l + direction * shift, c, h]), chosenAccent ?? base)
      if (palette) return { ...palette, adjusted: true }
    }
  }
  return { name: 'Custom', background: '#103e36', surface: '#194b41', ink: '#fff8e8', muted: '#b6c9bc', gold: '#e5bd7c', adjusted: true }
}
