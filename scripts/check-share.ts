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
