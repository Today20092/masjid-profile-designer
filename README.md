# Masjid Profile Studio

Create a readable prayer timetable for your masjid's WhatsApp group photo. Enter iqamah times, choose a theme, and download an image designed to fit the circular crop.

<p align="center">
  <a href="https://Today20092.github.io/masjid-profile-designer/"><img alt="Open the website" src="https://img.shields.io/badge/Open-Website-C4A7E7?style=for-the-badge&amp;logo=github&amp;labelColor=493267"></a>
  <a href="docs/development.md"><img alt="Mobile-first web app" src="https://img.shields.io/badge/Web-Mobile%20first-B5DFE8?style=for-the-badge&amp;labelColor=29626B"></a>
  <a href="docs/usage.md"><img alt="Browser-local calculations and settings" src="https://img.shields.io/badge/Data-Browser%20local-A2FFB0?style=for-the-badge&amp;labelColor=246732"></a>
</p>

[Open the studio](https://Today20092.github.io/masjid-profile-designer/) · [Usage guide](docs/usage.md) · [Development](docs/development.md) · [Report an issue](https://github.com/Today20092/masjid-profile-designer/issues)

## Make your group photo

1. Open the studio on your phone or computer.
2. Set the masjid name, date, location, and calculation settings.
3. Enter the masjid's iqamah times. Use fixed times or a delay after adhan.
4. Choose the rows, language, and theme. Check the circular preview.
5. Confirm the schedule, download the PNG, and set it as the WhatsApp group photo.

The starting masjid is Masjid Abu Bakr in Tampa, Florida. Its editable example iqamah times come from a reference photo and are not a verified current schedule. Confirm the values before publishing. Automatic calculations supply adhan times; the masjid determines iqamah times.

## What it does

- Phone-first editor with a live circular preview.
- Automatic adhan calculations with per-prayer adjustments, multiple calculation methods, and standard or Hanafi Asr.
- Fixed or delayed iqamah, Jumu‘ah, optional sunrise, and custom rows.
- English, Arabic, and bilingual artwork in three themes.
- A 1080 × 1080 PNG that matches the preview.
- Settings saved in the same browser, with no account or timetable upload.

The downloaded image is static. When the schedule changes, generate a new photo and replace it in WhatsApp. Browser settings do not sync between devices. Up to eight visible rows keep the artwork readable.

## Run locally

Use Node.js 24 or later.

```sh
npm ci
npm run dev
```

Built with React, Vite, Tailwind CSS, shadcn/ui, and [Adhan JS](https://github.com/batoulapps/adhan-js). Development assisted by OpenAI Codex. See the [implementation specification](docs/spec.md) and [planning map](planning/map.md) for the project decisions.
