import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from 'adhan'
import { MAX_ROWS, PRAYERS, THEME_IDS, type DisplayRow, type Settings } from './model'

export const STORAGE_KEY = 'masjid-profile-studio-v1'
const methods = ['NorthAmerica', 'MuslimWorldLeague', 'Egyptian', 'UmmAlQura', 'Karachi', 'MoonsightingCommittee'] as const

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`)
  return value as Record<string, unknown>
}
function text(value: unknown, label: string, max: number, required = false): string {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) {
    throw new Error(`${label} must ${required ? 'not be empty and ' : ''}contain at most ${max} characters.`)
  }
  return value
}
function number(value: unknown, label: string, min: number, max: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new Error(`${label} must be ${integer ? 'a whole number ' : ''}between ${min} and ${max}.`)
  }
  return value
}
function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} must be on or off.`)
  return value
}
function choice<T extends string>(value: unknown, values: readonly T[], label: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) throw new Error(`Choose a valid ${label}.`)
  return value as T
}
function clock(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error(`${label} must be a valid time (HH:MM).`)
  return value
}

export function validateSettings(value: unknown): Settings {
  const s = object(value, 'Saved settings')
  if (s.version !== 1) throw new Error('Saved settings use an unsupported version.')
  const date = text(s.date, 'Date', 10)
  const parsed = new Date(`${date}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < '1900-01-01' || date > '2100-12-31') {
    throw new Error('Choose a valid date between 1900 and 2100.')
  }
  const timezone = text(s.timezone, 'Timezone', 100, true)
  try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(parsed) }
  catch { throw new Error('Enter a valid timezone, such as America/New_York.') }
  const source = object(s.prayers, 'Prayer settings')
  const prayers = {} as Settings['prayers']
  for (const prayer of PRAYERS) {
    const p = object(source[prayer.id], `${prayer.en} settings`)
    const mode = choice(p.iqamahMode, ['fixed', 'after'], `${prayer.en} iqamah mode`)
    if ((prayer.id === 'jumuah' || prayer.id === 'sunrise') && mode !== 'fixed') throw new Error(`${prayer.en} uses a fixed time.`)
    prayers[prayer.id] = {
      enabled: boolean(p.enabled, `${prayer.en} enabled`), iqamahMode: mode,
      fixed: clock(p.fixed, `${prayer.en} fixed time`),
      delay: number(p.delay, `${prayer.en} delay`, 0, 240, true),
      adjustment: number(p.adjustment, `${prayer.en} adjustment`, -120, 120, true),
      showRelative: p.showRelative === undefined ? false : boolean(p.showRelative, `${prayer.en} relative wording`),
    }
  }
  if (!Array.isArray(s.customRows) || s.customRows.length > 20) throw new Error('Use at most 20 custom rows.')
  const ids = new Set<string>(PRAYERS.map(p => p.id))
  const customRows = s.customRows.map((value, index) => {
    const row = object(value, `Custom row ${index + 1}`)
    const id = text(row.id, 'Row ID', 64, true)
    if (ids.has(id)) throw new Error('Each row must have a unique ID.')
    ids.add(id)
    const en = text(row.en, 'Custom English label', 32)
    const ar = text(row.ar, 'Custom Arabic label', 32)
    if (!en.trim() && !ar.trim()) throw new Error('Enter a label for each custom row.')
    return { id, en, ar, time: clock(row.time, 'Custom row time'), enabled: boolean(row.enabled, 'Custom row enabled') }
  })
  const count = Object.values(prayers).filter(p => p.enabled).length + customRows.filter(r => r.enabled).length
  if (count < 1 || count > MAX_ROWS) throw new Error(`Choose between 1 and ${MAX_ROWS} visible rows.`)
  return {
    version: 1, name: text(s.name, 'Masjid name', 64, true), nameAr: text(s.nameAr, 'Arabic masjid name', 64),
    location: text(s.location, 'Location', 160), latitude: number(s.latitude, 'Latitude', -90, 90),
    longitude: number(s.longitude, 'Longitude', -180, 180), timezone,
    method: choice(s.method, methods, 'calculation method'), madhab: choice(s.madhab, ['standard', 'hanafi'], 'Asr convention'),
    date, language: choice(s.language, ['en', 'ar', 'both'], 'language'),
    theme: choice(s.theme, THEME_IDS, 'theme'),
    timeDisplay: choice(s.timeDisplay, ['iqamah', 'adhan', 'both'], 'time columns'),
    use24Hour: boolean(s.use24Hour, '24-hour format'),
    textSize: s.textSize === undefined ? 'standard' : choice(s.textSize, ['standard', 'large', 'extra'], 'prayer text size'),
    tableWidth: s.tableWidth === undefined ? 'standard' : choice(s.tableWidth, ['standard', 'wide'], 'table width'),
    footer: text(s.footer, 'Footer', 100), prayers, customRows,
  }
}

export function createDefaults(): Settings {
  const dateParts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = (type: string) => dateParts.find(p => p.type === type)!.value
  const fixed = ['06:50', '07:00', '13:45', '16:45', '18:00', '20:15', '13:30']
  return {
    version: 1, name: 'Masjid Abu Bakr', nameAr: 'مسجد أبو بكر', location: '11010 N 30th St, Tampa, FL',
    latitude: 28.048619, longitude: -82.426613, timezone: 'America/New_York', method: 'NorthAmerica', madhab: 'standard',
    date: `${part('year')}-${part('month')}-${part('day')}`, language: 'both', theme: 'emerald', timeDisplay: 'iqamah',
    use24Hour: false, textSize: 'standard', tableWidth: 'standard', footer: '', customRows: [],
    prayers: Object.fromEntries(PRAYERS.map((prayer, i) => [prayer.id, {
      enabled: prayer.id !== 'sunrise', iqamahMode: prayer.id === 'maghrib' ? 'after' : 'fixed',
      fixed: fixed[i], delay: prayer.id === 'maghrib' ? 7 : 15, adjustment: 0,
      showRelative: prayer.id === 'maghrib',
    }])) as Settings['prayers'],
  }
}

export function getDisplayRows(settings: Settings): DisplayRow[] {
  const s = validateSettings(settings)
  const [year, month, day] = s.date.split('-').map(Number)
  const parameters = CalculationMethod[s.method]()
  parameters.madhab = s.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi
  for (const prayer of PRAYERS) {
    if (prayer.id !== 'jumuah') parameters.adjustments[prayer.id] = s.prayers[prayer.id].adjustment
  }
  const times = new PrayerTimes(new Coordinates(s.latitude, s.longitude), new Date(year, month - 1, day), parameters)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: s.timezone, hour: s.use24Hour ? '2-digit' : 'numeric', minute: '2-digit', hourCycle: s.use24Hour ? 'h23' : 'h12',
  })
  const formatFixed = (time: string) => {
    if (s.use24Hour) return time
    const [hours, minutes] = time.split(':').map(Number)
    return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
  }
  const rows: DisplayRow[] = []
  for (const prayer of PRAYERS) {
    const p = s.prayers[prayer.id]
    if (!p.enabled) continue
    let adhan = '—'
    let iqamah = prayer.id === 'sunrise' ? '—' : formatFixed(p.fixed)
    if (prayer.id !== 'jumuah') {
      const time = times[prayer.id]
      if (Number.isFinite(time.getTime())) {
        adhan = formatter.format(time)
        if (p.iqamahMode === 'after' && prayer.id !== 'sunrise') iqamah = formatter.format(new Date(time.getTime() + p.delay * 60_000))
      } else if (s.timeDisplay !== 'iqamah' || (p.iqamahMode === 'after' && !p.showRelative)) {
        throw new Error(`${prayer.en} cannot be calculated for this location and date. Use a fixed iqamah time or another location/date.`)
      }
    }
    rows.push({ id: prayer.id, en: prayer.en, ar: prayer.ar, adhan, iqamah, ...(p.iqamahMode === 'after' && p.showRelative ? { relativeMinutes: p.delay } : {}) })
  }
  for (const row of s.customRows) {
    if (row.enabled) rows.push({ id: row.id, en: row.en, ar: row.ar, adhan: formatFixed(row.time), iqamah: formatFixed(row.time) })
  }
  return rows
}
