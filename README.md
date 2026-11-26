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

## Android app (one-tap Glasgow Club check-in)

The Android app wraps the live site (it loads https://alicelariviere.github.io/gym-classes/),
so most changes only need a web publish. Its one native addition is a Glasgow Club bridge:

- `android/app/src/main/java/.../GlasgowClubPlugin.java` keeps Glasgow Club's own website in a
  second web view, signed in as you. You sign in there once; the app never sees the password.
- `public/gc-book.js` runs on Glasgow Club's gym page and taps through a booking: next free slot,
  check the price is £0, book, confirm. It stops instead of paying anything. It's fetched fresh
  each time, so fixes don't need a reinstall.

Build the APK (needs the Android SDK, and the signing key that lives only on your Mac):

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleRelease
# app/build/outputs/apk/release/app-release.apk
```

`android/gym-release.keystore` and `android/keystore.properties` are the signing key and its
passwords. They're not in git. Keep them: updates only install over the top if they're signed
with the same key.
