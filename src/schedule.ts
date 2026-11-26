import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from 'adhan'
import { isExtraJumuah, JUMUAH_AR, MAX_ROWS, PRAYERS, THEME_IDS, type DisplayRow, type PrayerId, type Settings } from './model'
import { isHex } from './palette'

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

// An uploaded logo is stored as a small image data URL (resized to 256px when uploaded).
function logo(value: unknown) {
  if (typeof value !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) throw new Error('The logo must be a PNG, JPEG or WebP image.')
  if (value.length > 200_000) throw new Error('The logo is too large. Upload it again on the page.')
  return value
}
function hex(value: unknown, label: string) {
  if (typeof value !== 'string' || !isHex(value)) throw new Error(`${label} must be a colour like #1f5c4a.`)
  return value.toLowerCase()
}

export function validateSettings(value: unknown): Settings {
  const s = object(value, 'Saved settings')
  if (s.version !== 1) throw new Error('Saved settings use an unsupported version.')
  const date = text(s.date, 'Date', 10)
  const parsed = new Date(`${date}T12:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || date < '1900-01-01' || date > '2100-12-31') {
    throw new Error('Choose a valid date between 1900 and 2100.')
  }
  // endDate is optional ('' = single day) and absent from older saved settings and links.
  const endDate = s.endDate === undefined ? '' : text(s.endDate, 'End date', 10)
  const end = new Date(`${endDate}T12:00:00Z`)
  if (endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || !Number.isFinite(end.getTime()) || end.toISOString().slice(0, 10) !== endDate || endDate < date || endDate > '2100-12-31')) {
    throw new Error('End date must be a valid date on or after the start date.')
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
    date, endDate, language: choice(s.language, ['en', 'ar', 'both'], 'language'),
    theme: choice(s.theme, [...THEME_IDS, 'custom'] as const, 'theme'),
    // Custom colours are optional and absent from older saved settings and links.
    customColor: s.customColor === undefined ? '#1f5c4a' : hex(s.customColor, 'Custom colour'),
    customAccent: s.customAccent === undefined || s.customAccent === '' ? '' : hex(s.customAccent, 'Accent colour'),
    timeDisplay: choice(s.timeDisplay, ['iqamah', 'adhan', 'both'], 'time columns'),
    use24Hour: boolean(s.use24Hour, '24-hour format'),
    // Older designs and links may say "extra" (now the same as Large) or carry a tableWidth, which text size now decides.
    textSize: s.textSize === undefined ? 'standard' : s.textSize === 'extra' ? 'large' : choice(s.textSize, ['standard', 'large'], 'prayer text size'),
    // Older designs have no top symbol setting and keep the star.
    emblem: s.emblem === undefined ? 'star' : choice(s.emblem, ['star', 'none', 'logo'], 'top symbol'),
    logo: s.logo === undefined || s.logo === '' ? '' : logo(s.logo),
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
    date: `${part('year')}-${part('month')}-${part('day')}`, endDate: '', language: 'both', theme: 'emerald', customColor: '#1f5c4a', customAccent: '', timeDisplay: 'iqamah',
    use24Hour: false, textSize: 'standard', emblem: 'star', logo: '', footer: '', customRows: [],
    prayers: Object.fromEntries(PRAYERS.map((prayer, i) => [prayer.id, {
      enabled: prayer.id !== 'sunrise', iqamahMode: prayer.id === 'maghrib' ? 'after' : 'fixed',
      fixed: fixed[i], delay: prayer.id === 'maghrib' ? 7 : 15, adjustment: 0,
      showRelative: prayer.id === 'maghrib',
    }])) as Settings['prayers'],
  }
}

// AI links (see public/llms.txt) and pasted text send only what changes; the rest comes from the base.
// Without a base, the sample masjid's identity is blanked so it never leaks into someone else's design.
export function settingsFromPatch(value: unknown, base: Settings = { ...createDefaults(), name: '', nameAr: '', location: '' }): Settings {
  const patch = object(value, 'Design')
  const prayers: Record<string, unknown> = { ...base.prayers }
  if (patch.prayers !== undefined) {
    for (const [id, value] of Object.entries(object(patch.prayers, 'Prayer settings'))) {
      if (!(id in prayers)) throw new Error(`Unknown prayer "${id}". Use ${PRAYERS.map(p => p.id).join(', ')}.`)
      const row = object(value, `${id} settings`)
      // A listed prayer is shown, and giving a time or a delay picks that mode unless the mode is stated.
      const iqamahMode = row.iqamahMode ?? ('fixed' in row ? 'fixed' : 'delay' in row ? 'after' : base.prayers[id as PrayerId].iqamahMode)
      prayers[id] = { ...base.prayers[id as PrayerId], enabled: true, ...row, iqamahMode }
    }
  }
  const customRows = Array.isArray(patch.customRows)
    ? patch.customRows.map((value, i) => {
      const row = { id: `custom-${i + 1}`, en: '', ar: '', enabled: true, ...object(value, `Custom row ${i + 1}`) }
      // AIs type Jumu'ah or Jumuah; store the app's spelling so labels match the built-in row.
      return typeof row.en === 'string' && isExtraJumuah(row.en) ? { ...row, en: `Jumu‘ah ${row.en.match(/\d+/)![0]}` } : row
    })
    : patch.customRows ?? base.customRows
  return validateSettings({ ...base, ...patch, version: 1, prayers, customRows })
}

// The design in the short form public/llms.txt documents, for AI chats and Edit as text; settingsFromPatch reads it back.
export function designForAi(s: Settings) {
  // The logo image stays out: it is too large for a chat or a link, and the page keeps it.
  const { version: _version, logo: _logo, prayers, customRows, customColor, customAccent, endDate, ...rest } = s
  return {
    ...rest,
    ...(endDate ? { endDate } : {}),
    ...(s.theme === 'custom' ? { customColor, customAccent } : {}),
    prayers: Object.fromEntries(PRAYERS.map(({ id }) => {
      const p = prayers[id]
      if (!p.enabled) return [id, { enabled: false }]
      return [id, { ...(p.iqamahMode === 'fixed' ? { fixed: p.fixed } : { delay: p.delay, showRelative: p.showRelative }), ...(p.adjustment ? { adjustment: p.adjustment } : {}) }]
    })),
    customRows: customRows.map(({ en, ar, time, enabled }) => ({ en, ar, time, ...(enabled ? {} : { enabled: false }) })),
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
        // Sunrise has no iqamah; with one time column, show when it happens instead of a dash.
        if (prayer.id === 'sunrise' && s.timeDisplay === 'iqamah') iqamah = adhan
        if (p.iqamahMode === 'after' && prayer.id !== 'sunrise') iqamah = formatter.format(new Date(time.getTime() + p.delay * 60_000))
      } else if (s.timeDisplay !== 'iqamah' || (p.iqamahMode === 'after' && !p.showRelative)) {
        throw new Error(`${prayer.en} cannot be calculated for this location and date. Use a fixed iqamah time or another location/date.`)
      }
    }
    const numbered = prayer.id === 'jumuah' && s.customRows.some(row => row.enabled && isExtraJumuah(row.en))
    rows.push({ id: prayer.id, en: numbered ? 'Jumu‘ah 1' : prayer.en, ar: numbered ? JUMUAH_AR[0] : prayer.ar, adhan, iqamah, ...(p.iqamahMode === 'after' && p.showRelative ? { relativeMinutes: p.delay } : {}) })
  }
  for (const row of s.customRows) {
    if (row.enabled) rows.push({ id: row.id, en: row.en, ar: row.ar, adhan: formatFixed(row.time), iqamah: formatFixed(row.time) })
  }
  return rows
}

export function relativeWording(minutes: number, language: Settings['language']) {
  const english = `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  const arabic = minutes === 1 ? 'دقيقة واحدة' : minutes === 2 ? 'دقيقتان' : `${minutes} ${minutes >= 3 && minutes <= 10 ? 'دقائق' : 'دقيقة'}`
  if (language === 'both') return [{ value: `${english} after adhan`, arabic: false }, { value: `${arabic} بعد الأذان`, arabic: true }]
  return language === 'ar' ? [{ value: arabic, arabic: true }, { value: 'بعد الأذان', arabic: true }] : [{ value: english, arabic: false }, { value: 'after adhan', arabic: false }]
}

export function timetableDateLabel(settings: Settings) {
  const date = new Date(`${settings.date}T12:00:00Z`)
  const format = new Intl.DateTimeFormat(settings.language === 'ar' ? 'ar' : 'en', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  return settings.endDate && settings.endDate !== settings.date
    ? format.formatRange(date, new Date(`${settings.endDate}T12:00:00Z`))
    : format.format(date)
}

// Khutbah/iqamah pairs ("Jumuah 1 Khutbah", "Jumuah 1 Iqamah"): neighbouring rows whose labels differ only by that word.
// Null unless every row belongs to such a group and there are at least two, so other timetables keep row-by-row bands.
export function pairGroups(rows: DisplayRow[]) {
  const groups: { key: string; start: number; size: number }[] = []
  rows.forEach((row, start) => {
    const key = (row.en || row.ar).replace(/\b(?:khutbah?|iqamah?|adhan|salah|prayer)\b|الخطبة|خطبة|الإقامة|إقامة|الأذان/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
    const last = groups.at(-1)
    if (last?.key === key) last.size++
    else groups.push({ key, start, size: 1 })
  })
  return groups.length > 1 && groups.every(group => group.key && group.size > 1) ? groups : null
}

export function formatTimetable(settings: Settings, rows: DisplayRow[]) {
  const { language, timeDisplay } = settings
  const arabic = language === 'ar'
  const bilingual = language === 'both'
  const adhan = arabic ? 'الأذان' : 'Adhan'
  const iqamah = arabic ? 'الإقامة' : 'Iqamah'
  const title = timeDisplay === 'both' ? (arabic ? 'أوقات الصلاة' : 'Prayer timetable') : timeDisplay === 'adhan' ? adhan : iqamah
  const name = arabic ? settings.nameAr || settings.name : settings.name || settings.nameAr
  const header = [`${name.trim()} — ${title}`, bilingual && settings.name.trim() ? settings.nameAr.trim() : '', timetableDateLabel(settings)].filter(Boolean)
  const lines = rows.map(row => {
    const label = bilingual ? [row.en, row.ar].filter(Boolean).join(' / ') : arabic ? row.ar || row.en : row.en || row.ar
    if (timeDisplay === 'adhan') return `${label} — ${row.adhan}`
    const time = row.relativeMinutes === undefined ? row.iqamah : relativeWording(row.relativeMinutes, language).map(line => line.value).join(bilingual ? ' / ' : ' ')
    return timeDisplay === 'iqamah' ? `${label} — ${time}` : `${label} — ${adhan} ${row.adhan} · ${iqamah} ${time}`
  })
  return [...header, '', ...lines].join('\n')
}
