# Development and deployment

## Commands

Use Node.js 24 or later and npm. Commit `package-lock.json` with dependency changes.

```sh
npm ci
npm run dev
npm run check
npm run check:schedule
npm run build
npm run preview
```

`check:schedule` runs a small assertion-based behavior check. It is not a comprehensive test suite. Check a phone-width browser, Arabic rendering, keyboard focus, saved state, and PNG export after changes to the editor or renderer.

## Code

- `src/model.ts`: shared timetable settings and display-row types.
- `src/schedule.ts`: defaults, saved-data validation, adhan calculation, iqamah resolution, and formatted rows.
- `src/ProfileArtwork.tsx`: shared canvas drawing for preview and PNG export.
- `src/App.tsx`: editor, browser storage, and user feedback.
- `src/components/ui/`: selected shadcn/ui source components.

Artwork themes keep visual values separate from schedule content. Add later customization when a specific control is needed; no generic theme editor is required.

Fonts are bundled with the app. Export waits for the fonts and draws text into the canvas so the PNG does not depend on fonts installed on the recipient's phone.

## GitHub Pages

The public repository deploys `main` through [.github/workflows/pages.yml](../.github/workflows/pages.yml). The workflow installs the locked dependencies, checks schedule behavior, builds the static app, and deploys `dist` with GitHub Pages. Pull requests build without deploying.

Vite uses a relative asset base so the site works under the repository's Pages subdirectory. There is no backend, secret, or API key to configure.

For a fork, enable Pages with GitHub Actions as the build source, then push `main`. Update the README's website and repository links for the new owner. The local `integration/profile-studio` branch records the original implementation before it reaches `main`.

The [specification](spec.md), [glossary](../GLOSSARY.md), and [planning map](../planning/map.md) describe scope and terminology. The user explicitly authorized implementation of all planning tickets; their original planning-only limits no longer apply.
