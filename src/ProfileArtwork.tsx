import { useEffect, useId, useRef, useState } from 'react'
import { JUMUAH_AR, type DisplayRow, type Settings, type ThemeId } from './model'
import { derivePalette, isLight } from './palette'
import { fridayServices, pairGroups, relativeWording, timetableDateLabel } from './schedule'

export const ARTWORK_THEMES: Record<ThemeId, { name: string; background: string; surface: string; ink: string; muted: string; gold: string }> = {
  emerald: { name: 'Emerald', background: '#103e36', surface: '#194b41', ink: '#fff8e8', muted: '#b6c9bc', gold: '#e5bd7c' },
  midnight: { name: 'Midnight', background: '#172838', surface: '#20384a', ink: '#f9f5e9', muted: '#b7c2cb', gold: '#dcc099' },
  ivory: { name: 'Ivory', background: '#f6efdf', surface: '#fff9ed', ink: '#183f36', muted: '#526257', gold: '#795b2b' },
  plum: { name: 'Plum', background: '#32223f', surface: '#463052', ink: '#fff6ed', muted: '#d4c0db', gold: '#e6c28f' },
  rose: { name: 'Rose', background: '#f5e8e5', surface: '#fff5f0', ink: '#542d3b', muted: '#78505d', gold: '#8b4056' },
  charcoal: { name: 'Charcoal', background: '#25292b', surface: '#343a3c', ink: '#fff9ed', muted: '#cad0ca', gold: '#e0c595' },
  sky: { name: 'Sky', background: '#e4f0f2', surface: '#f2f9f8', ink: '#173b4a', muted: '#415d66', gold: '#17605f' },
  terracotta: { name: 'Terracotta', background: '#f3e4d5', surface: '#fff3e6', ink: '#542e23', muted: '#705044', gold: '#88432b' },
}

const SIZE = 1080
// Times keep one typeface in every style, so their sizing never changes.
const TIMES = '"Manrope Variable"'
// Each stack ends in a fuller face for letters the first one lacks. stacked shrinks two-line labels in tall faces.
export const ARTWORK_FONTS: Record<Settings['fontStyle'], { name: string; en: string; ar: string; stacked: number }> = {
  clear: { name: 'Clear', en: `"Almarai", ${TIMES}`, ar: '"Almarai", "Noto Naskh Arabic"', stacked: 1 },
  classic: { name: 'Classic', en: TIMES, ar: '"Noto Naskh Arabic"', stacked: 1 },
  bold: { name: 'Bold', en: `"Alexandria Variable", ${TIMES}`, ar: '"Alexandria Variable", "Noto Naskh Arabic"', stacked: 0.85 },
}
// Set by drawProfile; drawing is synchronous, so one canvas never sees another's style.
let font = ARTWORK_FONTS.clear

async function loadFonts(settings: Settings, rows: DisplayRow[]) {
  const { en, ar } = ARTWORK_FONTS[settings.fontStyle]
  // The design's own letters, so every subset it needs is ready before drawing.
  const sample = [settings.name, settings.nameAr, settings.location, settings.footer, ...rows.flatMap(row => [row.en, row.ar]), 'Aa 0123 مسجد الفجر'].join(' ')
  await Promise.all([TIMES, en, ar].flatMap(family => [500, 700].map(weight => document.fonts.load(`${weight} 40px ${family}`, sample))))
}

const logos = new Map<string, Promise<HTMLImageElement>>()
function loadLogo(settings: Settings) {
  if (settings.emblem !== 'logo' || !settings.logo) return Promise.resolve(undefined)
  if (!logos.has(settings.logo)) logos.set(settings.logo, new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The logo could not be read. Upload it again.'))
    image.src = settings.logo
  }))
  return logos.get(settings.logo)!
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, size: number, color: string, arabic = false, weight = 500, family = arabic ? font.ar : font.en) {
  const intendedSize = size
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.direction = arabic ? 'rtl' : 'ltr'
  ctx.font = `${weight} ${size}px ${family}`
  while (ctx.measureText(value).width > width && size > 10) {
    size -= 1
    ctx.font = `${weight} ${size}px ${family}`
  }
  ctx.fillText(value, x, y, width)
  if (size < intendedSize * 0.75 && !ctx.canvas.dataset.fitWarning) ctx.canvas.dataset.fitWarning = value
}

