import assert from 'node:assert/strict'
import { createDefaults, getDisplayRows, validateSettings } from '../src/schedule.ts'
import { THEME_IDS } from '../src/model.ts'

const settings = createDefaults()
settings.date = '2026-10-21'
settings.use24Hour = true
assert.equal(validateSettings(JSON.parse(JSON.stringify(settings))).name, 'Masjid Abu Bakr')
assert.equal(validateSettings({ ...settings, confirmed: false }).name, settings.name)
const withoutTextSize = structuredClone(settings)
delete withoutTextSize.textSize
assert.equal(validateSettings(withoutTextSize).textSize, 'standard')
assert.equal(validateSettings({ ...settings, textSize: 'extra' }).textSize, 'large')
assert.equal('tableWidth' in validateSettings({ ...settings, tableWidth: 'wide' }), false)
for (const theme of THEME_IDS) assert.equal(validateSettings({ ...settings, theme }).theme, theme)
assert.equal(validateSettings({ ...settings, theme: 'custom', customColor: '#ABCDEF' }).customColor, '#abcdef')
assert.throws(() => validateSettings({ ...settings, customColor: 'red' }))
{ const { customColor: _c, customAccent: _a, ...legacy } = settings; assert.equal(validateSettings(legacy).customColor, '#1f5c4a') }
assert.throws(() => validateSettings({ ...settings, theme: 'missing' }), /theme/)
assert.throws(() => validateSettings({ ...settings, textSize: 'huge' }), /text size/)
assert.equal(getDisplayRows(settings).find(row => row.id === 'dhuhr')?.iqamah, '13:45')
assert.throws(() => validateSettings({ ...settings, date: '2026-02-30' }), /date/i)

const rows = getDisplayRows(settings)
const maghrib = rows.find(row => row.id === 'maghrib')!
assert.equal(maghrib.relativeMinutes, 7)
const relative = structuredClone(settings)
relative.prayers.maghrib.delay = 12
assert.equal(getDisplayRows(relative).find(row => row.id === 'maghrib')!.relativeMinutes, 12)
relative.date = '2026-11-21'
assert.equal(getDisplayRows(relative).find(row => row.id === 'maghrib')!.relativeMinutes, 12)
relative.prayers.maghrib.showRelative = false
assert.equal(getDisplayRows(relative).find(row => row.id === 'maghrib')!.relativeMinutes, undefined)
relative.prayers.maghrib.showRelative = true
relative.prayers.maghrib.iqamahMode = 'fixed'
assert.equal(getDisplayRows(relative).find(row => row.id === 'maghrib')!.relativeMinutes, undefined)
const legacy = structuredClone(settings)
delete legacy.prayers.maghrib.showRelative
assert.equal(validateSettings(legacy).prayers.maghrib.showRelative, false)
assert.throws(() => validateSettings({ ...settings, prayers: { ...settings.prayers, maghrib: { ...settings.prayers.maghrib, showRelative: 'yes' } } }), /relative wording/)
const minutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}
assert.equal(minutes(maghrib.iqamah) - minutes(maghrib.adhan), 7)
settings.prayers.maghrib.adjustment = 10
assert.equal(minutes(getDisplayRows(settings).find(row => row.id === 'maghrib')!.iqamah) - minutes(maghrib.iqamah), 10)
settings.date = '2026-11-21'
assert.equal(getDisplayRows(settings).find(row => row.id === 'dhuhr')!.iqamah, '13:45')
assert.notEqual(getDisplayRows(settings).find(row => row.id === 'maghrib')!.adhan, maghrib.adhan)
settings.use24Hour = false
assert.equal(getDisplayRows(settings).find(row => row.id === 'jumuah')!.iqamah, '1:30 PM')
settings.prayers.sunrise.enabled = true
assert.equal(getDisplayRows(settings).find(row => row.id === 'sunrise')!.iqamah, getDisplayRows(settings).find(row => row.id === 'sunrise')!.adhan)
settings.timeDisplay = 'both'
assert.equal(getDisplayRows(settings).find(row => row.id === 'sunrise')!.iqamah, '—')
settings.timeDisplay = 'iqamah'
settings.customRows.push({ id: 'class', en: 'Class', ar: '', time: '00:05', enabled: true })
const custom = getDisplayRows(settings).find(row => row.id === 'class')!
assert.equal(custom.iqamah, '12:05 AM')
assert.equal(custom.adhan, custom.iqamah)
assert.equal(custom.ar, '')
const arabicCustom = getDisplayRows({ ...settings, customRows: [{ id: 'arabic-class', en: '', ar: 'درس', time: '13:00', enabled: true }] }).find(row => row.id === 'arabic-class')!
assert.equal(arabicCustom.en, '')
assert.equal(arabicCustom.ar, 'درس')
assert.throws(() => validateSettings({ ...settings, timezone: 'Mars/Olympus' }), /timezone/i)
assert.throws(() => validateSettings({ ...settings, latitude: NaN }), /Latitude/)
assert.throws(() => validateSettings({ ...settings, version: 2 }), /version/i)
assert.throws(() => validateSettings({ ...settings, prayers: {} }), /Fajr/)
assert.throws(() => validateSettings({ ...settings, customRows: [...settings.customRows, { ...settings.customRows[0], id: 'ninth' }] }), /8/)
assert.throws(() => validateSettings({ ...settings, customRows: [{ ...settings.customRows[0], id: 'fajr' }] }), /unique/i)

