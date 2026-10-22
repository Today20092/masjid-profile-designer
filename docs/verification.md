# Release verification

Checked October 21, 2026, against the first implementation specification.

## Checks completed

- TypeScript check and production build.
- Focused schedule assertions covering fixed/delayed iqamah, adjustments, date changes, clock formats, timezone independence, custom rows, malformed settings, and unavailable polar calculations.
- Headless Microsoft Edge browser at phone and desktop widths. No horizontal overflow at 320, 360, 390, 700, or 1440px, including a narrow layout with enlarged root text. Inputs use 16px text and primary controls have at least 44px height.
- Actual PNG download with the PNG signature and 1080 by 1080 dimensions checked.
- Saved settings survive reload; theme/language/column controls and custom row editing work.
- Invalid numeric input disables export. Malformed browser data remains intact until the user explicitly replaces it. Blocked storage leaves editing and export available.
- Device-location success handling was checked with simulated coordinates. The real browser's location-permission failure produced a recoverable message.
- The main canvas exposes a separate accessible timetable description. The miniature preview is hidden from accessibility APIs.
- Dependency audit reports zero vulnerabilities. Markdown file links resolve; README badge image URLs return valid SVG images.
- [GitHub Actions build and deploy](https://github.com/Today20092/masjid-profile-designer/actions/runs/39708172620) both succeeded. The [live Pages site](https://today20092.github.io/masjid-profile-designer/) passed the 360px layout/runtime check and downloaded a valid 1080px PNG with its deployed fonts.

## Standards review

The review found one accessibility defect: a generic canvas accessible name hid the fallback timetable text. The fix adds an external description containing the masjid, date, and selected prayer times, and hides the duplicate miniature from assistive technology.

No material terminology, component-composition, error-handling, or unnecessary-abstraction violations were reported.

## Specification review

The review found one rendering defect: a custom Arabic-only label was copied into both language fields and could appear twice. The fix preserves the original language fields and avoids a duplicate secondary label. Input length and numeric limits now match the validator.

No missing core requirements or unrequested features were reported. Both review findings were fixed before deployment.

## Limits

The checks used an emulated phone viewport, not a physical phone or a screen-reader session. Browser and operating-system download behavior can differ. The masjid's current iqamah times and preferred calculation settings were not certified; maintainers enter and confirm their own schedule. Exported images are static.

## Relative wording and compact editor update

- Delayed iqamah can display minutes after adhan instead of a clock time. Checks cover changed delays and dates, fixed/clock fallback, old saved settings without the new flag, and invalid flag values.
- Browser checks cover the relative-wording toggle, save/reload, Arabic and bilingual output, and two time columns. The preview and downloaded PNG use the same wording.
- At a 360px viewport, the collapsed prayer section is 858px high, down from 1509px. Prayer options expand individually; time inputs stay visible. Layout and export checks passed at 320, 360, 390, 700, and 1440px.
- pnpm 12.14.0 replaces npm. The imported lockfile keeps the dependency set, with Vite 8.3.4 and lucide-react 1.60.0 pinned to satisfy pnpm's 24-hour minimum release age. Frozen-lockfile installation, schedule checks, production build, and dependency audit passed.

## Clean exports by default

The user requested removing the sample label. The watermark, sample notice, confirmation checkbox, and confirmation state are removed. Existing saved settings remain compatible; their old confirmation field is ignored.

## Prayer text size presets

Standard, Large, and Extra large are saved with the design and applied to both previews and exports. Browser checks measured the default clock text at 45px, 53.1px, and 60.75px respectively. They also covered saved-state restoration, PNG download, eight rows, Arabic, two time columns, and measured text bounds inside the circular crop. Older saved designs default to Standard.

## Impeccable typography, palettes, and workflow follow-up

The typography pass gives clock numerals greater emphasis and AM/PM a smaller supporting role. Measured six-row English numeral sizes are now 56px, 66.08px, and approximately 70.25px, subject to width and row-spacing limits. Arabic secondary labels use the existing bold face, and bilingual baselines follow the available row gap. A measured-bounds browser check covered 36 language/size/row-count/column combinations without text collisions or text outside the safe circle, plus a 200% zoom layout check.

Plum, Rose, and Charcoal join the three original themes. All six were selected, restored after reload, and produced distinct rendered images. New palette text contrast was calculated against both surface endpoints before browser inspection.

Workflow checks covered early editing links, opening calculation settings from visible guidance, field-linked numeric errors, multiple undo steps, restoring a removed custom row, the mobile preview link, PNG success feedback beside the action, and responsive action buttons at 320–1440px. The undo history is limited to the current tab session and is not persisted.

The follow-up adds an optional sticky preview while editing, groups typing into one history step per field visit, supports redo, and links error recovery to the affected input. Browser assertions confirmed live preview pixels change after a time edit, typing coalesces into one undo step, redo restores it, new edits clear redo, and long names trigger the fitting warning while short names clear it. Ivory's muted text and accent were darkened after the independent palette review found insufficient small-text contrast.

## Stable controls and dropdowns

Opening the shared dropdown previously scaled its contents from 95%, moving text sideways by approximately 11px. Frame-by-frame browser assertions reproduced that movement before replacing zoom/slide effects with a stationary fade. Shared buttons no longer translate downward while pressed.

Classic-scrollbar testing also reproduced a 16px widening of the fixed action bar and a 29px page-scroll nudge when a dropdown closed near the bottom. Reserving the root scrollbar gutter and avoiding duplicate scroll-lock compensation keeps the document and fixed controls at a consistent width. Browsers without gutter support retain fixed-bar scrollbar compensation.

Regression checks cover all eight dropdowns opening and closing at 320, 360, 690, 700, 900, and 1280px, with conventional scrollbars and hidden scrollbars. Measurements include popup frames, page sections, preview, and fixed action bar. Theme selection and held button presses are checked for movement as well. Narrow layouts fit the available content width rather than forcing a 320px body inside a reserved gutter; the two-column editor starts at 900px to leave enough room for prayer labels and time controls. Intentional accordion expansion and changes to the preview image remain part of normal editing.
