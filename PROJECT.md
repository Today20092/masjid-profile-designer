# Masjid Profile Designer

## Goal

A simple, customizable website intended for GitHub Pages that produces attractive prayer-time profile images with all essential content inside the WhatsApp circular crop.

## Confirmed requirements

- Automatic prayer times with user adjustments.
- Users choose which rows appear.
- Arabic, English, and bilingual layouts.
- Support both calculated adhan with adjustments and iqamah settings, including fixed times and delays after adhan. Exact editing behavior remains a design decision.
- Support any masjid, with the user's masjid as the first example and validation case.
- Start with polished themes and defaults. Plan for later customization; defer its controls.
- Mobile-first editor using Tailwind CSS and selected shadcn/ui components. Verify phone-width editing and PNG export.

## Planning status

The user authorized implementing all tickets and publishing a public GitHub Pages site. The [implementation specification](docs/spec.md) records the chosen starting defaults and verification scope; the [wayfinder map](planning/map.md) tracks ticket resolutions.

## First masjid

Masjid Abu Bakr / مسجد أبو بكر, 11010 N 30th St, Tampa, FL 33612. The user supplied its address, Maps listing, and official website. [Source details and schedule verification](planning/masjid-abu-bakr.md).

## Publishing workflow

The user clarified that the WhatsApp group profile photo is the masjid's usual way of publishing iqamah times. Creating a clearer, easily updated version of that photo is the core problem.

The editor must let the maintainer enter the masjid's iqamah schedule, choose fixed times or delays, preview the circular result, and export a replacement profile image. Automatic calculations supply adhan times; they do not establish the masjid's iqamah schedule. A current external timetable is not a prerequisite for designing the tool. Reusing the previous design and schedule should make subsequent updates quick; the exact save behavior remains to be specified.

## Reference

The user supplied a WhatsApp group screenshot. Its prayer timetable is clipped by the circular profile crop; the new design should keep names and times comfortably inside that boundary. The screenshot contains personal information and is not part of the public site assets.