// A viewer's device timezone must not change a masjid's clock times.
const before = process.env.TZ
process.env.TZ = 'Pacific/Auckland'
const auckland = getDisplayRows(settings)
process.env.TZ = 'America/Los_Angeles'
assert.deepEqual(getDisplayRows(settings), auckland)
if (before === undefined) delete process.env.TZ
else process.env.TZ = before

const polar = createDefaults()
polar.date = '2026-06-21'
polar.latitude = 89
polar.timeDisplay = 'both'
assert.throws(() => getDisplayRows(polar), /cannot be calculated/)
polar.timeDisplay = 'iqamah'
polar.prayers.maghrib.iqamahMode = 'fixed'
assert.equal(getDisplayRows(polar).find(row => row.id === 'fajr')!.iqamah, '6:50 AM')

// The built-in Jumu‘ah is numbered only while an extra "Jumu‘ah N" row is shown.
const jumuah = createDefaults()
jumuah.date = '2026-10-21'
assert.equal(getDisplayRows(jumuah).find(row => row.id === 'jumuah')!.en, 'Jumu‘ah')
jumuah.customRows = [{ id: 'j2', en: 'Jumu‘ah 2', ar: 'الجمعة الثانية', time: '14:30', enabled: true }]
assert.deepEqual(getDisplayRows(jumuah).filter(row => row.en.startsWith('Jumu')).map(row => [row.en, row.ar]), [['Jumu‘ah 1', 'الجمعة الأولى'], ['Jumu‘ah 2', 'الجمعة الثانية']])
jumuah.customRows[0].enabled = false
assert.equal(getDisplayRows(jumuah).find(row => row.id === 'jumuah')!.en, 'Jumu‘ah')
console.log('Schedule checks passed')
{
  // Pasted partial settings keep everything else from the current design.
  const { settingsFromPatch } = await import('../src/schedule.ts')
  const current = { ...createDefaults(), name: 'Masjid Noor', location: 'Here' }
  const next = settingsFromPatch({ prayers: { fajr: { fixed: '05:10' } } }, current)
  assert.equal(next.name, 'Masjid Noor')
  assert.equal(next.location, 'Here')
  assert.equal(next.prayers.fajr.fixed, '05:10')
  assert.equal(next.prayers.isha.fixed, current.prayers.isha.fixed)
  console.log('Pasted settings merge ok')
}
{
  // designForAi (the llms.txt form) reads back as the same design, and AI-typed Jumu'ah labels are respelt.
  const { designForAi, settingsFromPatch } = await import('../src/schedule.ts')
  const s = { ...createDefaults(), date: '2026-10-23', endDate: '2026-10-30' }
  s.prayers.isha = { ...s.prayers.isha, iqamahMode: 'after', delay: 10, showRelative: false, adjustment: 2 }
  s.prayers.asr.enabled = false
  s.customRows = [{ id: 'custom-1', en: 'Jumu‘ah 2', ar: 'الجمعة الثانية', time: '14:30', enabled: true }]
  const back = settingsFromPatch(designForAi(s))
  assert.deepEqual(getDisplayRows(back), getDisplayRows(s))
  assert.deepEqual(back, s)
  assert.equal(settingsFromPatch({ name: 'X', customRows: [{ en: "Jumu'ah 2", ar: '', time: '15:00' }] }).customRows[0].en, 'Jumu‘ah 2')
  assert.equal(settingsFromPatch({ name: 'X', customRows: [{ en: 'Jumuah 3', ar: '', time: '15:00' }] }).customRows[0].en, 'Jumu‘ah 3')
  console.log('AI design round trip ok')
}
