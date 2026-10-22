---
id: map
title: Plan the masjid prayer-time profile designer
labels: [wayfinder:map]
status: open
assignee: null
---

## Destination

A build-ready specification for a simple GitHub Pages website that creates attractive prayer-time profile images whose essential content fits inside WhatsApp's circular crop.

## Notes

- The user authorized implementing all tickets, full project setup, a public repository, and GitHub Pages. This replaces the earlier planning-only and one-ticket-per-session limits. [Implementation specification](../docs/spec.md).
- Confirmed requirements live in [PROJECT.md](../PROJECT.md); terminology lives in [GLOSSARY.md](../GLOSSARY.md).
- Any masjid is supported; the user's masjid is the first example and validation case.
- The WhatsApp photo is the masjid's usual iqamah publication. The editor creates its replacement from maintainer-entered congregation times; finding an external current timetable is not a prerequisite.
- Automatic times with adjustments; user-selected rows; Arabic, English, and bilingual layouts.
- Mobile-first is required. Use React, Tailwind CSS, and selected shadcn/ui controls.
- Themes and defaults first. Later customization is a design consideration, not a reason to build controls or a plugin system now.
- No remote issue tracker was supplied. Use the [local Markdown tracker](TRACKER.md). `/setup-matt-pocock-skills` can configure a different tracker later.
- The source screenshot contains personal details and must not become a public site asset.

## Decisions so far

No decision tickets have been resolved. Initial requirements are recorded in the project brief.

## Not yet specified

- The minimal calculation and deployment approach, once location and schedule requirements establish what is needed.
- How much timetable content remains readable in the chosen design, and what constraints the editor needs as a result.
- Which additional customization controls would be useful after the initial themes have been tried.

## Out of scope

- Automatic changes to the WhatsApp group photo; the maintainer uploads the exported PNG.
- Advanced visual customization controls in the first version.
