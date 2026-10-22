import { useEffect, useMemo, useReducer, useState } from 'react'
import { ArrowDownToLine, Check, CircleHelp, Clock3, LocateFixed, LockKeyhole, Moon, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { PRAYERS, MAX_ROWS, THEME_IDS, type Settings, type PrayerId, type PrayerSetting, type CustomRow } from './model'
import { createDefaults, getDisplayRows, STORAGE_KEY, validateSettings } from './schedule'
import { ARTWORK_THEMES, ProfileArtwork, downloadProfile } from './ProfileArtwork'

function restore() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return { settings: saved ? validateSettings(JSON.parse(saved)) : createDefaults(), notice: '', blocked: false }
  } catch {
    return { settings: createDefaults(), notice: 'Your saved settings could not be read. We opened the starting design and have not replaced your saved data.', blocked: true }
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
    <Select value={value} onValueChange={next => { const option = options.find(item => item.value === next); if (option) onChange(option.value) }}>
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
  const [locating, setLocating] = useState(false)
  const [locationNotice, setLocationNotice] = useState('')
  const [locationError, setLocationError] = useState('')
  const [calculationOpen, setCalculationOpen] = useState(false)
  const [editNotice, setEditNotice] = useState('')
  const [previewPinned, setPreviewPinned] = useState(false)
  const [fitWarning, setFitWarning] = useState(false)
  const result = useMemo(() => {
    try {
      const valid = validateSettings(settings)
      return { settings: valid, rows: getDisplayRows(valid), error: '' }
    } catch (error) { return { settings: null, rows: [], error: error instanceof Error ? error.message : 'Please check your settings.' } }
  }, [settings])

  useEffect(() => {
    setSaved(false)
    if (storageBlocked || !result.settings) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(result.settings)); setSaved(true); setStorageNotice('') }
    catch { setStorageNotice('This browser cannot save your settings. You can still edit and download your image; keep this page open to retain your changes.') }
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
  const enabledCount = PRAYERS.filter(item => settings.prayers[item.id].enabled).length + settings.customRows.filter(row => row.enabled).length

  async function download() {
    if (!result.settings || exporting) return
    setExporting(true); setExportError(''); setDownloaded(false)
    try { await downloadProfile(result.settings, result.rows); setDownloaded(true) }
    catch (error) { setExportError(error instanceof Error ? error.message : 'The image could not be downloaded. Please try again.') }
    finally { setExporting(false) }
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
    if (!window.confirm('Reset this design and replace your saved settings with the Masjid Abu Bakr starting values?')) return
    setSettings(createDefaults()); setStorageBlocked(false); setStorageNotice(''); setDownloaded(false); setExportError('')
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

  const errorPrayer = PRAYERS.find(item => result.error.startsWith(`${item.en} fixed time`))
  const errorTarget = /timezone/i.test(result.error) ? 'timezone' : /latitude/i.test(result.error) ? 'latitude' : /longitude/i.test(result.error) ? 'longitude' : /date/i.test(result.error) ? 'date' : /masjid name/i.test(result.error) ? 'name' : errorPrayer ? `time-${errorPrayer.id}` : 'settings-errors'
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
      <section className="intro" aria-labelledby="page-title"><h1 id="page-title">Your masjid’s prayer times.</h1><p>Edit your timetable, choose a design, and download your group photo.</p><nav className="studio-shortcuts" aria-label="Timetable sections"><Button asChild variant="outline"><a href="#times-heading">Edit times</a></Button><Button asChild variant="outline"><a href="#appearance-heading">Choose design</a></Button></nav></section>
      <div className="studio-grid">
        <section className="preview-column" aria-labelledby="preview-title"><div className="preview-sticky">
          <div className="section-topline"><h2 id="preview-title" tabIndex={-1}>Your profile image</h2><span className="live-label"><span />Live preview</span></div>
          <div className="preview-stage"><div className="preview-orbit" aria-hidden="true" />
            {result.settings ? <ProfileArtwork settings={result.settings} rows={result.rows} className="main-artwork" onFitWarning={setFitWarning} /> : <div className="preview-unavailable"><CircleHelp aria-hidden="true" /><p>Complete your settings<br />to see your design.</p></div>}
            <span className="crop-note">DESIGNED TO FIT THE CIRCLE</span>
          </div>
          {fitWarning && <p className="fit-warning" role="status">Some text was reduced to fit. Shorten labels, show fewer rows, or use one time column for clearer text.</p>}
          <div className="whatsapp-example">
            {result.settings && <div className="mini-artwork" aria-hidden="true"><ProfileArtwork settings={result.settings} rows={result.rows} /></div>}
            <div><strong>{settings.name || 'Your masjid'}</strong><p>Open the group photo to read the timetable.</p></div><Check className="example-check" aria-hidden="true" />
          </div><Separator />
          <div className="download-area"><Button size="lg" className="download-button" disabled={!result.settings || exporting} onClick={download}><ArrowDownToLine data-icon="inline-start" />{downloadLabel}</Button><p>1080 × 1080 px · Ready for WhatsApp</p>{(result.error || exportError) && <p><a href={`#${errorTarget}`} onClick={revealError}>{result.error || exportError} Review settings.</a></p>}{downloaded && <p role="status">Image ready. Set it as your WhatsApp group photo.</p>}</div>
          <p className="how-to">Download your image, then open your WhatsApp group → tap the group name → edit its photo.</p>
        </div></section>
        <section className="editor-column" aria-label="Customize your timetable">
          {previewPinned && <aside className="mobile-edit-preview" id="editing-preview" aria-label="Preview while editing"><div className="editing-artwork" aria-hidden="true">{result.settings ? <ProfileArtwork settings={result.settings} rows={result.rows} /> : <p>Fix your settings to see the preview.</p>}</div><div><strong>Live preview</strong><p>Your changes appear here.</p><Button asChild variant="link"><a href="#preview-title" onClick={() => setPreviewPinned(false)}>Full image</a></Button><Button variant="outline" onClick={() => setPreviewPinned(false)}>Close preview</Button></div></aside>}
          {(storageNotice || result.error || exportError) && <div className="notices" id="settings-errors" tabIndex={-1}>
            {storageNotice && <Alert><CircleHelp /><AlertTitle>Browser storage</AlertTitle><AlertDescription>{storageNotice}{storageBlocked && <Button variant="outline" className="storage-acknowledge" onClick={() => setStorageBlocked(false)}>Use starting design and replace saved data</Button>}</AlertDescription></Alert>}
            {result.error && <Alert variant="destructive"><CircleHelp /><AlertTitle>Check your settings</AlertTitle><AlertDescription>{result.error}</AlertDescription></Alert>}
            {exportError && <Alert variant="destructive"><CircleHelp /><AlertTitle>Download did not finish</AlertTitle><AlertDescription>{exportError}</AlertDescription></Alert>}
          </div>}
          <section className="editor-section" aria-labelledby="identity-heading">
            <div className="editor-heading"><div><h2 id="identity-heading">Your masjid</h2><p>A familiar name for your community.</p></div></div>
            <FieldGroup>
              <Field data-invalid={!settings.name.trim()}><FieldLabel htmlFor="name">Masjid name</FieldLabel><Input id="name" required aria-invalid={!settings.name.trim()} aria-describedby={!settings.name.trim() ? 'name-error' : undefined} maxLength={64} value={settings.name} onChange={e => update('name', e.target.value)} />{!settings.name.trim() && <FieldError id="name-error">Enter your masjid’s name.</FieldError>}</Field>
              <Field><FieldLabel htmlFor="name-ar">Name in Arabic</FieldLabel><Input id="name-ar" lang="ar" dir="rtl" maxLength={64} value={settings.nameAr} onChange={e => update('nameAr', e.target.value)} /></Field>
              <FieldGroup className="two-fields"><Field><FieldLabel htmlFor="location">Location label</FieldLabel><Input id="location" aria-describedby="location-label-help" maxLength={70} value={settings.location} onChange={e => update('location', e.target.value)} /><FieldDescription id="location-label-help">Image text only. It does not change calculated times.</FieldDescription></Field><Field><FieldLabel htmlFor="date">Timetable date</FieldLabel><Input id="date" required aria-invalid={errorTarget === 'date'} aria-describedby={errorTarget === 'date' ? 'date-error' : undefined} type="date" min="1900-01-01" max="2100-12-31" value={settings.date} onChange={e => update('date', e.target.value)} />{errorTarget === 'date' && <FieldError id="date-error">{result.error}</FieldError>}</Field></FieldGroup>
            </FieldGroup>
          </section>
          <section className="editor-section" aria-labelledby="times-heading">
            <div className="editor-heading"><div><h2 id="times-heading" tabIndex={-1}>Prayer times</h2><p>Your iqamah. Your community’s rhythm.</p></div><span className="row-count">{enabledCount}/{MAX_ROWS} rows</span></div>
            <p className="section-description">Edit iqamah times below. Open a prayer’s options for delays and adhan adjustments.</p>
            <div className="calculation-summary"><p>Adhan is calculated. Confirm the location and method, and use your masjid’s iqamah times.</p><Button asChild variant="link"><a href="#calculation-settings" onClick={() => setCalculationOpen(true)}>Review calculation settings</a></Button></div>
            <FieldSet className="prayer-rows"><FieldLegend className="sr-only">Prayers to display</FieldLegend>
              {PRAYERS.map(item => {
                const row = settings.prayers[item.id]
                const calculated = result.rows.find(display => display.id === item.id)
                return <Accordion type="single" collapsible className="prayer-editor" key={item.id} data-enabled={row.enabled}><AccordionItem value="options" className="border-0">
                  <div className="prayer-main">
                    <Field orientation="horizontal" className="prayer-heading"><Checkbox id={`enable-${item.id}`} checked={row.enabled} disabled={!row.enabled && enabledCount >= MAX_ROWS} onCheckedChange={checked => prayer(item.id, { enabled: checked === true })} /><FieldLabel htmlFor={`enable-${item.id}`}><span className="prayer-name">{item.en}<span lang="ar" dir="rtl" className="prayer-arabic">{item.ar}</span></span></FieldLabel></Field>
                    {row.enabled && <div className="compact-value">
                      {item.id === 'sunrise' ? <output aria-label="Calculated sunrise">{calculated?.adhan || '—'}</output> : row.iqamahMode === 'fixed' || item.id === 'jumuah' ? <Field><FieldLabel htmlFor={`time-${item.id}`} className="sr-only">{item.en} iqamah time</FieldLabel><Input id={`time-${item.id}`} type="time" required aria-invalid={!row.fixed} aria-describedby={!row.fixed ? `time-${item.id}-error` : undefined} value={row.fixed} onChange={e => prayer(item.id, { fixed: e.target.value })} />{!row.fixed && <FieldError id={`time-${item.id}-error`}>Enter an iqamah time.</FieldError>}</Field> : <><NumberField id={`delay-${item.id}`} label={`${item.en} minutes after adhan`} compact min={0} max={240} value={row.delay} onChange={value => prayer(item.id, { delay: value })} /><span className="delay-unit">min after adhan</span></>}
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
              {settings.customRows.map(row => <div className="prayer-editor custom-prayer" key={row.id}>
                <Field orientation="horizontal" className="prayer-heading"><Checkbox id={`enable-${row.id}`} checked={row.enabled} disabled={!row.enabled && enabledCount >= MAX_ROWS} onCheckedChange={checked => custom(row.id, { enabled: checked === true })} /><FieldLabel htmlFor={`enable-${row.id}`}>{row.en || 'Custom row'}</FieldLabel><Button variant="ghost" size="icon" aria-label={`Remove ${row.en || 'custom row'}`} onClick={() => update('customRows', settings.customRows.filter(item => item.id !== row.id))}><Trash2 /></Button></Field>
                <FieldGroup className="prayer-controls"><FieldGroup className="two-fields"><Field><FieldLabel htmlFor={`en-${row.id}`}>English label</FieldLabel><Input id={`en-${row.id}`} maxLength={30} value={row.en} onChange={e => custom(row.id, { en: e.target.value })} /></Field><Field><FieldLabel htmlFor={`ar-${row.id}`}>Arabic label</FieldLabel><Input id={`ar-${row.id}`} lang="ar" dir="rtl" maxLength={30} value={row.ar} onChange={e => custom(row.id, { ar: e.target.value })} /></Field></FieldGroup><Field><FieldLabel htmlFor={`custom-time-${row.id}`}>Time</FieldLabel><Input id={`custom-time-${row.id}`} type="time" required aria-invalid={!row.time} aria-describedby={!row.time ? `custom-time-${row.id}-error` : undefined} value={row.time} onChange={e => custom(row.id, { time: e.target.value })} />{!row.time && <FieldError id={`custom-time-${row.id}-error`}>Enter a time for this row.</FieldError>}</Field></FieldGroup>
              </div>)}
            </FieldSet>
            <Button variant="outline" className="add-row" disabled={enabledCount >= MAX_ROWS || settings.customRows.length >= MAX_ROWS} onClick={() => update('customRows', [...settings.customRows, { id: `custom-${crypto.randomUUID()}`, en: 'Additional prayer', ar: 'صلاة إضافية', time: '13:30', enabled: true }])}><Plus data-icon="inline-start" />Add a custom row</Button>
          </section>
          <section className="editor-section" aria-labelledby="appearance-heading">
            <div className="editor-heading"><div><h2 id="appearance-heading" tabIndex={-1}>Make it feel like home</h2><p>Choose a theme, language, and readable text size.</p></div></div>
            <FieldGroup>
              <Field><FieldLabel id="theme-label">Choose a theme</FieldLabel><ToggleGroup type="single" className="theme-options" aria-labelledby="theme-label" value={settings.theme} onValueChange={value => { const theme = THEME_IDS.find(theme => theme === value); if (theme) update('theme', theme) }}>{THEME_IDS.map(theme => <ToggleGroupItem key={theme} value={theme} className="theme-option"><span className="theme-swatch" style={{ color: ARTWORK_THEMES[theme].gold, background: ARTWORK_THEMES[theme].background }} aria-hidden="true"><Moon /><span /><span /><span /></span><span>{ARTWORK_THEMES[theme].name}</span><Check className="theme-check" aria-hidden="true" /></ToggleGroupItem>)}</ToggleGroup></Field>
              <Field><FieldLabel id="language-label">Language</FieldLabel><ToggleGroup type="single" variant="outline" className="segmented" aria-labelledby="language-label" value={settings.language} onValueChange={value => { if (value === 'en' || value === 'ar' || value === 'both') update('language', value) }}><ToggleGroupItem value="en">English</ToggleGroupItem><ToggleGroupItem value="ar" lang="ar">العربية</ToggleGroupItem><ToggleGroupItem value="both">Both</ToggleGroupItem></ToggleGroup></Field>
              <Field><FieldLabel id="text-size-label">Prayer text size</FieldLabel><ToggleGroup type="single" variant="outline" className="segmented" aria-labelledby="text-size-label" value={settings.textSize} onValueChange={value => { if (value === 'standard' || value === 'large' || value === 'extra') update('textSize', value) }}><ToggleGroupItem value="standard">Standard</ToggleGroupItem><ToggleGroupItem value="large">Large</ToggleGroupItem><ToggleGroupItem value="extra">Extra large</ToggleGroupItem></ToggleGroup><FieldDescription>Prayer names and times grow together. Long text fits automatically inside the circle.</FieldDescription></Field>
              <FieldGroup className="two-fields"><Choice id="time-display" label="Times to show" value={settings.timeDisplay} onChange={value => update('timeDisplay', value)} options={[{ value: 'iqamah', label: 'Iqamah only' }, { value: 'adhan', label: 'Adhan only' }, { value: 'both', label: 'Adhan + iqamah' }]} /><Field><FieldLabel id="clock-label">Clock format</FieldLabel><ToggleGroup type="single" variant="outline" className="segmented" aria-labelledby="clock-label" value={settings.use24Hour ? '24' : '12'} onValueChange={value => { if (value) update('use24Hour', value === '24') }}><ToggleGroupItem value="12">12 hour</ToggleGroupItem><ToggleGroupItem value="24">24 hour</ToggleGroupItem></ToggleGroup></Field></FieldGroup>
              <Field><FieldLabel htmlFor="footer">A small note <span className="optional">Optional</span></FieldLabel><Input id="footer" maxLength={80} placeholder="Please arrive a few minutes early" value={settings.footer} onChange={e => update('footer', e.target.value)} /></Field>
            </FieldGroup>
          </section>
          <section className="editor-section advanced-section" id="calculation-settings" aria-label="Location and calculation"><Accordion type="single" collapsible value={calculationOpen ? 'location' : ''} onValueChange={value => setCalculationOpen(value === 'location')}><AccordionItem value="location"><AccordionTrigger><span className="advanced-title"><LocateFixed aria-hidden="true" /><span>Location & calculation<span>For automatic adhan times</span></span></span></AccordionTrigger><AccordionContent><FieldGroup className="advanced-fields">
            <p className="section-description">Starting settings are North America (ISNA), standard Asr. These are editable defaults, not settings approved by your masjid.</p>
            <Button variant="outline" disabled={locating} onClick={useLocation}><LocateFixed data-icon="inline-start" />{locating ? 'Finding your location…' : 'Use my device location'}</Button>
            {locationNotice && <p role="status" className="location-status">{locationNotice}</p>}{locationError && <FieldError>{locationError}</FieldError>}
            <FieldGroup className="two-fields"><NumberField id="latitude" label="Latitude" min={-90} max={90} step="any" value={settings.latitude} onChange={value => update('latitude', value)} /><NumberField id="longitude" label="Longitude" min={-180} max={180} step="any" value={settings.longitude} onChange={value => update('longitude', value)} /></FieldGroup>
            <Field data-invalid={errorTarget === 'timezone'}><FieldLabel htmlFor="timezone">Masjid timezone</FieldLabel><Input id="timezone" aria-invalid={errorTarget === 'timezone'} aria-describedby={errorTarget === 'timezone' ? 'timezone-error timezone-help' : 'timezone-help'} placeholder="America/New_York" value={settings.timezone} onChange={e => update('timezone', e.target.value)} /><FieldDescription id="timezone-help">Use region/city, such as America/New_York for Tampa. Device location fills this automatically; check it matches your masjid.</FieldDescription>{errorTarget === 'timezone' && <FieldError id="timezone-error">{result.error}</FieldError>}</Field>
            <Choice id="method" label="Calculation method" value={settings.method} options={methods} onChange={value => update('method', value)} /><Choice id="madhab" label="Asr convention" value={settings.madhab} options={[{ value: 'standard', label: 'Standard (Shafi‘i, Maliki, Hanbali)' }, { value: 'hanafi', label: 'Hanafi' }]} onChange={value => update('madhab', value)} />
          </FieldGroup></AccordionContent></AccordionItem></Accordion></section>
          <div className="editor-footer"><span className="save-status" role="status"><Clock3 aria-hidden="true" />{editNotice || (saved ? 'Saved on this browser' : storageBlocked ? 'Saved data protected' : result.error ? 'Fix settings to save' : 'Not saved yet')}</span><div className="edit-actions"><Button variant="outline" disabled={!history.past.length} onClick={undo}>Undo</Button><Button variant="outline" disabled={!history.future.length} onClick={redo}>Redo</Button><Button variant="ghost" onClick={reset}><RotateCcw data-icon="inline-start" />Reset</Button></div></div>
          <p className="history-help">Keyboard: Ctrl/Cmd+Z to undo; Ctrl/Cmd+Shift+Z to redo. Text fields keep their normal editing shortcuts.</p>
        </section>
      </div>
      <footer className="site-footer"><span>Made for the moments we come together.</span><span>No account. No uploads. Just your community.</span></footer>
    </main>
    <div className="mobile-download"><div className="mobile-actions"><Button size="lg" variant="outline" aria-pressed={previewPinned} onClick={togglePreview}>Preview</Button><Button className="undo-button" variant="outline" disabled={!history.past.length} onClick={undo}>Undo</Button><Button size="lg" disabled={!result.settings || exporting} onClick={download}><ArrowDownToLine data-icon="inline-start" />{downloadLabel}</Button></div><div className="mobile-feedback"><p role="status">{exportError || result.error || (exporting ? 'Preparing a 1080 × 1080 PNG…' : downloaded ? 'Image ready. Set it as your WhatsApp group photo.' : editNotice || (saved ? 'Saved on this browser · 1080 × 1080 PNG' : storageNotice || 'Changes are not saved yet.'))}{result.error && <> <a href={`#${errorTarget}`} onClick={revealError}>Review settings</a></>}</p>{history.future.length > 0 && <Button variant="link" onClick={redo}>Redo</Button>}</div></div>
  </>
}
