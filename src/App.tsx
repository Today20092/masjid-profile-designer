import { useEffect, useMemo, useState } from 'react'
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
import { PRAYERS, MAX_ROWS, type Settings, type PrayerId, type PrayerSetting, type CustomRow } from './model'
import { createDefaults, getDisplayRows, STORAGE_KEY, validateSettings } from './schedule'
import { ProfileArtwork, downloadProfile } from './ProfileArtwork'

function restore() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return { settings: saved ? validateSettings(JSON.parse(saved)) : createDefaults(), notice: '', blocked: false }
  } catch {
    return { settings: createDefaults(), notice: 'Your saved settings could not be read. We opened the starting design and have not replaced your saved data.', blocked: true }
  }
}

function NumberField({ id, label, value, onChange, min, max, step = 1 }: {
  id: string; label: string; value: number; onChange: (value: number) => void; min: number; max: number; step?: number | 'any'
}) {
  const invalid = !Number.isFinite(value) || value < min || value > max || (step !== 'any' && !Number.isInteger(value))
  return <Field data-invalid={invalid}>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Input id={id} type="number" inputMode={step === 'any' ? 'decimal' : 'numeric'} value={Number.isFinite(value) ? value : ''}
      min={min} max={max} step={step} aria-invalid={invalid} onChange={e => onChange(e.target.value === '' ? NaN : e.target.valueAsNumber)} />
    {invalid && <FieldError>Enter a number from {min} to {max}.</FieldError>}
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
const scheduleKeys: (keyof Settings)[] = ['name', 'nameAr', 'location', 'date', 'latitude', 'longitude', 'timezone', 'method', 'madhab', 'customRows']

export default function App() {
  const [initial] = useState(restore)
  const [settings, setSettings] = useState(initial.settings)
  const [storageBlocked, setStorageBlocked] = useState(initial.blocked)
  const [storageNotice, setStorageNotice] = useState(initial.notice)
  const [saved, setSaved] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [downloaded, setDownloaded] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationNotice, setLocationNotice] = useState('')
  const [locationError, setLocationError] = useState('')
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

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSaved(false); setDownloaded(false); setExportError('')
    setSettings(current => ({ ...current, [key]: value, confirmed: scheduleKeys.includes(key) ? false : key === 'confirmed' ? value as boolean : current.confirmed }))
  }
  function prayer(id: PrayerId, patch: Partial<PrayerSetting>) {
    setSaved(false); setDownloaded(false)
    setSettings(current => ({ ...current, confirmed: false, prayers: { ...current.prayers, [id]: { ...current.prayers[id], ...patch } } }))
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
      setSettings(current => ({ ...current, latitude: Number(position.coords.latitude.toFixed(6)), longitude: Number(position.coords.longitude.toFixed(6)), timezone, confirmed: false }))
      setLocating(false)
      setLocationNotice(`Coordinates updated. Timezone is ${timezone}, from your device. Check that it matches the masjid, and update the location label.`)
    }, () => { setLocating(false); setLocationError('Location could not be accessed. Allow location in your browser or enter coordinates below.') }, { timeout: 15000, maximumAge: 300000 })
  }
  function reset() {
    if (!window.confirm('Reset this design and replace your saved settings with the Masjid Abu Bakr starting values?')) return
    setSettings(createDefaults()); setStorageBlocked(false); setStorageNotice(''); setDownloaded(false); setExportError('')
  }

  const downloadLabel = exporting ? 'Preparing your image…' : 'Download PNG'
  return <>
    <header className="masthead">
      <a className="brand" href="#main" aria-label="Masjid Profile Studio home"><span className="brand-mark"><Moon aria-hidden="true" /></span><span>Masjid<span className="brand-subtitle">Profile Studio</span></span></a>
      <span className="privacy-note"><LockKeyhole aria-hidden="true" /><span>Made on your device</span></span>
    </header>
    <main id="main" className="studio-shell">
      <section className="intro" aria-labelledby="page-title"><p className="eyebrow">A LITTLE IMAGE. A SHARED RHYTHM.</p><h1 id="page-title">A clearer way<br className="desktop-break" /> to gather.</h1><p>Your masjid’s prayer times, beautifully in one circle.<br className="desktop-break" /> Make it yours. Share it with your community.</p></section>
      <div className="studio-grid">
        <section className="preview-column" aria-labelledby="preview-title"><div className="preview-sticky">
          <div className="section-topline"><h2 id="preview-title">Your profile image</h2><span className="live-label"><span />Live preview</span></div>
          <div className="preview-stage"><div className="preview-orbit" aria-hidden="true" />
            {result.settings ? <ProfileArtwork settings={result.settings} rows={result.rows} className="main-artwork" /> : <div className="preview-unavailable"><CircleHelp aria-hidden="true" /><p>Complete your settings<br />to see your design.</p></div>}
            <span className="crop-note">DESIGNED TO FIT THE CIRCLE</span>
          </div>
          <div className="whatsapp-example">
            {result.settings && <div className="mini-artwork" aria-hidden="true"><ProfileArtwork settings={result.settings} rows={result.rows} /></div>}
            <div><strong>{settings.name || 'Your masjid'}</strong><p>How your group photo will look</p></div><Check className="example-check" aria-hidden="true" />
          </div><Separator />
          <div className="download-area"><Button size="lg" className="download-button" disabled={!result.settings || exporting} onClick={download}><ArrowDownToLine data-icon="inline-start" />{downloadLabel}</Button><p>1080 × 1080 px · Ready for WhatsApp</p>{downloaded && <p role="status">Image ready. Set it as your WhatsApp group photo.</p>}</div>
          <p className="how-to">Download your image, then open your WhatsApp group → tap the group name → edit its photo.</p>
          {!settings.confirmed && <p className="sample-note"><CircleHelp aria-hidden="true" />Starting iqamah times are samples. Check your timetable below before sharing.</p>}
        </div></section>
        <section className="editor-column" aria-label="Customize your timetable">
          {(storageNotice || result.error || exportError) && <div className="notices">
            {storageNotice && <Alert><CircleHelp /><AlertTitle>Browser storage</AlertTitle><AlertDescription>{storageNotice}{storageBlocked && <Button variant="outline" className="storage-acknowledge" onClick={() => setStorageBlocked(false)}>Use starting design and replace saved data</Button>}</AlertDescription></Alert>}
            {result.error && <Alert variant="destructive"><CircleHelp /><AlertTitle>Check your settings</AlertTitle><AlertDescription>{result.error}</AlertDescription></Alert>}
            {exportError && <Alert variant="destructive"><CircleHelp /><AlertTitle>Download did not finish</AlertTitle><AlertDescription>{exportError}</AlertDescription></Alert>}
          </div>}
          <section className="editor-section" aria-labelledby="identity-heading">
            <div className="editor-heading"><span className="step-number">01</span><div><h2 id="identity-heading">Your masjid</h2><p>A familiar name for your community.</p></div></div>
            <FieldGroup>
              <Field><FieldLabel htmlFor="name">Masjid name</FieldLabel><Input id="name" maxLength={64} value={settings.name} onChange={e => update('name', e.target.value)} /></Field>
              <Field><FieldLabel htmlFor="name-ar">Name in Arabic</FieldLabel><Input id="name-ar" lang="ar" dir="rtl" maxLength={64} value={settings.nameAr} onChange={e => update('nameAr', e.target.value)} /></Field>
              <FieldGroup className="two-fields"><Field><FieldLabel htmlFor="location">Location label</FieldLabel><Input id="location" maxLength={70} value={settings.location} onChange={e => update('location', e.target.value)} /></Field><Field><FieldLabel htmlFor="date">Timetable date</FieldLabel><Input id="date" type="date" min="1900-01-01" max="2100-12-31" value={settings.date} onChange={e => update('date', e.target.value)} /></Field></FieldGroup>
            </FieldGroup>
          </section>
          <section className="editor-section" aria-labelledby="times-heading">
            <div className="editor-heading"><span className="step-number">02</span><div><h2 id="times-heading">Prayer times</h2><p>Your iqamah. Your community’s rhythm.</p></div><span className="row-count">{enabledCount}/{MAX_ROWS} rows</span></div>
            <p className="section-description">Adhan is calculated. Set each iqamah to a clock time or minutes after adhan. Choose the rows to include.</p>
            <FieldSet className="prayer-rows"><FieldLegend className="sr-only">Prayers to display</FieldLegend>
              {PRAYERS.map(item => {
                const row = settings.prayers[item.id]
                const calculated = result.rows.find(display => display.id === item.id)
                return <div className="prayer-editor" key={item.id} data-enabled={row.enabled}>
                  <Field orientation="horizontal" className="prayer-heading"><Checkbox id={`enable-${item.id}`} checked={row.enabled} disabled={!row.enabled && enabledCount >= MAX_ROWS} onCheckedChange={checked => prayer(item.id, { enabled: checked === true })} /><FieldLabel htmlFor={`enable-${item.id}`}><span>{item.en}</span><span lang="ar" dir="rtl" className="prayer-arabic">{item.ar}</span></FieldLabel>{row.enabled && calculated?.adhan && <span className="adhan-value">Adhan {calculated.adhan}</span>}</Field>
                  {row.enabled && <FieldGroup className="prayer-controls">
                    {item.id !== 'sunrise' && <FieldGroup className="two-fields">
                      {item.id !== 'jumuah' && <Choice id={`mode-${item.id}`} label="Iqamah setting" value={row.iqamahMode} onChange={value => prayer(item.id, { iqamahMode: value })} options={[{ value: 'fixed', label: 'Fixed time' }, { value: 'after', label: 'After adhan' }]} />}
                      {row.iqamahMode === 'fixed' || item.id === 'jumuah' ? <Field><FieldLabel htmlFor={`time-${item.id}`}>Iqamah time</FieldLabel><Input id={`time-${item.id}`} type="time" value={row.fixed} onChange={e => prayer(item.id, { fixed: e.target.value })} /></Field> : <NumberField id={`delay-${item.id}`} label="Minutes after adhan" min={0} max={240} value={row.delay} onChange={value => prayer(item.id, { delay: value })} />}
                    </FieldGroup>}
                    {item.id !== 'jumuah' && <Accordion type="single" collapsible><AccordionItem value="adjustment"><AccordionTrigger className="adjust-trigger">Adjust calculated {item.id === 'sunrise' ? 'sunrise' : 'adhan'}{row.adjustment !== 0 ? ` (${row.adjustment > 0 ? '+' : ''}${row.adjustment} min)` : ''}</AccordionTrigger><AccordionContent><NumberField id={`adjust-${item.id}`} label="Minute adjustment (+ or −)" min={-120} max={120} value={row.adjustment} onChange={value => prayer(item.id, { adjustment: value })} /></AccordionContent></AccordionItem></Accordion>}
                  </FieldGroup>}
                </div>
              })}
              {settings.customRows.map(row => <div className="prayer-editor custom-prayer" key={row.id}>
                <Field orientation="horizontal" className="prayer-heading"><Checkbox id={`enable-${row.id}`} checked={row.enabled} disabled={!row.enabled && enabledCount >= MAX_ROWS} onCheckedChange={checked => custom(row.id, { enabled: checked === true })} /><FieldLabel htmlFor={`enable-${row.id}`}>{row.en || 'Custom row'}</FieldLabel><Button variant="ghost" size="icon" aria-label={`Remove ${row.en || 'custom row'}`} onClick={() => update('customRows', settings.customRows.filter(item => item.id !== row.id))}><Trash2 /></Button></Field>
                <FieldGroup className="prayer-controls"><FieldGroup className="two-fields"><Field><FieldLabel htmlFor={`en-${row.id}`}>English label</FieldLabel><Input id={`en-${row.id}`} maxLength={30} value={row.en} onChange={e => custom(row.id, { en: e.target.value })} /></Field><Field><FieldLabel htmlFor={`ar-${row.id}`}>Arabic label</FieldLabel><Input id={`ar-${row.id}`} lang="ar" dir="rtl" maxLength={30} value={row.ar} onChange={e => custom(row.id, { ar: e.target.value })} /></Field></FieldGroup><Field><FieldLabel htmlFor={`custom-time-${row.id}`}>Time</FieldLabel><Input id={`custom-time-${row.id}`} type="time" value={row.time} onChange={e => custom(row.id, { time: e.target.value })} /></Field></FieldGroup>
              </div>)}
            </FieldSet>
            <Button variant="outline" className="add-row" disabled={enabledCount >= MAX_ROWS || settings.customRows.length >= MAX_ROWS} onClick={() => update('customRows', [...settings.customRows, { id: `custom-${crypto.randomUUID()}`, en: 'Additional prayer', ar: 'صلاة إضافية', time: '13:30', enabled: true }])}><Plus data-icon="inline-start" />Add a custom row</Button>
            <Field orientation="horizontal" className="confirm-field"><Checkbox id="confirmed" checked={settings.confirmed} onCheckedChange={checked => update('confirmed', checked === true)} /><div><FieldLabel htmlFor="confirmed">I’ve checked these times for my masjid.</FieldLabel><FieldDescription>This removes the sample label from your image.</FieldDescription></div></Field>
          </section>
          <section className="editor-section" aria-labelledby="appearance-heading">
            <div className="editor-heading"><span className="step-number">03</span><div><h2 id="appearance-heading">Make it feel like home</h2><p>Thoughtful themes. Beautiful in every language.</p></div></div>
            <FieldGroup>
              <Field><FieldLabel id="theme-label">Choose a theme</FieldLabel><ToggleGroup type="single" className="theme-options" aria-labelledby="theme-label" value={settings.theme} onValueChange={value => { if (value === 'emerald' || value === 'midnight' || value === 'ivory') update('theme', value) }}>{(['emerald', 'midnight', 'ivory'] as const).map(theme => <ToggleGroupItem key={theme} value={theme} className="theme-option"><span className={`theme-swatch theme-${theme}`} aria-hidden="true"><Moon /><span /><span /><span /></span><span>{theme === 'emerald' ? 'Emerald' : theme === 'midnight' ? 'Midnight' : 'Ivory'}</span><Check className="theme-check" aria-hidden="true" /></ToggleGroupItem>)}</ToggleGroup></Field>
              <Field><FieldLabel id="language-label">Language</FieldLabel><ToggleGroup type="single" variant="outline" className="segmented" aria-labelledby="language-label" value={settings.language} onValueChange={value => { if (value === 'en' || value === 'ar' || value === 'both') update('language', value) }}><ToggleGroupItem value="en">English</ToggleGroupItem><ToggleGroupItem value="ar" lang="ar">العربية</ToggleGroupItem><ToggleGroupItem value="both">Both</ToggleGroupItem></ToggleGroup></Field>
              <FieldGroup className="two-fields"><Choice id="time-display" label="Times to show" value={settings.timeDisplay} onChange={value => update('timeDisplay', value)} options={[{ value: 'iqamah', label: 'Iqamah only' }, { value: 'adhan', label: 'Adhan only' }, { value: 'both', label: 'Adhan + iqamah' }]} /><Field><FieldLabel id="clock-label">Clock format</FieldLabel><ToggleGroup type="single" variant="outline" className="segmented" aria-labelledby="clock-label" value={settings.use24Hour ? '24' : '12'} onValueChange={value => { if (value) update('use24Hour', value === '24') }}><ToggleGroupItem value="12">12 hour</ToggleGroupItem><ToggleGroupItem value="24">24 hour</ToggleGroupItem></ToggleGroup></Field></FieldGroup>
              <Field><FieldLabel htmlFor="footer">A small note <span className="optional">Optional</span></FieldLabel><Input id="footer" maxLength={80} placeholder="Please arrive a few minutes early" value={settings.footer} onChange={e => update('footer', e.target.value)} /></Field>
            </FieldGroup>
          </section>
          <section className="editor-section advanced-section" aria-label="Location and calculation"><Accordion type="single" collapsible><AccordionItem value="location"><AccordionTrigger><span className="advanced-title"><LocateFixed aria-hidden="true" /><span>Location & calculation<span>For automatic adhan times</span></span></span></AccordionTrigger><AccordionContent><FieldGroup className="advanced-fields">
            <p className="section-description">Starting settings are North America (ISNA), standard Asr. These are editable defaults, not settings approved by your masjid.</p>
            <Button variant="outline" disabled={locating} onClick={useLocation}><LocateFixed data-icon="inline-start" />{locating ? 'Finding your location…' : 'Use my device location'}</Button>
            {locationNotice && <p role="status" className="location-status">{locationNotice}</p>}{locationError && <FieldError>{locationError}</FieldError>}
            <FieldGroup className="two-fields"><NumberField id="latitude" label="Latitude" min={-90} max={90} step="any" value={settings.latitude} onChange={value => update('latitude', value)} /><NumberField id="longitude" label="Longitude" min={-180} max={180} step="any" value={settings.longitude} onChange={value => update('longitude', value)} /></FieldGroup>
            <Field><FieldLabel htmlFor="timezone">Timezone</FieldLabel><Input id="timezone" placeholder="America/New_York" value={settings.timezone} onChange={e => update('timezone', e.target.value)} /><FieldDescription>Use an IANA name, such as America/New_York. Your masjid may be in a different timezone from your device.</FieldDescription></Field>
            <Choice id="method" label="Calculation method" value={settings.method} options={methods} onChange={value => update('method', value)} /><Choice id="madhab" label="Asr convention" value={settings.madhab} options={[{ value: 'standard', label: 'Standard (Shafi‘i, Maliki, Hanbali)' }, { value: 'hanafi', label: 'Hanafi' }]} onChange={value => update('madhab', value)} />
          </FieldGroup></AccordionContent></AccordionItem></Accordion></section>
          <div className="editor-footer"><span className="save-status" role="status"><Clock3 aria-hidden="true" />{saved ? 'Saved on this browser' : storageBlocked ? 'Saved data protected' : result.error ? 'Fix settings to save' : 'Not saved yet'}</span><Button variant="ghost" onClick={reset}><RotateCcw data-icon="inline-start" />Reset</Button></div>
        </section>
      </div>
      <footer className="site-footer"><span>Made for the moments we come together.</span><span>No account. No uploads. Just your community.</span></footer>
    </main>
    <div className="mobile-download"><Button size="lg" disabled={!result.settings || exporting} onClick={download}><ArrowDownToLine data-icon="inline-start" />{downloadLabel}</Button><span>1080 × 1080 · PNG</span></div>
  </>
}
