import { contrast, derivePalette, isLight, mix, TEXT_CONTRAST, toOklch, type Palette } from './palette'

// Leave headroom for the canvas renderer's quantization and compositing.
const PHOTO_TARGET = TEXT_CONTRAST + 0.1

export type PhotoPalette = {
  main: string
  accent: string
  palette: Palette
  minimum: number
}

function colourDistance(a: string, b: string) {
  const [l1, c1, h1] = toOklch(a)
  const [l2, c2, h2] = toOklch(b)
  const chromaDelta = c1 ** 2 + c2 ** 2 - 2 * c1 * c2 * Math.cos((h1 - h2) * Math.PI / 180)
  return Math.sqrt((l1 - l2) ** 2 + Math.max(0, chromaDelta))
}

function minimumContrast(palette: Palette) {
  const alpha = isLight(palette.background) ? 0.05 : 0.045
  let minimum = Infinity
  for (let step = 0; step <= 256; step++) {
    const ground = mix(palette.surface, palette.background, step / 256)
    const band = mix(palette.ink, ground, alpha)
    for (const foreground of [palette.ink, palette.muted, palette.gold]) {
      minimum = Math.min(minimum, contrast(foreground, ground), contrast(foreground, band))
    }
  }
  return minimum
}

export function suggestPhotoPalettes(pixels: Uint8ClampedArray): PhotoPalette[] {
  const bins = new Map<number, { red: number; green: number; blue: number; count: number }>()
  let visible = 0
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 128) continue
    const [red, green, blue] = [pixels[index], pixels[index + 1], pixels[index + 2]]
    const key = ((red >> 5) << 6) | ((green >> 5) << 3) | (blue >> 5)
    const bin = bins.get(key) ?? { red: 0, green: 0, blue: 0, count: 0 }
    bin.red += red
    bin.green += green
    bin.blue += blue
    bin.count++
    visible++
    bins.set(key, bin)
  }

  // Give substantial colour clusters priority over a white or black logo backdrop.
  const ranked = [...bins.values()].map(({ red, green, blue, count }) => {
    const colour = '#' + [red, green, blue].map(channel => Math.round(channel / count).toString(16).padStart(2, '0')).join('')
    const [, chroma] = toOklch(colour)
    return { colour, count, vivid: chroma >= 0.045 && count >= visible * 0.01 }
  }).sort((a, b) => Number(b.vivid) - Number(a.vivid) || b.count - a.count)
  const colours: string[] = []
  for (const { colour } of ranked) {
    if (colours.every(previous => colourDistance(colour, previous) >= 0.1)) colours.push(colour)
    if (colours.length === 6) break
  }

  const suggestions: PhotoPalette[] = []
  for (const main of colours) {
    const accent = colours.find(colour => colour !== main) ?? ''
    const palette = derivePalette(main, accent)
    if (suggestions.some(previous => colourDistance(previous.palette.background, palette.background) < 0.07 &&
        colourDistance(previous.palette.gold, palette.gold) < 0.07)) continue
    const minimum = minimumContrast(palette)
    if (minimum >= PHOTO_TARGET) suggestions.push({ main, accent, palette, minimum })
    if (suggestions.length === 3) break
  }
  return suggestions
}

export async function readPhotoPalettes(file: File) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image.')
  if (file.size > 10_000_000) throw new Error('That image is over 10 MB. Choose a smaller one.')
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 96 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser could not read colours from the photo.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const suggestions = suggestPhotoPalettes(context.getImageData(0, 0, canvas.width, canvas.height).data)
    if (!suggestions.length) throw new Error('No usable colours were found. Try a photo with a visible subject.')
    return suggestions
  } finally {
    bitmap.close()
  }
}
