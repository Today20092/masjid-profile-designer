import assert from 'node:assert/strict'
import { createDefaults } from '../src/schedule'
import { decodeSettings, encodeSettings } from '../src/share'

const settings = { ...createDefaults(), name: 'مسجد Test & “quotes”' }
const code = await encodeSettings(settings)
assert.match(code, /^[\w-]+$/, 'code is URL-safe')
assert.deepEqual(await decodeSettings(code), settings)
await assert.rejects(decodeSettings('not-a-real-code'))
await assert.rejects(decodeSettings('x'.repeat(9000)))
console.log(`share link ok (${code.length} chars)`)

// Optional end date: old settings without it still load; bad ranges are rejected.
const { validateSettings } = await import('../src/schedule')
const { endDate: _omit, ...legacy } = createDefaults()
assert.equal(validateSettings(legacy).endDate, '')
const base = createDefaults()
assert.equal(validateSettings({ ...base, date: '2026-11-08', endDate: '2026-11-15' }).endDate, '2026-11-15')
assert.throws(() => validateSettings({ ...base, date: '2026-11-08', endDate: '2026-11-01' }), /End date/)
assert.throws(() => validateSettings({ ...base, date: '2026-02-01', endDate: '2026-02-30' }), /End date/)
console.log('end date ok')

// AI links (public/llms.txt): partial JSON in the fragment, merged onto the defaults.
const { readFileSync } = await import('node:fs')
const { decodeAiDesign, readAiLink } = await import('../src/share')
const guide = readFileSync(new URL('../public/llms.txt', import.meta.url), 'utf8')
const example = readAiLink(guide.trim().split('\n').at(-1)!.replace(/^[^#]*/, ''))!
assert.equal(example.download, true)
const fromGuide = decodeAiDesign(example.json)
assert.equal(fromGuide.nameAr, 'مسجد النور')
assert.equal(fromGuide.prayers.maghrib.iqamahMode, 'fixed', 'a fixed time picks fixed mode')
assert.equal(fromGuide.prayers.maghrib.fixed, '17:40')
assert.deepEqual(fromGuide.customRows.map(row => [row.en, row.time, row.enabled]), [['Jumu‘ah 2', '14:15', true]])
assert.equal(fromGuide.location, '', 'sample masjid details never leak in')
assert.equal(readAiLink('#json={"name":"A"}')!.download, false)
assert.equal(readAiLink('#download=1&json=%7B%7D')!.json, '{}')
assert.equal(readAiLink('#s=abc'), null)
assert.equal(decodeAiDesign(readAiLink('#json={"name":"A & B #1"}')!.json).name, 'A & B #1', 'raw & and # survive')
assert.equal(decodeAiDesign(readAiLink('#json=' + encodeURIComponent('{"name":"100% halal"}'))!.json).name, '100% halal')
assert.equal(decodeAiDesign('{"name":"A","prayers":{"isha":{"delay":10}}}').prayers.isha.iqamahMode, 'after')
assert.equal(decodeAiDesign('{"name":"A","prayers":{"sunrise":{}}}').prayers.sunrise.enabled, true)
assert.throws(() => decodeAiDesign('{"nameAr":"مسجد"}'), /Masjid name/)
assert.throws(() => decodeAiDesign('{"name":"A","prayers":{"tahajjud":{}}}'), /Unknown prayer/)
assert.throws(() => decodeAiDesign('{"name":"A"'), /not valid JSON/)
assert.deepEqual(decodeAiDesign(JSON.stringify(createDefaults())), validateSettings(createDefaults()), 'full settings pass through unchanged')
console.log('AI links ok')
assert.equal(readAiLink('#download&json={}')!.scale, 1)
assert.deepEqual([readAiLink('#download=3&json={}')!.scale, readAiLink('#download=3&json={}')!.download], [3, true])
assert.equal(readAiLink('#download=9&json={}')!.download, false, 'unsupported sizes are ignored')
console.log('export scale ok')
