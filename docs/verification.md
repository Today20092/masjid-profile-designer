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
