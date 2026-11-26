# Gym

One app for ALT Fitness aerial classes (TeamUp) and Glasgow Club Gorbals (gym check-in and classes). Built from the v4 boards in the Paper file "Gym app".

This first version runs on **sample data**. Booking, cancelling, waitlists, gym check-in and the calendar all work, but nothing reaches TeamUp or Glasgow Club yet.

## Run it

```bash
npm install
npm run dev
```

Open the address it prints. `npm run dev` also shows a **Network** address. Open that on your Pixel, on the same Wi-Fi, to try it on the phone.

## Install on the Pixel

Installing as an app needs HTTPS, so it has to be hosted first:

```bash
npm run build      # outputs to dist/
```

Put `dist/` on any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages or Azure Static Web Apps). Then open the link in Chrome on the Pixel and choose **Add to home screen**.

## How it's built

- React, TypeScript, Tailwind CSS v4 and Vite, installable as a web app (PWA).
- `src/data/sample.ts`: sample timetables for both studios, generated relative to today.
- `src/store.tsx`: bookings, waitlists and check-in, saved to the browser so they survive a reload. The sample resets each day.
- `src/screens/`: Today, Classes (with filters), Class detail, Bookings and the full calendar.
- **Add to calendar** downloads an `.ics` file that opens in Google Calendar.

## Next steps

1. **ALT Fitness (TeamUp):** sign-in, timetable from `GET /api/v2/events` (provider 3282761), booking through `POST /attendances`, waitlists. This needs a small server, because TeamUp won't accept calls straight from a web page.
2. **Glasgow Club (Gladstone Go):** cookie sign-in, gym slots (activity S0937, 15-minute slots) and class booking. The extra auth header is still unknown and needs checking.
3. Swap `sample.ts` for the live data. The screens read from the store, so they shouldn't need to change.

## Feedback from your phone

The pencil button (bottom right) is a feedback layer:

1. Tap the pencil, then tap the thing you want to comment on, or **Whole screen**.
2. Type a note and tap **Add note**. Notes are saved until you send them.
3. Tap the pencil again, then **Send**, and pick Claude in the share sheet.

Each note carries the screen, the element, its position and the app state, so fixes land first time.
Turn it off with `?feedback=off` on the link, and back on with `?feedback=on`.
