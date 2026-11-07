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
