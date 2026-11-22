import { useRef, useState, type ChangeEvent } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { readPhotoPalettes, type PhotoPalette } from './photo-palette'

export function PhotoPalettePicker({ isApplied, onApply }: {
  isApplied: (suggestion: PhotoPalette) => boolean
  onApply: (suggestion: PhotoPalette) => void
}) {
  const latest = useRef(0)
  const [suggestions, setSuggestions] = useState<PhotoPalette[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

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
      setStatus(`${next.length === 1 ? 'One palette' : `${next.length} palettes`} found in ${file.name}. Ratios show estimated minimum text contrast.`)
    } catch (problem) {
      if (request !== latest.current) return
      setStatus('')
      setError(problem instanceof Error && !(problem instanceof DOMException)
        ? problem.message
        : 'That photo could not be read. Try another PNG, JPEG or WebP.')
    }
  }

  return <details className="photo-palette">
    <summary>Make a palette from a photo</summary>
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor="palette-photo">Choose a photo or logo</FieldLabel>
      <Input id="palette-photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={readPhoto}
        aria-invalid={Boolean(error)} aria-describedby={error ? 'palette-photo-help palette-photo-error' : 'palette-photo-help'} />
      <FieldDescription id="palette-photo-help">PNG, JPEG or WebP, up to 10 MB. The image stays on your device.</FieldDescription>
      <div className="photo-message" role="alert">{error && <FieldError id="palette-photo-error">{error}</FieldError>}</div>
      <p className="share-status photo-message" role="status">{status}</p>
      {suggestions.length > 0 && <div className="theme-options" role="group" aria-label="Palettes from your photo">
        {suggestions.map((suggestion, index) => {
          const { palette, minimum, main } = suggestion
          const applied = isApplied(suggestion)
          const ratio = (Math.floor(minimum * 10) / 10).toFixed(1)
          return <Button key={main} variant="outline" className="theme-option" aria-pressed={applied}
            data-pressed={applied ? '' : undefined} onClick={() => { if (!applied) onApply(suggestion) }}>
            <span className="theme-swatch" style={{ background: palette.background, color: palette.ink }} aria-hidden="true">
              <strong>Aa</strong>
              <span style={{ background: palette.gold, opacity: 1 }} />
              <span style={{ background: palette.muted, opacity: 1 }} />
            </span>
            <span>Palette {index + 1}</span>
            <span aria-hidden="true">≈{ratio}:1</span>
            <span className="sr-only">Estimated minimum text contrast {ratio} to 1</span>
            <Check className="theme-check size-3" aria-hidden="true" />
          </Button>
        })}
      </div>}
    </Field>
  </details>
}
