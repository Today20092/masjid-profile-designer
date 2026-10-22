---
id: masjid-defaults
title: Choose the first masjid and calculation defaults
labels: [wayfinder:grilling]
status: closed
assignee: User
parent: map
blocked_by: []
---

## Question

Which masjid, location, timezone, calculation method, Asr convention, and actual congregation schedule form the first example? How will a user identify their location and confirm the calculation settings for another masjid?

The user identified Masjid Abu Bakr, 11010 N 30th St, Tampa, FL 33612, and supplied its official website and Maps listing. [Evidence and remaining verification](../masjid-abu-bakr.md).

The official iqamah page is dated January 1, 2023. The user clarified that the WhatsApp photo is the usual publishing channel. The maintainer supplies current congregation times in the editor; external schedule verification does not block planning or prototyping.

## Resolution comment, October 21, 2026

The user's implementation request authorized choosing editable starting defaults. [Schedule defaults](../../src/schedule.ts) use Masjid Abu Bakr in Tampa, approximate address-matched coordinates, America/New_York timezone, North America calculation, and standard Asr. The editor exposes coordinates, device location, timezone, method, and Asr convention for another masjid. Starting calculation settings are explicitly not represented as approved by this masjid. Sample iqamah values remain marked as samples until the maintainer checks them. No external iqamah feed is required.
