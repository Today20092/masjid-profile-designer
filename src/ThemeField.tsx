import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Check, Image as ImageIcon, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { THEME_IDS, type Settings } from './model'
import type { Palette } from './palette'
import { readPhotoPalettes, type PhotoPalette } from './photo-palette'
import { ARTWORK_THEMES } from './ProfileArtwork'

function Swatch({ palette, icon }: { palette: Pick<Palette, 'background' | 'gold'>; icon: ReactNode }) {
  return <span className="theme-swatch" style={{ color: palette.gold, background: palette.background }} aria-hidden="true">{icon}<span /><span /><span /></span>
}

export function ThemeField({ settings, customPalette, onChange, children }: {
  settings: Settings
  customPalette: Palette
  onChange: (patch: Partial<Settings>) => void
  /** Colour pickers, shown while Custom is selected. */
  children: ReactNode
}) {
  const latest = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const [suggestions, setSuggestions] = useState<PhotoPalette[]>([])
  const [chosen, setChosen] = useState<PhotoPalette | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [preferCustom, setPreferCustom] = useState(false)
  // Photo clicked before any palette exists. Keyed to the theme so Undo or another design closes the panel.
  const [waitingOn, setWaitingOn] = useState('')
  const themeKey = `${settings.theme} ${settings.customColor} ${settings.customAccent}`

  const isApplied = ({ main, accent }: PhotoPalette) =>
    settings.theme === 'custom' && settings.customColor === main && settings.customAccent === accent
  const applied = suggestions.find(isApplied)
  const selected = waitingOn === themeKey || (applied && !preferCustom) ? 'photo' : settings.theme
  const shown = applied ?? chosen

  function apply(suggestion: PhotoPalette) {
    setChosen(suggestion)
    setPreferCustom(false)
    setWaitingOn('')
    if (!isApplied(suggestion)) onChange({ theme: 'custom', customColor: suggestion.main, customAccent: suggestion.accent })
  }

  function select(value: string) {
    if (value === 'photo') {
      if (chosen) return apply(chosen)
      setWaitingOn(themeKey)
      fileInput.current?.click()
      return
    }
    const theme = [...THEME_IDS, 'custom' as const].find(theme => theme === value)
    if (!theme) return
    // A photo still being read must not replace the theme picked after it.
    latest.current++
    setStatus('')
    setWaitingOn('')
    setPreferCustom(theme === 'custom')
    if (theme !== settings.theme) onChange({ theme })
  }

  async function readPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const request = ++latest.current
    setError('')
    setStatus('Finding colours…')
    try {
      const next = await readPhotoPalettes(file)
      if (request !== latest.current) return
      setSuggestions(next)
      apply(next[0])
      setStatus(`${next.length === 1 ? 'One palette' : `${next.length} palettes`} found in ${file.name}.`)
    } catch (problem) {
      if (request !== latest.current) return
      setStatus('')
      setError(problem instanceof Error && !(problem instanceof DOMException)
        ? problem.message
        : 'That photo could not be read. Try another PNG, JPEG or WebP.')
    }
  }

  return <>
    <Field>
      <FieldLabel id="theme-label">Choose a theme</FieldLabel>
      <ToggleGroup className="theme-options" aria-labelledby="theme-label" value={[selected]} onValueChange={([value]) => { if (value) select(value) }}>
        {THEME_IDS.map(theme => <ToggleGroupItem key={theme} value={theme} className="theme-option"><span className="theme-swatch timetable-swatch" style={{ background: ARTWORK_THEMES[theme].background, color: ARTWORK_THEMES[theme].ink }} aria-hidden="true"><strong style={{ color: ARTWORK_THEMES[theme].gold }}>PRAYER</strong><span>Fajr <b>6:15</b></span><span>Asr <b>4:30</b></span></span><span>{ARTWORK_THEMES[theme].name}</span><Check className="theme-check" aria-hidden="true" /></ToggleGroupItem>)}
        <ToggleGroupItem value="photo" className="theme-option">
          {shown ? <Swatch palette={shown.palette} icon={<ImageIcon />} /> : <span className="theme-swatch photo-empty" aria-hidden="true"><ImageIcon /></span>}
          <span>Colors from photo</span><Check className="theme-check" aria-hidden="true" />
        </ToggleGroupItem>
        <ToggleGroupItem value="custom" className="theme-option"><Swatch palette={customPalette} icon={<Pencil />} /><span>Custom</span><Check className="theme-check" aria-hidden="true" /></ToggleGroupItem>
      </ToggleGroup>
      <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={readPhoto} hidden />
    </Field>
    {selected === 'photo' && <Field className="photo-palette" data-invalid={Boolean(error)}>
      <Button type="button" variant="outline" size="lg" className="photo-choose-button"
        aria-describedby={error ? 'palette-photo-help palette-photo-error' : 'palette-photo-help'}
        onClick={() => fileInput.current?.click()}>
        {suggestions.length ? 'Choose another photo' : 'Choose a photo or logo'}
      </Button>
      <FieldDescription id="palette-photo-help">PNG, JPEG or WebP, up to 10 MB. The image stays on your device.</FieldDescription>
      <div className="photo-message" role="alert">{error && <FieldError id="palette-photo-error">{error}</FieldError>}</div>
      <p className="share-status photo-message" role="status">{status}</p>
      {suggestions.length > 0 && <div className="theme-options" role="group" aria-label="Palettes from your photo">
        {suggestions.map((suggestion, index) => {
          const { palette, main } = suggestion
          const pressed = isApplied(suggestion)
          return <Button key={main} variant="outline" className="theme-option" aria-pressed={pressed}
            data-pressed={pressed ? '' : undefined} onClick={() => apply(suggestion)}>
            <span className="theme-swatch" style={{ background: palette.background, color: palette.ink }} aria-hidden="true">
              <strong>Aa</strong>
              <span style={{ background: palette.gold, opacity: 1 }} />
              <span style={{ background: palette.muted, opacity: 1 }} />
            </span>
            <span>Palette {index + 1}</span>
            <Check className="theme-check size-3" aria-hidden="true" />
          </Button>
        })}
      </div>}
    </Field>}
    {selected === 'custom' && children}
  </>
}
