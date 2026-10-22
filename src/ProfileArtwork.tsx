import { useEffect, useRef, useState } from 'react'
import type { DisplayRow, Settings, ThemeId } from './model'

export const ARTWORK_THEMES: Record<ThemeId, { name: string; background: string; surface: string; ink: string; muted: string; gold: string }> = {
  emerald: { name: 'Emerald', background: '#103e36', surface: '#194b41', ink: '#fff8e8', muted: '#b6c9bc', gold: '#e5bd7c' },
  midnight: { name: 'Midnight', background: '#172838', surface: '#20384a', ink: '#f9f5e9', muted: '#b7c2cb', gold: '#dcc099' },
  ivory: { name: 'Ivory', background: '#f6efdf', surface: '#fff9ed', ink: '#183f36', muted: '#647368', gold: '#927038' },
}

const SIZE = 1080
const ENGLISH = '"Manrope Variable"'
const ARABIC = '"Noto Naskh Arabic"'

async function loadFonts() {
  await Promise.all([
    document.fonts.load(`500 40px ${ENGLISH}`),
    document.fonts.load(`700 40px ${ENGLISH}`),
    document.fonts.load(`400 40px ${ARABIC}`, 'مسجد الفجر'),
    document.fonts.load(`700 40px ${ARABIC}`, 'مسجد الفجر'),
  ])
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, size: number, color: string, arabic = false, weight = 500) {
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.direction = arabic ? 'rtl' : 'ltr'
  const family = arabic ? ARABIC : ENGLISH
  ctx.font = `${weight} ${size}px ${family}`
  while (ctx.measureText(value).width > width && size > 10) {
    size -= 1
    ctx.font = `${weight} ${size}px ${family}`
  }
  ctx.fillText(value, x, y, width)
}

