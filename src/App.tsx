import { useEffect, useMemo, useReducer, useState } from 'react'
import { ArrowDownToLine, Braces, Check, CircleHelp, Clock3, Copy, FileDown, Share, FileUp, Image as ImageIcon, Link, LocateFixed, LockKeyhole, Moon, Plus, RotateCcw, Sparkles, Trash2, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { clearSharedCode, decodeAiDesign, decodeSettings, readAiLink, readSettingsFile, readSharedCode, saveSettingsFile, shareLink } from './share'
import { PRAYERS, MAX_ROWS, THEME_IDS, JUMUAH_AR, isExtraJumuah, type Settings, type PrayerId, type PrayerSetting, type CustomRow } from './model'
import { createDefaults, designForAi, formatTimetable, getDisplayRows, settingsFromPatch, STORAGE_KEY, validateSettings } from './schedule'
import { ARTWORK_THEMES, ProfileArtwork, downloadProfile, renderProfile } from './ProfileArtwork'
import { derivePalette, isLight } from './palette'
import { PhotoPalettePicker } from './PhotoPalettePicker'
import { ColorPicker, ColorPickerArea, ColorPickerHue, ColorPickerInput, ColorPickerSwatch, ColorPickerSwatches } from '@/components/ui/color-picker'

function restore() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return { settings: saved ? validateSettings(JSON.parse(saved)) : createDefaults(), notice: '', blocked: false, firstVisit: !saved }
  } catch {
    return { settings: createDefaults(), firstVisit: false, notice:'Your saved settings could not be read. We opened the starting design and have not replaced your saved data.', blocked: true }
  }
}

function NumberField({ id, label, value, onChange, min, max, step = 1, compact = false }: {
  id: string; label: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number | 'any'; compact?: boolean
}) {
  const invalid = !Number.isFinite(value) || value < min || value > max || (step !== 'any' && !Number.isInteger(value))
  return <Field data-invalid={invalid}>
    <FieldLabel htmlFor={id} className={compact ? 'sr-only' : undefined}>{label}</FieldLabel>
    <Input id={id} type="number" inputMode={step === 'any' ? 'decimal' : 'numeric'} value={Number.isFinite(value) ? value : ''}
      min={min} max={max} step={step} aria-invalid={invalid} aria-describedby={invalid ? `${id}-error` : undefined} onChange={e => onChange(e.target.value === '' ? NaN : e.target.valueAsNumber)} />
    {invalid && <FieldError id={`${id}-error`}>Enter a number from {min} to {max}.</FieldError>}
  </Field>
}

