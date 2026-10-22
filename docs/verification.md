# Release verification

Checked October 21, 2026, against the first implementation specification.

## Checks completed

- TypeScript check and production build.
- Focused schedule assertions covering fixed/delayed iqamah, adjustments, date changes, clock formats, timezone independence, custom rows, malformed settings, and unavailable polar calculations.
- Headless Microsoft Edge browser at phone and desktop widths. No horizontal overflow at 320, 360, 390, 700, or 1440px, including a narrow layout with enlarged root text. Inputs use 16px text and primary controls have at least 44px height.
- Actual PNG download with the PNG signature and 1080 by 1080 dimensions checked.
- Saved settings survive reload; schedule edits clear confirmation; theme/language/column controls and custom row editing work.
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