function nameLines(ctx: CanvasRenderingContext2D, value: string, size: number, arabic: boolean) {
  ctx.font = `700 ${size}px ${arabic ? ARABIC : ENGLISH}`
  if (ctx.measureText(value).width <= 650) return [value]
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

function drawProfile(canvas: HTMLCanvasElement, settings: Settings, rows: DisplayRow[]) {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser could not create the profile image. Please try another browser.')
  canvas.width = SIZE
  canvas.height = SIZE
  const theme = ARTWORK_THEMES[settings.theme]
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

  const bilingual = settings.language === 'both'
  const arabicOnly = settings.language === 'ar'
  const identity = arabicOnly ? settings.nameAr || settings.name : settings.name || settings.nameAr
  const identityArabic = arabicOnly ? Boolean(settings.nameAr) : !settings.name
  const lines = nameLines(ctx, identity, bilingual ? 42 : 48, identityArabic)
  const nameY = bilingual ? 165 : 181
  lines.forEach((line, index) => text(ctx, line, 540, nameY + index * 43, index === 0 ? 560 : 650, bilingual ? 42 : 48, theme.ink, identityArabic, 700))
  if (bilingual && settings.nameAr) text(ctx, settings.nameAr, 540, lines.length > 1 ? 251 : 222, 650, 42, theme.gold, true, 700)
  if (!bilingual && settings.location) text(ctx, settings.location, 540, lines.length > 1 ? 265 : 244, 600, 22, theme.muted)

  ctx.strokeStyle = theme.gold
  ctx.globalAlpha = 0.5
  ctx.beginPath()
  ctx.moveTo(280, 293)
  ctx.lineTo(800, 293)
  ctx.stroke()
  ctx.globalAlpha = 1

  const bothColumns = settings.timeDisplay === 'both'
  const labelX = bothColumns ? 326 : 350
  const timeX = bothColumns ? [598, 775] : [716]
  const headingY = 332
  const headings = bothColumns
    ? (arabicOnly ? ['الأذان', 'الإقامة'] : ['ADHAN', 'IQAMAH'])
    : [settings.timeDisplay === 'adhan' ? (arabicOnly ? 'الأذان' : 'ADHAN') : (arabicOnly ? 'الإقامة' : 'IQAMAH')]
  headings.forEach((heading, index) => text(ctx, heading, timeX[index], headingY, bothColumns ? 165 : 260, arabicOnly ? 28 : 20, theme.gold, arabicOnly, 700))
  text(ctx, arabicOnly ? 'الصلاة' : 'PRAYER', labelX, headingY, 220, arabicOnly ? 28 : 20, theme.gold, arabicOnly, 700)

  const gap = Math.min(79, 462 / Math.max(rows.length, 1))
  const firstY = 379 + (8 - Math.max(rows.length, 6)) * 5
  rows.forEach((row, index) => {
    const y = firstY + index * gap
    if (index % 2 === 0) {
      ctx.globalAlpha = settings.theme === 'ivory' ? 0.05 : 0.045
      ctx.fillStyle = theme.ink
      ctx.beginPath()
      ctx.roundRect(218, y - gap / 2 + 3, 644, gap - 6, 12)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    const primaryLabel = arabicOnly ? row.ar || row.en : row.en || row.ar
    const primaryArabic = arabicOnly ? Boolean(row.ar) : !row.en
    text(ctx, primaryLabel, labelX, bilingual ? y - 13 : y, bothColumns ? 200 : 246, bilingual ? 29 : 38, theme.ink, primaryArabic, 700)
    if (bilingual && row.ar) text(ctx, row.ar, labelX, y + 18, bothColumns ? 200 : 246, 28, theme.muted, true)
    const values = bothColumns ? [row.adhan, row.iqamah] : [settings.timeDisplay === 'adhan' ? row.adhan : row.iqamah]
    values.forEach((value, column) => text(ctx, value || '—', timeX[column], y, bothColumns ? 162 : 265, bothColumns ? 35 : 45, column === values.length - 1 ? theme.gold : theme.ink, false, 700))
  })

  if (!settings.confirmed) {
    text(ctx, arabicOnly ? 'نموذج • يرجى تأكيد الأوقات' : 'SAMPLE · CONFIRM PRAYER TIMES', 540, 870, 560, arabicOnly ? 27 : 21, theme.gold, arabicOnly, 700)
  }
  const date = new Date(`${settings.date}T12:00:00Z`)
  const dateLabel = new Intl.DateTimeFormat(arabicOnly ? 'ar' : 'en', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
  text(ctx, dateLabel, 540, 914, 490, 25, theme.muted, arabicOnly)
  if (settings.footer) text(ctx, settings.footer, 540, 951, 388, 22, theme.muted, /[\u0600-\u06ff]/.test(settings.footer))
}

export function ProfileArtwork({ settings, rows, className }: { settings: Settings; rows: DisplayRow[]; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    loadFonts().then(() => {
      if (cancelled || !canvasRef.current) return
      drawProfile(canvasRef.current, settings, rows)
      setError('')
    }).catch(() => {
      if (!cancelled) setError('The preview could not load. Refresh the page and try again.')
    })
    return () => { cancelled = true }
  }, [settings, rows])
  return <>
    <canvas ref={canvasRef} width={SIZE} height={SIZE} className={className} aria-label="Prayer timetable preview" role="img" style={{ display: 'block', width: '100%', height: 'auto', borderRadius: '50%' }}>
      {settings.name} {settings.nameAr}. {rows.map(row => `${row.en} ${row.ar}: Adhan ${row.adhan}; Iqamah ${row.iqamah}`).join('. ')}
    </canvas>
    {error && <p role="alert">{error}</p>}
  </>
}

export async function downloadProfile(settings: Settings, rows: DisplayRow[]): Promise<void> {
  await loadFonts()
  const canvas = document.createElement('canvas')
  drawProfile(canvas, settings, rows)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('The PNG could not be created. Please try again.')), 'image/png'))
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `masjid-profile-${settings.date}.png`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  // Some mobile browsers consume the download after the click handler finishes.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