function Choice<T extends string>({ id, label, value, options, onChange }: {
  id: string; label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void
}) {
  return <Field><FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Select items={options} value={value} onValueChange={next => { const option = options.find(item => item.value === next); if (option) onChange(option.value) }}>
      <SelectTrigger id={id}><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup>{options.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent>
    </Select>
  </Field>
}

const methods: { value: Settings['method']; label: string }[] = [
  { value: 'NorthAmerica', label: 'North America (ISNA)' }, { value: 'MuslimWorldLeague', label: 'Muslim World League' },
  { value: 'Egyptian', label: 'Egyptian General Authority' }, { value: 'UmmAlQura', label: 'Umm al-Qura' },
  { value: 'Karachi', label: 'University of Karachi' }, { value: 'MoonsightingCommittee', label: 'Moonsighting Committee' },
]

type EditHistory = { current: Settings; past: Settings[]; future: Settings[]; group: string | null }
function editHistory(state: EditHistory, action: { type: 'edit'; next: Settings | ((current: Settings) => Settings); group?: string } | { type: 'undo' } | { type: 'redo' } | { type: 'end-group' }): EditHistory {
  if (action.type === 'undo') return state.past.length ? { current: state.past[state.past.length - 1], past: state.past.slice(0, -1), future: [state.current, ...state.future].slice(0, 30), group: null } : state
  if (action.type === 'redo') return state.future.length ? { current: state.future[0], past: [...state.past, state.current], future: state.future.slice(1), group: null } : state
  if (action.type === 'end-group') return state.group ? { ...state, group: null } : state
  return { current: typeof action.next === 'function' ? action.next(state.current) : action.next, past: action.group && action.group === state.group ? state.past : [...state.past.slice(-29), state.current], future: [], group: action.group || null }
}

export default function App() {
  const [initial] = useState(restore)
  const [history, dispatch] = useReducer(editHistory, { current: initial.settings, past: [], future: [], group: null })
  const settings = history.current
  const setSettings = (next: Settings | ((current: Settings) => Settings), group?: string) => { dispatch({ type: 'edit', next, group }); setEditNotice('') }
  const [storageBlocked, setStorageBlocked] = useState(initial.blocked)
  const [storageNotice, setStorageNotice] = useState(initial.notice)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [downloaded, setDownloaded] = useState(false)
  const [timetableCopy, setTimetableCopy] = useState<{ text: string; copied: boolean } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locationNotice, setLocationNotice] = useState('')
  const [locationError, setLocationError] = useState('')
  const [calculationOpen, setCalculationOpen] = useState(false)
  const [editNotice, setEditNotice] = useState('')
  const [previewPinned, setPreviewPinned] = useState(false)
  const [fitWarning, setFitWarning] = useState('')
  const [editingColour, setEditingColour] = useState<'main' | 'accent'>('main')
  const customPalette = useMemo(() => derivePalette(settings.customColor, settings.customAccent), [settings.customColor, settings.customAccent])
  const [startOpen, setStartOpen] = useState(initial.firstVisit && !readSharedCode() && !readAiLink())
  const [incoming, setIncoming] = useState<Settings | null>(null)
  const [shareNotice, setShareNotice] = useState('')
  const [shareError, setShareError] = useState('')
  const [textOpen, setTextOpen] = useState(false)
  const [settingsText, setSettingsText] = useState('')
  const [textError, setTextError] = useState('')
  const [linkMessage, setLinkMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [spokenError, setSpokenError] = useState('')

  const [incomingDownload, setIncomingDownload] = useState(false)
  const [pendingDownload, setPendingDownload] = useState(false)
  const [exportScale, setExportScale] = useState(1)
  const [aiNotice, setAiNotice] = useState('')
  const [logoError, setLogoError] = useState('')

  useEffect(() => {
    const ai = readAiLink()
    const code = readSharedCode()
    if (!ai && !code) return
    const opened = ai ? Promise.resolve().then(() => decodeAiDesign(ai.json)) : decodeSettings(code!)
    opened.then(shared => {
      const download = Boolean(ai?.download)
      if (ai) setExportScale(ai.scale)
      // A first-time visitor has nothing to lose, so open the shared design straight away.
      if (initial.firstVisit) { dispatch({ type: 'edit', next: shared }); clearSharedCode(); setPendingDownload(download); setLinkMessage({ ok: true, text: `Opened the ${ai ? '' : 'shared '}design for ${shared.name}.${download ? ' Your image is downloading; if it does not start, press Download.' : ''} Your changes save on this browser.` }) }
      else { setIncoming(shared); setIncomingDownload(download) }
    }, error => {
      clearSharedCode()
      setLinkMessage({ ok: false, text: ai ? `This AI link could not be opened: ${error instanceof Error ? error.message : 'the design is not valid.'} Your current design was kept. Send this message back to the AI so it can fix the link.` : 'This design link is damaged or incomplete, so your current design was kept. Ask for the link again.' })
    })
  }, [initial.firstVisit])

  function acceptIncoming(use: boolean) {
    // Links never carry the logo image, so keep this browser's logo when the design still asks for one.
    if (use && incoming) { setSettings(incoming.emblem === 'logo' && !incoming.logo ? { ...incoming, logo: settings.logo } : incoming); setPendingDownload(incomingDownload); setLinkMessage({ ok: true, text: `Opened the shared design for ${incoming.name}.${incomingDownload ? ' Your image is downloading.' : ''} Use Undo to return to your previous design.` }) }
    setIncoming(null); clearSharedCode()
  }
  async function copyLink() {
    if (!result.settings) return
    setShareNotice(''); setShareError('')
    const url = await shareLink(result.settings)
    try { await navigator.clipboard.writeText(url); setShareNotice(`Link copied. Anyone who opens it gets their own editable copy of this design.${result.settings.logo ? ' Links leave out your logo; save a settings file to share it.' : ''}`) }
    catch { window.prompt('Copy this link to share your design:', url) }
  }
  function setEmblem(emblem: Settings['emblem']) {
    setLogoError('')
    if (emblem === 'logo' && !settings.logo) { document.getElementById('logo-file')?.click(); return }
    update('emblem', emblem)
  }
  async function uploadLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setLogoError('')
    try {
      if (!file.type.startsWith('image/')) throw new Error('Choose an image file, such as a PNG or JPEG.')
      if (file.size > 10_000_000) throw new Error('That image is over 10 MB. Choose a smaller one.')
      // Shrink to 256px so the logo fits in browser storage and settings files; it is drawn at most 130px wide.
      const bitmap = await createImageBitmap(file)
      const fit = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height))
      const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(bitmap.width * fit), height: Math.round(bitmap.height * fit) })
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const webp = canvas.toDataURL('image/webp', 0.9)
      const logo = webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png')
      setSaved(false); setDownloaded(false); setExportError('')
      setSettings(current => ({ ...current, emblem: 'logo', logo }))
    } catch (error) {
      setLogoError(error instanceof Error && !(error instanceof DOMException) ? error.message : 'That image could not be read. Try a PNG or JPEG.')
    }
  }
  async function openFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setShareNotice(''); setShareError('')
    try { const opened = await readSettingsFile(file); setSettings(opened); setShareNotice(`Opened ${file.name}. Use Undo to return to your previous design.`) }
    catch { setShareError(`${file.name} is not a Masjid Profile Studio settings file. Your design was not changed.`) }
  }
  const result = useMemo(() => {
    try {
      const valid = validateSettings(settings)
      return { settings: valid, rows: getDisplayRows(valid), error: '' }
    } catch (error) { return { settings: null, rows: [], error: error instanceof Error ? error.message : 'Please check your settings.' } }
  }, [settings])

  const timetableText = result.settings ? formatTimetable(result.settings, result.rows) : ''
  const copyFeedback = timetableText && timetableCopy?.text === timetableText ? timetableCopy : null

  // Keyed on the rendered result and size, so the message clears after the next edit.
  const [imageCopy, setImageCopy] = useState<{ of: unknown; scale: number; copied: boolean } | null>(null)
  const imageFeedback = imageCopy && imageCopy.of === result && imageCopy.scale === exportScale ? imageCopy : null
  async function copyImage() {
    if (!result.settings || exporting) return
    setExporting(true); setImageCopy(null); setExportError('')
    try {
      // The promise goes straight into ClipboardItem: Safari only allows a write started by the click itself.
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderProfile(result.settings, result.rows, exportScale) })])
      setImageCopy({ of: result, scale: exportScale, copied: true })
    } catch { setImageCopy({ of: result, scale: exportScale, copied: false }) }
    finally { setExporting(false) }
  }
  async function copyTimetable() {
    if (!timetableText) return
    try {
      await navigator.clipboard.writeText(timetableText)
      setTimetableCopy({ text: timetableText, copied: true })
    } catch {
      setTimetableCopy({ text: timetableText, copied: false })
    }
  }

  // One polite live region for settings errors, a moment later so it doesn't talk over the field that gets focus next.
  useEffect(() => {
    setSpokenError('')
    if (!result.error) return
    const timer = setTimeout(() => setSpokenError(result.error), 500)
    return () => clearTimeout(timer)
  }, [result.error])

  useEffect(() => {
    setSaved(false)
    if (storageBlocked || !result.settings) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(result.settings)); setSaved(true); setStorageNotice('') }
    catch { setStorageNotice('This browser cannot save your settings. You can still edit and download your image; copy a share link or save a settings file below to keep your changes.') }
  }, [result.settings, storageBlocked])

  useEffect(() => {
    function handleHistoryKey(event: KeyboardEvent) {
      if (event.defaultPrevented || !(event.ctrlKey || event.metaKey) || event.altKey) return
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return
      const key = event.key.toLowerCase()
      const type = key === 'y' || (key === 'z' && event.shiftKey) ? 'redo' : key === 'z' ? 'undo' : null
      if (!type || !(type === 'undo' ? history.past.length : history.future.length)) return
      event.preventDefault(); dispatch({ type }); setDownloaded(false); setExportError(''); setEditNotice(type === 'undo' ? 'Last edit undone.' : 'Edit restored.')
    }
    document.addEventListener('keydown', handleHistoryKey)
    return () => document.removeEventListener('keydown', handleHistoryKey)
  }, [history.past.length, history.future.length])

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSaved(false); setDownloaded(false); setExportError('')
    setSettings(current => ({ ...current, [key]: value }), document.activeElement instanceof HTMLInputElement ? document.activeElement.id : undefined)
  }
  function prayer(id: PrayerId, patch: Partial<PrayerSetting>) {
    setSaved(false); setDownloaded(false)
    setSettings(current => ({ ...current, prayers: { ...current.prayers, [id]: { ...current.prayers[id], ...patch } } }), document.activeElement instanceof HTMLInputElement ? document.activeElement.id : undefined)
  }
  function custom(id: string, patch: Partial<CustomRow>) {
    update('customRows', settings.customRows.map(row => row.id === id ? { ...row, ...patch } : row))
  }
  const sample = createDefaults()
  const isSample = settings.name === sample.name && settings.location === sample.location
  const numberedJumuah = settings.customRows.some(row => row.enabled && isExtraJumuah(row.en))
  const enabledCount = PRAYERS.filter(item => settings.prayers[item.id].enabled).length + settings.customRows.filter(row => row.enabled).length

  // Phones with a share sheet can save straight to Photos (where WhatsApp picks group photos) or send the image to a chat.
  const [canShareImage] = useState(() => navigator.maxTouchPoints > 0 && typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([''], 'test.png', { type: 'image/png' })] }))
  async function shareImage() {
    if (!result.settings || exporting) return
    setExporting(true); setExportError(''); setDownloaded(false)
    try { await navigator.share({ files: [await renderProfile(result.settings, result.rows, exportScale)] }); setDownloaded(true) }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setExportError('The image could not be shared. Use Download PNG instead.') }
    finally { setExporting(false) }
  }
  async function download() {
    if (!result.settings || exporting) return
    setExporting(true); setExportError(''); setDownloaded(false)
    try { await downloadProfile(result.settings, result.rows, exportScale); setDownloaded(true) }
    catch (error) { setExportError(error instanceof Error ? error.message : 'The image could not be downloaded. Please try again.') }
    finally { setExporting(false) }
  }
  // An AI link with "download" exports once the opened design has rendered.
  useEffect(() => {
    if (!pendingDownload) return
    setPendingDownload(false)
    if (result.settings) download()
  }, [pendingDownload, result.settings])
  const guideUrl = new URL('llms.txt', location.href.split('#')[0])
  async function copyAiRequest() {
    // An untouched sample says nothing about the user's masjid, so the AI starts fresh; otherwise it updates this design.
    const { date: _date, ...mine } = designForAi(settings)
    const { date: _sampleDate, ...sample } = designForAi(createDefaults())
    const current = JSON.stringify(mine) === JSON.stringify(sample) ? '' : `\n\nOur current design, to update:\n${JSON.stringify(designForAi(settings))}`
    const request = `Make our masjid's WhatsApp prayer-times image. Follow the instructions at ${guideUrl} and reply with the link. I'll attach our timetable photo or tell you the times.${current}`
    try { await navigator.clipboard.writeText(request); setAiNotice('Request copied. Paste it into your AI chat, then attach your timetable photo or type the changes.') }
    catch { window.prompt('Copy this request into your AI chat:', request) }
  }
  function useLocation() {
    setLocationNotice(''); setLocationError('')
    if (!navigator.geolocation) { setLocationError('Location is unavailable in this browser. Enter the coordinates below.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(position => {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      setSaved(false)
      setDownloaded(false)
      setExportError('')
      setSettings(current => ({ ...current, latitude: Number(position.coords.latitude.toFixed(6)), longitude: Number(position.coords.longitude.toFixed(6)), timezone }))
      setLocating(false)
      setLocationNotice(`Coordinates updated. Timezone is ${timezone}, from your device. Check that it matches the masjid, and update the location label.`)
    }, () => { setLocating(false); setLocationError('Location could not be accessed. Allow location in your browser or enter coordinates below.') }, { timeout: 15000, maximumAge: 300000 })
  }
  function reset() {
    setSettings(createDefaults()); setStorageBlocked(false); setStorageNotice(''); setDownloaded(false); setExportError('')
    setEditNotice('Starting design restored. Undo brings yours back.')
  }
  function undo() {
    dispatch({ type: 'undo' }); setDownloaded(false); setExportError(''); setEditNotice('Last edit undone.')
  }
  function redo() {
    dispatch({ type: 'redo' }); setDownloaded(false); setExportError(''); setEditNotice('Edit restored.')
  }
  function togglePreview() {
    setPreviewPinned(current => !current)
    if (!previewPinned && (document.querySelector('.editor-column')?.getBoundingClientRect().top || 0) > 0) requestAnimationFrame(() => document.getElementById('editing-preview')?.scrollIntoView({ block: 'start' }))
  }

  const today = (() => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: settings.timezone }).format(new Date()) } catch { return '' } })()
  const datesPassed = Boolean(today) && (settings.endDate || settings.date) < today
  function moveDatesToToday() {
    const span = settings.endDate ? Date.parse(settings.endDate) - Date.parse(settings.date) : 0
    setDownloaded(false); setExportError('')
    setSettings(current => ({ ...current, date: today, endDate: current.endDate ? new Date(Date.parse(today) + span).toISOString().slice(0, 10) : '' }))
  }
  function removeCustomRow(row: CustomRow) {
    update('customRows', settings.customRows.filter(item => item.id !== row.id))
    setEditNotice(`${row.en || 'Custom row'} removed. Undo brings it back.`)
  }
  function addJumuah() {
    const extras = settings.customRows.filter(row => isExtraJumuah(row.en))
    const n = Math.max(1, ...extras.map(row => Number(row.en.split(' ')[1]))) + 1
    // Next Jumu‘ah defaults to an hour after the latest one.
    const latest = [settings.prayers.jumuah.fixed, ...extras.map(row => row.time)].filter(Boolean).sort().at(-1) || '13:30'
    const [h, m] = latest.split(':').map(Number)
    const minutes = Math.min(h * 60 + m + 60, 23 * 60 + 59)
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    update('customRows', [...settings.customRows, { id: `custom-${crypto.randomUUID()}`, en: `Jumu‘ah ${n}`, ar: JUMUAH_AR[n - 1] || `الجمعة ${n}`, time, enabled: true }])
  }
  function clearEndDate() {
    update('endDate', '')
    setEditNotice('End date cleared. Undo brings it back.')
    document.getElementById('end-date')?.focus()
  }
  function openText(open: boolean) {
    setTextOpen(open); setTextError('')
    if (open) setSettingsText(JSON.stringify(designForAi(settings), null, 2))
  }
  async function copyForAi() {
    const prompt = `Update this masjid prayer-times design to match the attached timetable photo. The format is explained at ${guideUrl}. Reply with only the JSON, not a link.`
    try { await navigator.clipboard.writeText(`${prompt}\n\n${settingsText}`); setTextError(''); setShareError(''); setShareNotice('Copied with instructions. Paste it into an AI chat with a photo of your timetable, then paste its answer back here.') }
    catch { setTextError('Copying is blocked in this browser. Select the text below and copy it.') }
  }
  function applyText() {
    // Forgive AI answers wrapped in ``` fences or a sentence: keep only the outermost { … }.
    try {
      const next = settingsFromPatch(JSON.parse(settingsText.slice(settingsText.indexOf('{'), settingsText.lastIndexOf('}') + 1)), settings)
      setSettings(next); setSettingsText(JSON.stringify(designForAi(next), null, 2)); setTextError(''); setShareError('')
      setShareNotice('Settings applied. Undo brings back your previous design.')
    } catch (error) {
      setTextError(error instanceof SyntaxError ? 'This text is not complete settings. Check it runs from the first { to the last }. Your design was not changed.' : `${error instanceof Error ? error.message : 'These settings are not valid.'} Your design was not changed.`)
    }
  }

  // The field to edit for the text the artwork had to shrink, when the user typed it.
  const fitRow = settings.customRows.find(row => row.en === fitWarning || row.ar === fitWarning)
  const fitField = !fitWarning ? '' : fitWarning === settings.name ? 'name' : fitWarning === settings.nameAr ? 'name-ar' : fitWarning === settings.location ? 'location' : fitWarning === settings.footer ? 'footer' : fitRow ? `${fitRow.en === fitWarning ? 'en' : 'ar'}-${fitRow.id}` : ''
  const errorPrayer = PRAYERS.find(item => result.error.startsWith(`${item.en} fixed time`))
  const errorTarget = /timezone/i.test(result.error) ? 'timezone' : /latitude/i.test(result.error) ? 'latitude' : /longitude/i.test(result.error) ? 'longitude' : /end date/i.test(result.error) ? 'end-date' : /date/i.test(result.error) ? 'date' : /masjid name/i.test(result.error) ? 'name' : errorPrayer ? `time-${errorPrayer.id}` : 'settings-errors'
  function revealError(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    if (['timezone', 'latitude', 'longitude'].includes(errorTarget)) setCalculationOpen(true)
    requestAnimationFrame(() => { const field = document.getElementById(errorTarget); field?.focus(); field?.scrollIntoView({ block: 'center' }) })
  }

  const downloadLabel = exporting ? 'Preparing your image…' : 'Download PNG'
  return <>
    <header className="masthead">
      <a className="brand" href="#main" aria-label="Masjid Profile Studio home"><span className="brand-mark"><Moon aria-hidden="true" /></span><span>Masjid<span className="brand-subtitle">Profile Studio</span></span></a>
      <span className="privacy-note"><LockKeyhole aria-hidden="true" /><span>Made on your device</span></span>
    </header>
    <main id="main" className="studio-shell" data-preview-pinned={previewPinned} onBlurCapture={() => dispatch({ type: 'end-group' })}>
      <section className="intro"><h1 id="page-title">Your masjid’s prayer times.</h1><p>Edit your timetable, choose a design, and download your group photo.</p><nav className="studio-shortcuts" aria-label="Timetable sections"><a className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))} href="#times-heading">Edit times</a><a className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))} href="#appearance-heading">Choose design</a></nav></section>
      <div className="studio-grid">
        <section className="preview-column" aria-labelledby="preview-title"><div className="preview-sticky">
          <div className="section-topline"><h2 id="preview-title" tabIndex={-1}>Your profile image</h2><span className="live-label"><span />Live preview</span></div>
          <div className="preview-stage"><div className="preview-orbit" aria-hidden="true" />
            {result.settings ? <ProfileArtwork settings={result.settings} rows={result.rows} className="main-artwork" onFitWarning={setFitWarning} /> : <div className="preview-unavailable"><CircleHelp aria-hidden="true" /><p>Complete your settings<br />to see your design.</p></div>}
            <span className="crop-note">Designed to fit the circle</span>
          </div>
          {fitWarning && <p className="fit-warning" role="status">{fitField ? <a href={`#${fitField}`} onClick={event => { event.preventDefault(); const field = document.getElementById(fitField); field?.focus(); field?.scrollIntoView({ block: 'center' }) }}>“{fitWarning}”</a> : <>“{fitWarning}”</>} was shrunk to fit. Shorten it, show fewer rows, or use one time column for clearer text.</p>}
          <div className="whatsapp-example">
            {result.settings && <div className="mini-artwork" aria-hidden="true"><ProfileArtwork settings={result.settings} rows={result.rows} /></div>}
            <div><strong>{settings.name || 'Your masjid'}</strong><p>Open the group photo to read the timetable.</p></div>
          </div><Separator />
          <div className="download-area"><Button size="lg" className="download-button" disabled={!result.settings || exporting} onClick={download}>{exporting ? <Spinner data-icon="inline-start" role={undefined} aria-label={undefined} aria-hidden /> : <ArrowDownToLine data-icon="inline-start" />}{downloadLabel}</Button>{canShareImage && <Button size="lg" variant="outline" className="share-image-button" disabled={!result.settings || exporting} onClick={shareImage}><Share data-icon="inline-start" />Save to Photos or share</Button>}
            <Button size="lg" type="button" variant="outline" className="copy-image-button" disabled={!result.settings || exporting} onClick={copyImage}><ImageIcon data-icon="inline-start" aria-hidden="true" />Copy image</Button>
            <p className="share-status" role="status">{imageFeedback && (imageFeedback.copied ? 'Image copied. Paste it into your chat.' : 'This browser could not copy the image. Use Download PNG instead.')}</p>
            <Button size="lg" type="button" variant="outline" className="copy-timetable-button" disabled={!timetableText} onClick={copyTimetable}><Copy data-icon="inline-start" aria-hidden="true" />Copy timetable</Button>
            <p className="share-status" role="status">{copyFeedback && (copyFeedback.copied ? 'Timetable copied. Paste it into your group chat.' : 'Clipboard access is blocked. Select and copy the timetable below.')}</p>
            {copyFeedback && !copyFeedback.copied && <Textarea aria-label="Timetable text" dir="auto" readOnly rows={5} value={timetableText} />}
            <p className="export-scale-label" id="export-scale-label">Image size</p><ToggleGroup variant="outline" className="segmented export-scale" aria-labelledby="export-scale-label" value={[String(exportScale)]} onValueChange={([value]) => { if (value) setExportScale(Number(value)) }}>{[1, 2, 3].map(scale => <ToggleGroupItem key={scale} value={String(scale)} aria-label={`${1080 * scale} pixels`}>{scale}×</ToggleGroupItem>)}</ToggleGroup><p>{1080 * exportScale} × {1080 * exportScale} px · {exportScale === 1 ? 'Ready for WhatsApp' : 'Sharper, for print or large screens'}</p>{(result.error || exportError) && <p><a href={`#${errorTarget}`} onClick={revealError}>{result.error || exportError} Review settings.</a></p>}{downloaded && <p role="status">Image ready. Set it as your WhatsApp group photo.</p>}</div>
          <p className="how-to">Download your image, then open your WhatsApp group → tap the group name → edit its photo.</p>
          <p className="how-to">Have a timetable photo? <a className="text-link" href="#ai-heading">An AI can fill this in for you.</a></p>
        </div></section>
        <section className="editor-column" aria-label="Customize your timetable">
          {previewPinned && <aside className="mobile-edit-preview" id="editing-preview" aria-label="Preview while editing"><div className="editing-artwork" aria-hidden="true">{result.settings ? <ProfileArtwork settings={result.settings} rows={result.rows} /> : <p>Fix your settings to see the preview.</p>}</div><div><strong>Live preview</strong><p>Your changes appear here.</p><a className={buttonVariants({ variant: 'link' })} href="#preview-title" onClick={() => setPreviewPinned(false)}>Full image</a><Button variant="outline" onClick={() => setPreviewPinned(false)}>Close preview</Button></div></aside>}
          {startOpen && <section className="editor-section start-card">
            <div className="editor-heading"><div><h2 id="start-heading">Start here</h2><p>Three steps to your masjid’s profile image. Everything else is optional.</p></div><Button variant="ghost" size="icon" className="start-dismiss" aria-label="Close Start here" onClick={() => setStartOpen(false)}><X /></Button></div>
            <ol className="start-steps">
              <li><a href="#name" onClick={() => requestAnimationFrame(() => document.getElementById('name')?.focus())}>Enter your masjid’s name</a></li>
              <li><Button variant="link" className="start-link" disabled={locating} onClick={useLocation}>Use my location for prayer times</Button></li>
              <li><a href="#appearance-heading">Choose a design</a>, then download your image</li>
            </ol>
          </section>}
          {(incoming || linkMessage) && <div className="notices" aria-live="polite">
            {incoming && <Alert><Link /><AlertTitle>You opened a shared design for {incoming.name}</AlertTitle><AlertDescription>Your own design is still saved on this browser.<div className="share-choice"><Button onClick={() => acceptIncoming(true)}>Use shared design</Button><Button variant="outline" onClick={() => acceptIncoming(false)}>Keep my design</Button></div></AlertDescription></Alert>}
            {linkMessage && <Alert variant={linkMessage.ok ? 'default' : 'destructive'}>{linkMessage.ok ? <Check /> : <CircleHelp />}<AlertTitle>{linkMessage.ok ? 'Shared design opened' : 'Design not opened'}</AlertTitle><AlertDescription>{linkMessage.text}</AlertDescription></Alert>}
          </div>}
          {(storageNotice || result.error || exportError) && <div className="notices" id="settings-errors" tabIndex={-1}>
            {storageNotice && <Alert><CircleHelp /><AlertTitle>Browser storage</AlertTitle><AlertDescription>{storageNotice}{storageBlocked && <Button variant="outline" className="storage-acknowledge" onClick={() => setStorageBlocked(false)}>Use starting design and replace saved data</Button>}</AlertDescription></Alert>}
            {result.error && <Alert variant="destructive" role={undefined}><CircleHelp /><AlertTitle>Check your settings</AlertTitle><AlertDescription>{result.error}</AlertDescription></Alert>}
            {exportError && <Alert variant="destructive"><CircleHelp /><AlertTitle>Download did not finish</AlertTitle><AlertDescription>{exportError}</AlertDescription></Alert>}
          </div>}
          <section className="editor-section">
            <div className="editor-heading"><div><h2 id="identity-heading">Your masjid</h2></div></div>
            <FieldGroup>
              <Field data-invalid={!settings.name.trim()}><FieldLabel htmlFor="name">Masjid name</FieldLabel><Input id="name" required aria-invalid={!settings.name.trim()} aria-describedby={!settings.name.trim() ? 'name-error' : undefined} maxLength={64} value={settings.name} onChange={e => update('name', e.target.value)} />{!settings.name.trim() && <FieldError id="name-error">Enter your masjid’s name.</FieldError>}{isSample && <FieldDescription>This is an example masjid. Replace it with yours before you download.</FieldDescription>}</Field>
              <Field><FieldLabel htmlFor="name-ar">Name in Arabic</FieldLabel><Input id="name-ar" lang="ar" dir="rtl" maxLength={64} value={settings.nameAr} onChange={e => update('nameAr', e.target.value)} /></Field>
              <Field><FieldLabel htmlFor="location">Location label</FieldLabel><Input id="location" aria-describedby="location-label-help" maxLength={70} value={settings.location} onChange={e => update('location', e.target.value)} /><FieldDescription id="location-label-help">Image text only. It does not change calculated times.</FieldDescription></Field>
                <FieldSet className="date-range"><FieldLegend variant="label">Timetable dates</FieldLegend>
                  <div className="two-fields">
                    <Field data-invalid={errorTarget === 'date'}><FieldLabel htmlFor="date">Start</FieldLabel><Input id="date" required aria-invalid={errorTarget === 'date'} aria-describedby={errorTarget === 'date' ? 'date-range-help date-error' : 'date-range-help'} type="date" min="1900-01-01" max="2100-12-31" value={settings.date} onChange={e => update('date', e.target.value)} /></Field>
                    <Field data-invalid={errorTarget === 'end-date'}><FieldLabel htmlFor="end-date">End <span className="optional-label">(optional)</span></FieldLabel><Input id="end-date" aria-invalid={errorTarget === 'end-date'} aria-describedby={errorTarget === 'end-date' ? 'date-range-help end-date-error' : 'date-range-help'} type="date" min={settings.date} max="2100-12-31" value={settings.endDate} onChange={e => update('endDate', e.target.value)} />{settings.endDate && <Button variant="link" className="clear-end-date" onClick={clearEndDate}><X data-icon="inline-start" />Clear end date</Button>}</Field>
                  </div>
                  {errorTarget === 'date' && <FieldError id="date-error">{result.error}</FieldError>}
                  {errorTarget === 'end-date' && <FieldError id="end-date-error">{result.error}</FieldError>}
                  {datesPassed && <p className="dates-passed" role="status">These dates have passed. <Button variant="link" className="start-link" onClick={moveDatesToToday}>Start from today{settings.endDate ? ', same length' : ''}</Button></p>}
                  <FieldDescription id="date-range-help">Add an end date to show a range like “8–15 November”. Prayer times are calculated for the start date.</FieldDescription>
                </FieldSet>
            </FieldGroup>
          </section>
          <section className="editor-section">
            <div className="editor-heading"><div><h2 id="times-heading" tabIndex={-1}>Prayer times</h2></div><span className="row-count">{enabledCount}/{MAX_ROWS} rows</span></div>
            <p className="section-description">Edit iqamah times below. Open a prayer’s options for delays and adhan adjustments.</p>
            <div className="calculation-summary"><p>Adhan is calculated. Confirm the location and method, and use your masjid’s iqamah times.</p><a className={buttonVariants({ variant: 'link' })} href="#calculation-settings" onClick={() => setCalculationOpen(true)}>Review calculation settings</a></div>
            <FieldSet className="prayer-rows"><FieldLegend className="sr-only">Prayers to display</FieldLegend>
              {PRAYERS.map(item => {
                const row = settings.prayers[item.id]
                const calculated = result.rows.find(display => display.id === item.id)
                return <Accordion className="prayer-editor" key={item.id} data-enabled={row.enabled}><AccordionItem value="options" className="border-0">
                  <div className="prayer-main">
                    <Field orientation="horizontal" className="prayer-heading"><Checkbox id={`enable-${item.id}`} checked={row.enabled} disabled={!row.enabled && enabledCount >= MAX_ROWS} onCheckedChange={checked => prayer(item.id, { enabled: checked === true })} /><FieldLabel htmlFor={`enable-${item.id}`}><span className="prayer-name">{item.id === 'jumuah' && numberedJumuah ? 'Jumu‘ah 1' : item.en}<span lang="ar" dir="rtl" className="prayer-arabic">{item.id === 'jumuah' && numberedJumuah ? JUMUAH_AR[0] : item.ar}</span></span></FieldLabel></Field>
                    {row.enabled && <div className="compact-value">
                      {item.id === 'sunrise' ? <output aria-label="Calculated sunrise">{calculated?.adhan || '—'}</output> : row.iqamahMode === 'fixed' || item.id === 'jumuah' ? <Field><FieldLabel htmlFor={`time-${item.id}`} className="sr-only">{item.en} iqamah time</FieldLabel><Input id={`time-${item.id}`} type="time" required aria-invalid={!row.fixed} aria-describedby={!row.fixed ? `time-${item.id}-error` : undefined} value={row.fixed} onChange={e => prayer(item.id, { fixed: e.target.value })} />{!row.fixed && <FieldError id={`time-${item.id}-error`}>Enter an iqamah time.</FieldError>}{row.fixed && item.id !== 'jumuah' && calculated?.adhan && <span className="delay-unit">Adhan {calculated.adhan}</span>}</Field> : <><NumberField id={`delay-${item.id}`} label={`${item.en} minutes after adhan`} compact min={0} max={240} value={row.delay} onChange={value => prayer(item.id, { delay: value })} /><span className="delay-unit">min after adhan</span></>}
                    </div>}
                    {row.enabled && item.id !== 'jumuah' && <AccordionTrigger className="prayer-options" aria-label={`${item.en} options`} title={`${item.en} options`}><span className="sr-only">{item.en} options</span></AccordionTrigger>}
                  </div>
                  {row.enabled && item.id !== 'jumuah' && <AccordionContent><FieldGroup className="prayer-details">
                    {calculated?.adhan && <p className="calculated-note">Calculated {item.id === 'sunrise' ? 'sunrise' : 'adhan'}: {calculated.adhan}</p>}
                    {item.id !== 'sunrise' && <Choice id={`mode-${item.id}`} label="Iqamah setting" value={row.iqamahMode} onChange={value => prayer(item.id, { iqamahMode: value })} options={[{ value: 'fixed', label: 'Fixed time' }, { value: 'after', label: 'After adhan' }]} />}
                    {row.iqamahMode === 'after' && item.id !== 'sunrise' && <Field orientation="horizontal" className="relative-field"><Checkbox id={`relative-${item.id}`} checked={row.showRelative} onCheckedChange={checked => prayer(item.id, { showRelative: checked === true })} /><FieldLabel htmlFor={`relative-${item.id}`}>Show “{row.delay} {row.delay === 1 ? 'minute' : 'minutes'} after adhan” on image</FieldLabel></Field>}
                    <NumberField id={`adjust-${item.id}`} label="Adhan minute adjustment (+ or −)" min={-120} max={120} value={row.adjustment} onChange={value => prayer(item.id, { adjustment: value })} />
                  </FieldGroup></AccordionContent>}
                </AccordionItem></Accordion>
              })}
              {settings.customRows.map(row => isExtraJumuah(row.en) ? <div className="prayer-editor" key={row.id} data-enabled={row.enabled}><div className="prayer-main">
                <Field orientation="horizontal" className="prayer-heading"><Checkbox id={`enable-${row.id}`} checked={row.enabled} disabled={!row.enabled && enabledCount >= MAX_ROWS} onCheckedChange={checked => custom(row.id, { enabled: checked === true })} /><FieldLabel htmlFor={`enable-${row.id}`}><span className="prayer-name">{row.en}<span lang="ar" dir="rtl" className="prayer-arabic">{row.ar}</span></span></FieldLabel></Field>
                {row.enabled && <div className="compact-value"><Field><FieldLabel htmlFor={`custom-time-${row.id}`} className="sr-only">{row.en} time</FieldLabel><Input id={`custom-time-${row.id}`} type="time" required aria-invalid={!row.time} aria-describedby={!row.time ? `custom-time-${row.id}-error` : undefined} value={row.time} onChange={e => custom(row.id, { time: e.target.value })} />{!row.time && <FieldError id={`custom-time-${row.id}-error`}>Enter a time.</FieldError>}</Field></div>}
                <Button variant="ghost" size="icon" className="remove-row" aria-label={`Remove ${row.en}`} onClick={() => removeCustomRow(row)}><Trash2 /></Button>
              </div></div> : <div className="prayer-editor custom-prayer" key={row.id}>
                <Field orientation="horizontal" className="prayer-heading"><Checkbox id={`enable-${row.id}`} checked={row.enabled} disabled={!row.enabled && enabledCount >= MAX_ROWS} onCheckedChange={checked => custom(row.id, { enabled: checked === true })} /><FieldLabel htmlFor={`enable-${row.id}`}>{row.en || 'Custom row'}</FieldLabel><Button variant="ghost" size="icon" aria-label={`Remove ${row.en || 'custom row'}`} onClick={() => removeCustomRow(row)}><Trash2 /></Button></Field>
                <FieldGroup className="prayer-controls"><FieldGroup className="two-fields"><Field><FieldLabel htmlFor={`en-${row.id}`}>English label</FieldLabel><Input id={`en-${row.id}`} maxLength={30} value={row.en} onChange={e => custom(row.id, { en: e.target.value })} /></Field><Field><FieldLabel htmlFor={`ar-${row.id}`}>Arabic label</FieldLabel><Input id={`ar-${row.id}`} lang="ar" dir="rtl" maxLength={30} value={row.ar} onChange={e => custom(row.id, { ar: e.target.value })} /></Field></FieldGroup><Field><FieldLabel htmlFor={`custom-time-${row.id}`}>Time</FieldLabel><Input id={`custom-time-${row.id}`} type="time" required aria-invalid={!row.time} aria-describedby={!row.time ? `custom-time-${row.id}-error` : undefined} value={row.time} onChange={e => custom(row.id, { time: e.target.value })} />{!row.time && <FieldError id={`custom-time-${row.id}-error`}>Enter a time for this row.</FieldError>}</Field></FieldGroup>
              </div>)}
            </FieldSet>
            <div className="add-rows">
              <Button variant="outline" disabled={enabledCount >= MAX_ROWS || settings.customRows.length >= MAX_ROWS} onClick={addJumuah}><Plus data-icon="inline-start" />Add Jumu‘ah</Button>
              <Button variant="outline" disabled={enabledCount >= MAX_ROWS || settings.customRows.length >= MAX_ROWS} onClick={() => update('customRows', [...settings.customRows, { id: `custom-${crypto.randomUUID()}`, en: 'Additional prayer', ar: 'صلاة إضافية', time: '13:30', enabled: true }])}><Plus data-icon="inline-start" />Add a custom row</Button>
            </div>
          </section>
          <section className="editor-section">
            <div className="editor-heading"><div><h2 id="appearance-heading" tabIndex={-1}>Make it feel like home</h2></div></div>
            <FieldGroup>
              <Field><FieldLabel id="theme-label">Choose a theme</FieldLabel><ToggleGroup className="theme-options" aria-labelledby="theme-label" value={[settings.theme]} onValueChange={([value]) => { const theme = [...THEME_IDS, 'custom' as const].find(theme => theme === value); if (theme) update('theme', theme) }}>{THEME_IDS.map(theme => <ToggleGroupItem key={theme} value={theme} className="theme-option"><span className="theme-swatch" style={{ color: ARTWORK_THEMES[theme].gold, background: ARTWORK_THEMES[theme].background }} aria-hidden="true"><Moon /><span /><span /><span /></span><span>{ARTWORK_THEMES[theme].name}</span><Check className="theme-check" aria-hidden="true" /></ToggleGroupItem>)}<ToggleGroupItem value="custom" className="theme-option"><span className="theme-swatch" style={{ color: customPalette.gold, background: customPalette.background }} aria-hidden="true"><Moon /><span /><span /><span /></span><span>Custom</span><Check className="theme-check" aria-hidden="true" /></ToggleGroupItem></ToggleGroup></Field>
              <PhotoPalettePicker
                isApplied={({ main, accent }) => settings.theme === 'custom' && settings.customColor === main && settings.customAccent === accent}
                onApply={({ main, accent }) => {
                  setSaved(false); setDownloaded(false); setExportError('')
                  setSettings(current => ({ ...current, theme: 'custom', customColor: main, customAccent: accent }))
                }}
              />
              {settings.theme === 'custom' && <FieldSet className="custom-colours"><FieldLegend variant="label">Your colours</FieldLegend>
                <ToggleGroup variant="outline" className="segmented" aria-label="Colour to edit" value={[editingColour]} onValueChange={([value]) => { if (value === 'main' || value === 'accent') setEditingColour(value) }}>
                  <ToggleGroupItem value="main"><span className="colour-dot" style={{ background: settings.customColor }} aria-hidden="true" />Main colour</ToggleGroupItem>
                  <ToggleGroupItem value="accent"><span className="colour-dot" style={{ background: customPalette.gold }} aria-hidden="true" />Accent</ToggleGroupItem>
                </ToggleGroup>
                <ColorPicker key={editingColour} className="colour-picker" aria-label={editingColour === 'main' ? 'Main colour' : 'Accent colour'}
                  value={editingColour === 'main' ? settings.customColor : settings.customAccent || customPalette.gold}
                  onValueChange={value => update(editingColour === 'main' ? 'customColor' : 'customAccent', value)}>
                  <ColorPickerArea />
                  <ColorPickerHue />
                  <div className="colour-row"><span className="colour-preview" style={{ background: editingColour === 'main' ? settings.customColor : customPalette.gold }} aria-hidden="true" /><ColorPickerInput id="custom-hex" aria-label={`${editingColour === 'main' ? 'Main' : 'Accent'} colour code`} aria-describedby="custom-colours-help" /></div>
                  {editingColour === 'main' && <ColorPickerSwatches aria-label="Suggested colours">{['#103e36', '#1b2a6b', '#6d1a2c', '#32223f', '#0f4c5c', '#5a3e1b', '#25292b', '#f6efdf'].map(c => <ColorPickerSwatch key={c} value={c} className="colour-chip" />)}</ColorPickerSwatches>}
                </ColorPicker>
                {editingColour === 'accent' && settings.customAccent && <Button variant="link" className="colour-reset" onClick={() => update('customAccent', '')}>Use automatic accent</Button>}
                <FieldDescription id="custom-colours-help">Text and accent colours are chosen for you and always meet WCAG AA contrast (4.5:1).{settings.customAccent ? ' Your accent is lightened or darkened if needed to stay readable.' : ' Leave the accent on automatic for a warm gold.'}</FieldDescription>
                {customPalette.adjusted && <p className="custom-adjusted" role="status">Text can’t be read clearly on this colour, so the background is {isLight(customPalette.background) ? 'lighter' : 'deeper'}{settings.customAccent ? '' : ' and your colour is used for the times and headings'}. For an exact background, pick a darker or lighter colour.</p>}
              </FieldSet>}
              <Field><FieldLabel id="language-label">Language</FieldLabel><ToggleGroup variant="outline" className="segmented" aria-labelledby="language-label" value={[settings.language]} onValueChange={([value]) => { if (value === 'en' || value === 'ar' || value === 'both') update('language', value) }}><ToggleGroupItem value="en">English</ToggleGroupItem><ToggleGroupItem value="ar" lang="ar">العربية</ToggleGroupItem><ToggleGroupItem value="both">Both</ToggleGroupItem></ToggleGroup></Field>
              <Field><FieldLabel id="text-size-label">Text size</FieldLabel><ToggleGroup variant="outline" className="segmented" aria-labelledby="text-size-label" value={[settings.textSize]} onValueChange={([value]) => { if (value === 'standard' || value === 'large') update('textSize', value) }}><ToggleGroupItem value="standard">Standard</ToggleGroupItem><ToggleGroupItem value="large">Large</ToggleGroupItem></ToggleGroup><FieldDescription>Large spreads the table across the circle and uses the biggest text that fits.</FieldDescription></Field>
              <FieldGroup><Field><FieldLabel id="time-display-label">Times to show</FieldLabel><ToggleGroup variant="outline" className="segmented" aria-labelledby="time-display-label" value={[settings.timeDisplay]} onValueChange={([value]) => { if (value === 'iqamah' || value === 'adhan' || value === 'both') update('timeDisplay', value) }}><ToggleGroupItem value="iqamah">Iqamah</ToggleGroupItem><ToggleGroupItem value="adhan">Adhan</ToggleGroupItem><ToggleGroupItem value="both">Both</ToggleGroupItem></ToggleGroup></Field><Field><FieldLabel id="clock-label">Clock format</FieldLabel><ToggleGroup variant="outline" className="segmented" aria-labelledby="clock-label" value={[settings.use24Hour ? '24' : '12']} onValueChange={([value]) => { if (value) update('use24Hour', value === '24') }}><ToggleGroupItem value="12">12 hour</ToggleGroupItem><ToggleGroupItem value="24">24 hour</ToggleGroupItem></ToggleGroup></Field></FieldGroup>
              <Field data-invalid={Boolean(logoError)}><FieldLabel id="emblem-label">Top symbol</FieldLabel><ToggleGroup variant="outline" className="segmented" aria-labelledby="emblem-label" value={[settings.emblem]} onValueChange={([value]) => { if (value === 'star' || value === 'logo' || value === 'none') setEmblem(value) }}><ToggleGroupItem value="star">Star</ToggleGroupItem><ToggleGroupItem value="logo">Your logo</ToggleGroupItem><ToggleGroupItem value="none">None</ToggleGroupItem></ToggleGroup>
                <input id="logo-file" type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={uploadLogo} />
                {settings.emblem === 'logo' && settings.logo && <div className="logo-choice"><img src={settings.logo} alt="Your logo" /><Button variant="outline" onClick={() => document.getElementById('logo-file')?.click()}><FileUp data-icon="inline-start" />Change logo</Button></div>}
                {logoError ? <FieldError>{logoError}</FieldError> : <FieldDescription>Shown above the masjid name. A logo with a transparent background looks best.</FieldDescription>}</Field>
              <Field><FieldLabel htmlFor="footer">A small note <span className="optional">Optional</span></FieldLabel><Input id="footer" maxLength={80} placeholder="Please arrive a few minutes early" value={settings.footer} onChange={e => update('footer', e.target.value)} /></Field>
            </FieldGroup>
          </section>
          <section className="editor-section advanced-section" id="calculation-settings"><Accordion value={calculationOpen ? ['location'] : []} onValueChange={value => setCalculationOpen(value.includes('location'))}><AccordionItem value="location"><AccordionTrigger><span className="advanced-title"><LocateFixed aria-hidden="true" /><span>Location & calculation<span>For automatic adhan times</span></span></span></AccordionTrigger><AccordionContent><FieldGroup className="advanced-fields">
            <p className="section-description">Starting settings are North America (ISNA), standard Asr. These are editable defaults, not settings approved by your masjid.</p>
            <Button variant="outline" disabled={locating} onClick={useLocation}>{locating ? <Spinner data-icon="inline-start" role={undefined} aria-label={undefined} aria-hidden /> : <LocateFixed data-icon="inline-start" />}{locating ? 'Finding your location…' : 'Use my device location'}</Button>
            {locationNotice && <p role="status" className="location-status">{locationNotice}</p>}{locationError && <FieldError>{locationError}</FieldError>}
            <FieldGroup className="two-fields"><NumberField id="latitude" label="Latitude" min={-90} max={90} step="any" value={settings.latitude} onChange={value => update('latitude', value)} /><NumberField id="longitude" label="Longitude" min={-180} max={180} step="any" value={settings.longitude} onChange={value => update('longitude', value)} /></FieldGroup>
            <Field data-invalid={errorTarget === 'timezone'}><FieldLabel htmlFor="timezone">Masjid timezone</FieldLabel><Input id="timezone" aria-invalid={errorTarget === 'timezone'} aria-describedby={errorTarget === 'timezone' ? 'timezone-error timezone-help' : 'timezone-help'} placeholder="America/New_York" list="timezones" autoComplete="off" value={settings.timezone} onChange={e => update('timezone', e.target.value)} /><datalist id="timezones">{Intl.supportedValuesOf('timeZone').map(zone => <option key={zone} value={zone} />)}</datalist><FieldDescription id="timezone-help">Use region/city, such as America/New_York for Tampa. Device location fills this automatically; check it matches your masjid.</FieldDescription>{errorTarget === 'timezone' && <FieldError id="timezone-error">{result.error}</FieldError>}</Field>
            <Choice id="method" label="Calculation method" value={settings.method} options={methods} onChange={value => update('method', value)} /><Choice id="madhab" label="Asr convention" value={settings.madhab} options={[{ value: 'standard', label: 'Standard (Shafi‘i, Maliki, Hanbali)' }, { value: 'hanafi', label: 'Hanafi' }]} onChange={value => update('madhab', value)} />
          </FieldGroup></AccordionContent></AccordionItem></Accordion></section>
          <section className="editor-section">
            <div className="editor-heading"><div><h2 id="ai-heading">Make it with an AI</h2><p>Paste this request into ChatGPT, Claude, Gemini or Grok, then attach your timetable photo or type the times. You get back a link to your finished image.</p></div></div>
            <div className="share-actions"><Button variant="outline" onClick={copyAiRequest}><Sparkles data-icon="inline-start" />Copy request for AI</Button></div>
            <p className="share-status" role="status">{aiNotice}</p>
            <Accordion className="settings-text" value={textOpen ? ['text'] : []} onValueChange={value => openText(value.includes('text'))}><AccordionItem value="text"><AccordionTrigger><span className="advanced-title"><Braces aria-hidden="true" /><span>Edit as text<span>Paste or copy the settings</span></span></span></AccordionTrigger><AccordionContent>
              <Field data-invalid={Boolean(textError)}><FieldLabel htmlFor="settings-text" className="sr-only">Settings as text</FieldLabel>
                <Textarea id="settings-text" className="settings-textarea" spellCheck={false} autoComplete="off" aria-invalid={Boolean(textError)} aria-describedby={textError ? 'settings-text-error' : undefined} value={settingsText} onChange={e => { setSettingsText(e.target.value); setTextError('') }} />
                {textError && <FieldError id="settings-text-error">{textError}</FieldError>}
              </Field>
              <div className="share-actions"><Button variant="outline" onClick={copyForAi}><Copy data-icon="inline-start" />Copy for AI</Button><Button onClick={applyText}><Check data-icon="inline-start" />Apply</Button></div>
            </AccordionContent></AccordionItem></Accordion>
          </section>
          <section className="editor-section">
            <div className="editor-heading"><div><h2 id="share-heading">Share or back up</h2><p>Changes save on this browser automatically. To send this design or keep a copy, use a link or a settings file.</p></div></div>
            <div className="share-actions">
              <Button variant="outline" disabled={!result.settings} onClick={copyLink}><Link data-icon="inline-start" />Copy share link</Button>
              <Button variant="outline" disabled={!result.settings} onClick={() => { if (result.settings) { saveSettingsFile(result.settings); setShareError(''); setShareNotice('Settings file saved. Open it here any time to restore this design.') } }}><FileDown data-icon="inline-start" />Save settings file</Button>
              <Button variant="outline" onClick={() => document.getElementById('settings-file')?.click()}><FileUp data-icon="inline-start" />Open settings file</Button>
              <input id="settings-file" type="file" accept="application/json,.json" hidden onChange={openFile} />
            </div>
            <p className={shareError ? 'share-status share-error' : 'share-status'} role="status">{shareError || shareNotice}</p>
          </section>
          <div className="editor-footer"><span className="save-status" role="status"><Clock3 aria-hidden="true" />{editNotice || (saved ? (history.past.length ? 'Saved on this browser' : 'Changes save on this browser') : storageBlocked ? 'Saved data protected' : result.error ? 'Fix settings to save' : 'Not saved yet')}</span><div className="edit-actions"><Button variant="outline" disabled={!history.past.length} onClick={undo} title="Undo (Ctrl/Cmd+Z)" aria-keyshortcuts="Control+Z Meta+Z">Undo</Button><Button variant="outline" disabled={!history.future.length} onClick={redo} title="Redo (Ctrl/Cmd+Shift+Z)" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z">Redo</Button><Button variant="ghost" onClick={reset}><RotateCcw data-icon="inline-start" />Reset</Button></div></div>
        </section>
      </div>
      <p className="sr-only error-announcer" aria-live="polite">{spokenError}</p>
    </main>
    <div className="mobile-download"><div className="mobile-actions"><Button size="lg" variant="outline" aria-pressed={previewPinned} onClick={togglePreview}>Preview</Button><Button size="lg" variant="outline" disabled={!history.past.length} onClick={undo}>Undo</Button><Button size="lg" disabled={!result.settings || exporting} onClick={download}>{exporting ? <Spinner data-icon="inline-start" role={undefined} aria-label={undefined} aria-hidden /> : <ArrowDownToLine data-icon="inline-start" />}{downloadLabel}</Button></div><div className="mobile-feedback"><p role="status">{exportError || result.error || (exporting ? `Preparing a ${1080 * exportScale} × ${1080 * exportScale} PNG…` : downloaded ? 'Image ready. Set it as your WhatsApp group photo.' : editNotice || (saved ? `${history.past.length ? 'Saved on this browser' : 'Changes save on this browser'} · ${1080 * exportScale} × ${1080 * exportScale} PNG` : storageNotice || 'Changes are not saved yet.'))}{result.error && <> <a href={`#${errorTarget}`} onClick={revealError}>Review settings</a></>}</p>{history.future.length > 0 && <Button variant="link" onClick={redo}>Redo</Button>}</div></div>
  </>
}