function nameLines(ctx: CanvasRenderingContext2D, value: string, size: number, arabic: boolean, width = 650) {
  ctx.font = `700 ${size}px ${arabic ? font.ar : font.en}`
  if (ctx.measureText(value).width <= width) return [value]
  const words = value.split(/\s+/)
  let split = 1
  let difference = Infinity
  for (let index = 1; index < words.length; index++) {
    const left = ctx.measureText(words.slice(0, index).join(' ')).width
    const right = ctx.measureText(words.slice(index).join(' ')).width
    if (Math.abs(left - right) < difference) {
      split = index
      difference = Math.abs(left - right)
    }
  }
  return words.length > 1 ? [words.slice(0, split).join(' '), words.slice(split).join(' ')] : [value]
}

function clockText(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, size: number, color: string) {
  const clock = /^(\d{1,2}:\d{2}) (AM|PM)$/.exec(value)
  if (!clock) return text(ctx, value || '—', x, y, width, size, color, false, 700, TIMES)
  const measure = (value: string, pixels: number) => {
    ctx.font = `700 ${pixels}px ${TIMES}`
    return ctx.measureText(value).width
  }
  while (measure(clock[1], size) + measure(clock[2], size * 0.5) + size * 0.16 > width && size > 10) size -= 1
  const digitsWidth = measure(clock[1], size)
  const suffixWidth = measure(clock[2], size * 0.5)
  const left = x - (digitsWidth + suffixWidth + size * 0.16) / 2
  text(ctx, clock[1], left + digitsWidth / 2, y, digitsWidth + 1, size, color, false, 700, TIMES)
  text(ctx, clock[2], left + digitsWidth + size * 0.16 + suffixWidth / 2, y + size * 0.13, suffixWidth + 1, size * 0.5, color, false, 700, TIMES)
}

export const themeColors = (settings: Pick<Settings, 'theme' | 'customColor' | 'customAccent'>) =>
  settings.theme === 'custom' ? derivePalette(settings.customColor, settings.customAccent) : ARTWORK_THEMES[settings.theme]

function band(ctx: CanvasRenderingContext2D, halfWidth: number, top: number, height: number, color: string, alpha: number) {
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(540 - halfWidth, top, halfWidth * 2, height, 12)
  ctx.fill()
  ctx.globalAlpha = 1
}

// Friday-only timetables: one line per service with khutbah and iqamah side by side, so times are never stacked.
function drawServices(ctx: CanvasRenderingContext2D, settings: Settings, services: NonNullable<ReturnType<typeof fridayServices>>) {
  const theme = themeColors(settings)
  const arabicOnly = settings.language === 'ar'
  const bilingual = settings.language === 'both'
  const wide = settings.textSize === 'large'
  const numbered = services[0].number > 0
  const gap = Math.min(125, 520 / services.length)
  const firstY = 615 - (services.length - 1) * gap / 2
  const edgeY = (services.length * gap) / 2 + 75
  const halfWidth = Math.min(420, Math.sqrt(500 ** 2 - edgeY ** 2) - 12)
  // Column centres and widths, as fractions of the half width.
  const [nameX, khutbahX, iqamahX] = [-0.72, -0.08, 0.64].map(x => 540 + x * halfWidth)
  const nameWidth = halfWidth * 0.46
  const timeWidth = halfWidth * 0.66
  const headings = arabicOnly ? [numbered ? 'الجمعة' : 'الصلاة', 'الخطبة', 'الإقامة'] : [numbered ? 'JUMUAH' : 'PRAYER', 'KHUTBAH', 'IQAMAH']
  const headingSize = (arabicOnly ? 30 : 22) * (wide ? 1.15 : 1)
  headings.forEach((heading, index) => text(ctx, heading, [nameX, khutbahX, iqamahX][index], 328, index ? timeWidth : nameWidth, headingSize, theme.gold, arabicOnly, 700))
  const timeSize = Math.min((bilingual ? 42 : 48) * 1.35 * (wide ? 1 : 0.85), gap * 0.6)
  services.forEach((service, index) => {
    const y = firstY + index * gap
    if (index % 2 === 0) band(ctx, halfWidth, y - gap / 2 + 4, gap - 8, theme.ink, isLight(theme.background) ? 0.05 : 0.045)
    const n = service.number
    const ordinalAr = n ? JUMUAH_AR[n - 1].split(' ')[1] : ''
    const primary = n ? (arabicOnly ? ordinalAr : `${n}${['st', 'nd', 'rd'][n - 1] ?? 'th'}`) : arabicOnly ? service.ar || service.en : service.en || service.ar
    const primaryArabic = arabicOnly ? Boolean(n || service.ar) : !n && !service.en
    const secondary = bilingual && service.ar && service.en ? (n ? ordinalAr : service.ar) : ''
    const size = wide ? 48 : 40
    // A long typed name wraps onto two lines before it has to shrink.
    const lines = secondary ? [primary] : nameLines(ctx, primary, size, primaryArabic, nameWidth)
    const stacked = Boolean(secondary) || lines.length > 1
    lines.forEach((line, i) => text(ctx, line, nameX, stacked ? y + gap * (i ? 0.19 : -0.17) : y, nameWidth, stacked ? size * 0.8 * font.stacked : size, theme.ink, primaryArabic, 700))
    if (secondary) text(ctx, secondary, nameX, y + gap * 0.22, nameWidth, size * 0.68 * font.stacked, theme.ink, true, 700)
    clockText(ctx, service.khutbah, khutbahX, y, timeWidth, timeSize, theme.ink)
    clockText(ctx, service.iqamah, iqamahX, y, timeWidth, timeSize, theme.gold)
  })
}

