---
id: circle-design
title: Choose readable circular layouts and initial themes
labels: [wayfinder:prototype]
status: closed
assignee: User
parent: map
blocked_by: []
---

## Question

Which layouts and small set of initial themes keep the masjid identity and chosen prayer rows readable inside a circular crop in Arabic, English, and bilingual modes? What is the smallest preview-and-download flow, and which image format and size should it produce?

Resolve through a rough prototype and user reaction. Include a realistic long name, bilingual content, and a small circular preview. Distinguish preview sample values from an approved masjid schedule. Keep theme styling separate from timetable content so later customization can be added without replacing the editor; do not build customization controls yet.

## Resolution comment, October 21, 2026

The user's later request to implement every ticket authorized completing the design rather than stopping at a prototype. Implemented emerald, midnight, and ivory presets in the [shared canvas renderer](../../src/ProfileArtwork.tsx). English, Arabic, and bilingual labels support one or two time columns. The large preview, small circular crop preview, and 1080px PNG use identical rendering with locally bundled fonts. Measured text fitting and an eight-row limit protect the circular safe area. Mobile editing starts with the preview, then grouped controls and a single sticky download action. Theme values remain separate from schedule data for later customization. [Studio screenshot](../../docs/studio.png) and [verification](../../docs/verification.md) record the result; no claim of a separate user design-approval session is made.
