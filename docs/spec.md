# Implementation specification

The user authorized implementation of all wayfinder tickets and public GitHub Pages deployment on October 21, 2026. This supersedes the earlier planning-only scope and one-ticket-per-session limit. Use a local Markdown tracker; no remote issue tracker is required to complete this work.

## Core workflow

Maintain a masjid schedule, preview it inside a circle, download a 1080 by 1080 PNG, and manually replace the WhatsApp group profile photo. WhatsApp is the publishing channel. No online current iqamah timetable is required. No automatic WhatsApp integration.

## Schedule and defaults

- Default Masjid Abu Bakr / مسجد أبو بكر in Tampa, 11010 N 30th St, with approximate coordinates 28.048619, -82.426613 and America/New_York timezone. Coordinates are from the address-matched public listing, not a survey.
- Use adhan's NorthAmerica method and standard Asr as editable starting settings, never claim the masjid approved them.
- The reference image's fixed iqamah values are editable sample values, not certified current times. Mark unconfirmed exports as sample until the maintainer confirms the schedule.
- Automatic adhan for chosen location, date, timezone, method, Asr convention, and per-prayer minute adjustments.
- Each iqamah can be a fixed clock time or delay after adjusted adhan. Maghrib defaults to seven minutes after calculated sunset. Jumu‘ah is a manually specified fixed time; sunrise has no iqamah.
- Date changes recalculate adhan and delayed iqamah, preserving fixed iqamah.
- Include/exclude any built-in row and add a custom labelled fixed-time row. At most eight enabled rows to protect legibility.
- English, Arabic, bilingual, 12-hour and 24-hour display, adhan/iqamah/both columns.
- Any masjid can be entered by name and coordinates, with device location as a convenience if available. Timezone must remain explicit and editable.
- Save valid settings locally on this browser. Handle unavailable storage and malformed saved data with useful feedback and safe defaults. Provide reset with confirmation. Never send saved timetable content to a server.

## Mobile-first editor

- React, Vite, TypeScript, Tailwind CSS, selected shadcn/ui controls.
- Design for 360px wide phones first, with no horizontal page overflow, labelled fields, readable Arabic, touch targets about 44px, keyboard focus, and accessible error messages.
- Preview first, short grouped editor sections underneath on phones. On larger screens, show editor and preview side by side. Keep download accessible while editing without covering fields or the on-screen keyboard.
- Three polished preset artwork themes: emerald, midnight, ivory. Future customization uses theme tokens separated from schedule data; do not build arbitrary color/font/logo controls now.
- Circular boundary with generous inset, readable rows and names, optional footer, and a small circular WhatsApp-size preview. The PNG and main preview use the same drawing implementation and locally bundled fonts.
- Canvas export with Arabic shaping, fixed 1080px dimensions independent of device pixel ratio. Show an error if download fails and prevent export when settings are invalid.

## Verification and release

The user asked to keep testing simple rather than negotiate test boundaries. Use focused behavior checks of schedule math, invalid saved settings, and a real mobile browser smoke check including PNG export. No broad test framework or exhaustive UI suite is required.

Create a public GitHub repository, deploy through GitHub Actions to GitHub Pages, verify the live site, and provide concise README setup/use guidance plus linked technical details. Never publish the supplied WhatsApp screenshots or personal conversation attachments.

## Shared implementation interfaces

- `src/model.ts` defines the shared settings and row types.
- `src/schedule.ts` exports `createDefaults(): Settings`, `validateSettings(value: unknown): Settings`, and `getDisplayRows(settings: Settings): DisplayRow[]`. Validation throws a readable Error for invalid settings. `createDefaults` uses the current Tampa date. `getDisplayRows` throws for invalid/unavailable calculations. Export `STORAGE_KEY` as the browser storage key.
- `src/ProfileArtwork.tsx` exports `ProfileArtwork({ settings, rows, className? })` and `downloadProfile(settings, rows): Promise<void>`. Both use the same canvas drawing. Use the language and timeDisplay settings to select columns. Canvas accessible name: "Prayer timetable preview". Export filename: `masjid-profile-YYYY-MM-DD.png`.
- `src/App.tsx` owns the editor, calls schedule validation/calculation, and renders ProfileArtwork. It saves validated settings, reports storage/calculation/export errors, and disables export for invalid form values.
