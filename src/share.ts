import type { Settings } from './model'
import { validateSettings } from './schedule'

// Settings travel in the URL fragment (#s=…), so they never reach a server.
const MAX_CODE_LENGTH = 8000

const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromBase64Url = (code: string) => Uint8Array.from(atob(code.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
const pipe = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream) =>
  new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream)).arrayBuffer())

export async function encodeSettings(settings: Settings) {
  return toBase64Url(await pipe(new TextEncoder().encode(JSON.stringify(settings)), new CompressionStream('deflate-raw')))
}

export async function decodeSettings(code: string) {
  if (code.length > MAX_CODE_LENGTH) throw new Error('This link is too long to be a design link.')
  return validateSettings(JSON.parse(new TextDecoder().decode(await pipe(fromBase64Url(code), new DecompressionStream('deflate-raw')))))
}

export const readSharedCode = () => new URLSearchParams(location.hash.slice(1)).get('s')
export const clearSharedCode = () => history.replaceState(null, '', location.pathname + location.search)

export async function shareLink(settings: Settings) {
  return `${location.origin}${location.pathname}#s=${await encodeSettings(settings)}`
}

export function saveSettingsFile(settings: Settings) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' }))
  const link = Object.assign(document.createElement('a'), { href: url, download: `${settings.name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase() || 'masjid'}-profile-settings.json` })
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function readSettingsFile(file: File) {
  if (file.size > 100_000) throw new Error('That file is too large to be a settings file.')
  return validateSettings(JSON.parse(await file.text()))
}