function drawProfile(canvas: HTMLCanvasElement, settings: Settings, rows: DisplayRow[], resolution = 1, logo?: HTMLImageElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser could not create the profile image. Please try another browser.')
  canvas.width = SIZE * resolution
  canvas.height = SIZE * resolution
  // Drawing stays in 1080-unit coordinates; the transform renders it at 2× or 3× resolution.
  ctx.setTransform(resolution, 0, 0, resolution, 0, 0)
  delete canvas.dataset.fitWarning
  font = ARTWORK_FONTS[settings.fontStyle]
  const theme = themeColors(settings)
  const gradient = ctx.createRadialGradient(410, 240, 30, 540, 540, 760)
  gradient.addColorStop(0, theme.surface)
  gradient.addColorStop(1, theme.background)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, SIZE, SIZE)

  // Every essential element stays inside the inner circular safe area.
  ctx.strokeStyle = theme.gold
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.65
  for (const radius of [505, 492]) {
    ctx.beginPath()
    ctx.arc(540, 540, radius, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 0.15
  ctx.lineWidth = 1
  for (let index = 0; index < 24; index++) {
    const angle = index * Math.PI / 12
    const next = angle + Math.PI / 6
    ctx.beginPath()
    ctx.moveTo(540 + Math.cos(angle) * 480, 540 + Math.sin(angle) * 480)
    ctx.lineTo(540 + Math.cos(next) * 480, 540 + Math.sin(next) * 480)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  // Top symbol: the masjid's logo fitted above the name, the default star, or nothing. A logo missing from a shared link falls back to the star.
  if (logo) {
    const fit = Math.min(130 / logo.naturalWidth, 80 / logo.naturalHeight)
    ctx.drawImage(logo, 540 - logo.naturalWidth * fit / 2, 102 - logo.naturalHeight * fit / 2, logo.naturalWidth * fit, logo.naturalHeight * fit)
  } else if (settings.emblem !== 'none') {
    ctx.globalAlpha = 0.9
    ctx.lineWidth = 2
    ctx.save()
    ctx.translate(540, 102)
    for (let index = 0; index < 2; index++) {
      ctx.rotate(Math.PI / 4)
      ctx.strokeRect(-15, -15, 30, 30)
    }
    ctx.restore()
    ctx.globalAlpha = 1
  }

  const bilingual = settings.language === 'both'
  const arabicOnly = settings.language === 'ar'
  const identity = arabicOnly ? settings.nameAr || settings.name : settings.name || settings.nameAr
  const identityArabic = arabicOnly ? Boolean(settings.nameAr) : !settings.name
  const lines = nameLines(ctx, identity, bilingual ? 42 : 48, identityArabic)
  const nameY = bilingual ? 165 : 181
  lines.forEach((line, index) => text(ctx, line, 540, nameY + index * 43, index === 0 ? 560 : 650, bilingual ? 42 : 48, theme.ink, identityArabic, 700))
  if (bilingual && settings.nameAr) text(ctx, settings.nameAr, 540, lines.length > 1 ? 251 : 222, 650, 42, theme.gold, true, 700)
  if (!bilingual && settings.location) text(ctx, settings.location, 540, lines.length > 1 ? 265 : 245, 600, 26, theme.muted)

  ctx.strokeStyle = theme.gold
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ctx.moveTo(280, 293)
  ctx.lineTo(800, 293)
  ctx.stroke()
  ctx.globalAlpha = 1

  const dateLabel = timetableDateLabel(settings)
  text(ctx, dateLabel, 540, 914, 490, 28, theme.muted, arabicOnly)
  if (settings.footer) text(ctx, settings.footer, 540, 951, 388, 22, theme.muted, /[؀-ۿ]/.test(settings.footer))

  const services = fridayServices(rows)
  if (services) return drawServices(ctx, settings, services)

  const bothColumns = settings.timeDisplay === 'both'
  // Large uses the wide table and the biggest text that fits; the row caps below keep it inside the circle.
  const wide = settings.textSize === 'large'
  const typeBoost = wide ? 1.15 : 1
  const scale = wide ? 1.35 : 1
  // Bigger text sizes mostly enlarge prayer names; times grow at half the rate and never pass 1.35× the masjid name, so the name stays the headline.
  const timeScale = 1 + (scale - 1) / 2
  const timeCap = (bilingual ? 42 : 48) * 1.35
  const labelX = bothColumns ? 326 : 350
  const timeX = bothColumns ? (wide ? [570, 765] : scale > 1 ? [570, 790] : [598, 775]) : [716]
  const timeWidth = bothColumns ? (scale > 1 ? 190 : 162) : 290
  const headingY = wide ? 324 : 332
  const headingScale = wide ? 1.25 : 1
  const spread = (x: number, factor: number) => 540 + (x - 540) * factor
  const headings = bothColumns
    ? (arabicOnly ? ['الأذان', 'الإقامة'] : ['ADHAN', 'IQAMAH'])
    : [settings.timeDisplay === 'adhan' ? (arabicOnly ? 'الأذان' : 'ADHAN') : (arabicOnly ? 'الإقامة' : 'IQAMAH')]
  headings.forEach((heading, index) => text(ctx, heading, spread(timeX[index], headingScale), headingY, (bothColumns ? 165 : 260) * headingScale, (arabicOnly ? 28 : 20) * (wide ? 1.1 : 1), theme.gold, arabicOnly, 700))
  text(ctx, arabicOnly ? 'الصلاة' : 'PRAYER', spread(labelX, headingScale), headingY, 220 * headingScale, (arabicOnly ? 28 : 20) * (wide ? 1.1 : 1), theme.gold, arabicOnly, 700)

  const gap = scale > 1 ? Math.min(79 * scale, 514 / Math.max(rows.length, 1)) : Math.min(79, (rows.length > 6 ? 514 : 462) / rows.length)
  const firstY = 379 + (8 - Math.max(rows.length, 6)) * 5 + (wide ? 4 : 0)
  // The circle narrows at the top and bottom; size every row to the narrowest safe chord so bands line up.
  const lastY = firstY + (rows.length - 1) * gap
  const edgeY = Math.max(Math.abs(firstY - gap / 2 - 540), Math.abs(lastY + gap / 2 - 540))
  const halfWidth = wide ? Math.min(450, Math.sqrt(500 ** 2 - edgeY ** 2) - 12) : 322
  const faint = isLight(theme.background) ? 0.05 : 0.045
  // Paired rows share one band, alternating accent and faint, so each khutbah reads with its iqamah.
  const groups = pairGroups(rows)
  const onAccent = new Set<number>()
  groups?.forEach(({ start, size }, index) => {
    const accent = index % 2 === 0
    if (accent) for (let row = start; row < start + size; row++) onAccent.add(row)
    band(ctx, halfWidth, firstY + start * gap - gap / 2 + 5, size * gap - 10,accent ? theme.gold : theme.ink, accent ? 0.14 : faint)
  })
  rows.forEach((row, index) => {
    const y = firstY + index * gap
    const widthScale = halfWidth / 322
    const rowLabelX = spread(labelX, widthScale)
    const labelWidth = (bothColumns ? 200 : 246) * widthScale
    const valueWidth = timeWidth * widthScale
    if (!groups && index % 2 === 0) band(ctx, halfWidth, y - gap / 2 + 3,gap - 6, theme.ink, faint)
    // Accent text drops below 4.5:1 on the accent band, so those times use ink.
    const timeColor = onAccent.has(index) ? theme.ink : theme.gold
    const primaryLabel = arabicOnly ? row.ar || row.en : row.en || row.ar
    const primaryArabic = arabicOnly ? Boolean(row.ar) : !row.en
    const secondaryLabel = bilingual && row.ar && row.en
    const labelSize = Math.min((bilingual ? 29 : 38) * scale * typeBoost, gap * (secondaryLabel ? 0.42 : 0.7)) * (secondaryLabel ? font.stacked : 1)
    text(ctx, primaryLabel, rowLabelX, secondaryLabel ? y - (wide ? gap * 0.2 : Math.min(13 * scale, gap * 0.25)) : y, labelWidth, labelSize, theme.ink, primaryArabic, 700)
    if (secondaryLabel) text(ctx, row.ar, rowLabelX, y + (wide ? gap * 0.24 : Math.min(18 * scale, gap * 0.28)), labelWidth, Math.min(28 * scale * typeBoost * font.stacked, gap * 0.43 * font.stacked, labelSize), theme.ink, true, 700)
    const values = bothColumns ? [row.adhan, row.iqamah] : [settings.timeDisplay === 'adhan' ? row.adhan : row.iqamah]
    values.forEach((value, column) => {
      const relative = row.relativeMinutes !== undefined && settings.timeDisplay !== 'adhan' && column === values.length - 1
      const valueX = spread(timeX[column], widthScale)
      if (relative) {
        relativeWording(row.relativeMinutes!, settings.language).forEach((line, index) => text(ctx, line.value, valueX, y + (wide ? (index === 0 ? -0.2 : 0.25) * gap : (index === 0 ? -14 : 20) * Math.min(scale, gap / 64)), valueWidth, Math.min((bilingual ? 28 : index === 0 ? 36 : 25) * timeScale * typeBoost, gap * (wide || bilingual ? 0.36 : 0.47)), index === 0 ? timeColor : theme.ink, line.arabic, line.arabic || index === 0 ? 700 : 500))
      } else clockText(ctx, value, valueX, y, valueWidth, Math.min((bothColumns ? 44 : 56) * timeScale * typeBoost, gap * (wide ? 0.88 : 0.82), timeCap), column === values.length - 1 ? timeColor : theme.ink)
    })
  })
}

export function ProfileArtwork({ settings, rows, className, onFitWarning }: { settings: Settings; rows: DisplayRow[]; className?: string; onFitWarning?: (shrunkText: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const descriptionId = useId()
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    Promise.all([loadFonts(settings, rows), loadLogo(settings)]).then(([, logo]) => {
      if (cancelled || !canvasRef.current) return
      drawProfile(canvasRef.current, settings, rows, 1, logo)
      onFitWarning?.(canvasRef.current.dataset.fitWarning ?? '')
      setError('')
    }).catch(() => {
      if (!cancelled) setError('The preview could not load. Refresh the page and try again.')
    })
    return () => { cancelled = true }
  }, [settings, rows, onFitWarning])
  return <>
    <canvas ref={canvasRef} width={SIZE} height={SIZE} className={className} aria-label="Prayer timetable preview" aria-describedby={descriptionId} role="img" style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '50%' }} />
    <p id={descriptionId} className="sr-only">
      {settings.name} {settings.nameAr}. {settings.date}{settings.endDate && settings.endDate !== settings.date ? ` to ${settings.endDate}` : ''}.
      {rows.map(row => {
        const label = settings.language === 'ar' ? row.ar || row.en : settings.language === 'en' ? row.en || row.ar : [row.en, row.ar].filter(Boolean).join(' ')
        const iqamah = row.relativeMinutes === undefined ? row.iqamah : relativeWording(row.relativeMinutes, settings.language).map(line => line.value).join(' ')
        const times = settings.timeDisplay === 'both' ? `Adhan ${row.adhan}; Iqamah ${iqamah}` : settings.timeDisplay === 'adhan' ? `Adhan ${row.adhan}` : `Iqamah ${iqamah}`
        return `${label}: ${times}.`
      }).join(' ')}
    </p>
    {error && <p role="alert">{error}</p>}
  </>
}

export async function renderProfile(settings: Settings, rows: DisplayRow[], scale = 1) {
  const [, logo] = await Promise.all([loadFonts(settings, rows), loadLogo(settings)])
  const canvas = document.createElement('canvas')
  drawProfile(canvas, settings, rows, scale, logo)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('The PNG could not be created. Please try again.')), 'image/png'))
  return new File([blob], `masjid-profile-${settings.date}${scale > 1 ? `-${SIZE * scale}px` : ''}.png`, { type: 'image/png' })
}

export async function downloadProfile(settings: Settings, rows: DisplayRow[], scale = 1): Promise<void> {
  const file = await renderProfile(settings, rows, scale)
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Some mobile browsers consume the download after the click handler finishes.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
