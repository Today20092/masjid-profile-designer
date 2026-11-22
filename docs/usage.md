# Using the studio

## Prayer times

Set the location coordinates, IANA timezone, calculation method, and Asr convention to match your masjid. Tampa starts with North America and standard Asr as editable examples, not as settings approved by Masjid Abu Bakr. Check calculated times against the masjid's practice before use.

Adhan adjustments change the calculated start time by a number of minutes. A delayed iqamah follows that adjusted time. A fixed iqamah remains at the clock time you enter when you change the date. Jumu‘ah is entered separately. Sunrise is a calculated event and has no iqamah; with one time column it shows its calculated time, and with both columns its iqamah shows a dash.

For a delayed iqamah, enable **Show “7 minutes after adhan” on image** to publish the delay instead of that day's clock time. The wording follows your entered number of minutes and the artwork language. New designs enable this for Maghrib by default. Existing saved designs keep their current appearance until you enable it. This is useful when keeping the same group photo for a month; any displayed adhan clock times still apply only to the selected date.

The image represents the selected date. It does not update itself after downloading. If your masjid publishes a weekly or seasonal schedule, use the footer to explain its applicability and review date-dependent times before each export.

## Design and export

Prayer rows show the name and iqamah value together. Tap the arrow beside a prayer to open its options: fixed/delayed mode, relative wording, and adhan adjustment. The main time or delay remains directly editable without opening options.

Use **Edit times** and **Choose design** to jump to those controls. On a phone, **Preview** in the bottom bar keeps a compact live image visible while you edit. **Full image** returns to the larger preview; **Close preview** releases the space. **Undo** restores up to 30 recent edits in the current tab, including removed custom rows and reset. Typing in one field until you leave it counts as one edit. **Redo** restores an undone edit; a new edit clears redo. Outside text fields, use Ctrl/Cmd+Z for undo and Ctrl/Cmd+Shift+Z (or Ctrl+Y) for redo. Text fields retain normal browser editing shortcuts. History clears when you reload; the current design remains saved when browser storage is available.

Choose English, Arabic, or bilingual labels. Select iqamah, adhan, or both columns. Enable up to eight rows, including any custom rows. Keep the masjid name and footer short for readability at profile-photo size.

Choose **Standard**, **Large**, or **Extra large** under **Text size**. Larger sizes spread the table across more of the circle and enlarge prayer names most; times grow a little and stay below about 1.35× the masjid name. Rows narrow near the circle's edges to protect the crop. With seven or eight rows, the space in the circle limits how much Large and Extra large can add. Your choice is saved in this browser and used for PNG exports.

A message below the full preview names any text that was substantially reduced to fit. Shorten it, use fewer rows, or show one time column to give that text more room.

Emerald, Midnight, Ivory, Plum, Rose, and Charcoal are preset artwork themes. Plum pairs deep purple with warm gold; Rose uses a light blush surface with burgundy text; Charcoal pairs neutral dark surfaces with cream and champagne. Free-form colors, fonts, and logo controls are deferred. The editor's theme and the exported artwork are separate.

Download creates a square 1080px PNG with all essential content inside a circle. Under **Image size**, choose 2× (2160px) or 3× (3240px) for a sharper copy to print or show on a large screen; WhatsApp only needs 1×. In WhatsApp, open your group information, edit the group photo, choose the downloaded image, and keep the full square centered in the crop. Group permissions may require an administrator to change the photo.

The chat-list avatar is too small to read the full timetable. Open the group photo for the details. Fewer rows, one language, and a short masjid name leave more room for readable text.

## Making a design with an AI

Press **Copy request for AI**, paste the request into ChatGPT, Claude, Gemini, Grok or another AI that can read web pages, then attach a photo of your timetable or type the new times. The AI reads the site's [instructions for AI assistants](../public/llms.txt) and replies with a link, followed by the times it used. Opening the link loads the design and downloads the image; you can keep editing on the page. Once you have changed the sample design, the request includes your current design, so the AI updates it (keeping your name, theme and other choices) instead of starting over.

To change settings by hand or with an AI chat, open **Edit as text** in the same section. It shows the design in the same short form the AI uses: **Copy for AI** copies it with instructions, and **Apply** takes back an answer, even one that only lists the changes.

If you already have a design saved in this browser, the page asks before replacing it, and Undo brings yours back. If the AI made a mistake, the page shows what is wrong; paste that message back to the AI for a corrected link. Check the times against your timetable before you post the image.

The design travels after the `#` in the link, which browsers do not send to the website. The photo goes only to the AI you chose.

## Saved settings and privacy

The app stores settings in this browser on this device. Clearing website data removes them. Private browsing or blocked storage can prevent saving; the editor reports this. A different phone or browser starts with its own settings.

Calculations and image generation happen in your browser. Timetable content is not uploaded by the app. GitHub Pages receives normal website requests. If you choose device location, the browser asks permission and the app uses the coordinates locally. You can enter coordinates without granting permission.

## If something goes wrong

- Check latitude, longitude, timezone, date, and clock-time fields if calculation or export is disabled.
- At some high-latitude locations, a selected method cannot produce every requested prayer. Choose a method agreed by your masjid; do not treat a missing calculation as a congregation time.
- If saving is unavailable, keep the page open while editing and download your image before leaving.
- If a phone opens the image rather than saving it, use its image-save action. Check the browser's Downloads list as well.
