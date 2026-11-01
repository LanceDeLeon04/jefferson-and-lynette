# Royal Wedding Invitation – Jefferson & Lynette

Vite + GSAP + Lenis. The envelope opening is one continuous GSAP timeline (`src/envelope.js`): the seal cracks in two, the 3D flap swings open with live shading, the card slides out and the camera moves into it.

## Run
```
npm install
npm run dev        # local preview
npm run build      # production build -> dist/ (upload to any static host)
npm run build:single   # one self-contained dist-single/index.html
```

## Set up
`.env` is pre-filled with the wedding date and the Supabase project URL + **publishable** key (safe for browsers). Never put a secret/service_role key in this app.
See `.env.example`:
- `VITE_WEDDING_DATE` – e.g. `2027-02-14T15:00:00+08:00` (turns on the countdown)
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` – optional; run `supabase/schema.sql` to collect RSVPs. Guests can only insert; read replies in the Supabase dashboard. Without these, replies stay in the guest's browser.
- Music: `src/assets/music.mp3` plays on a loop once the envelope is opened (toggle button bottom-right). Not loaded on the admin page. Replace the file to change the track.

`logo-transparent.png` is the original background-removed logo; the site uses the compressed `src/assets/logo.webp`.

## Supabase RSVP setup (one time)
1. Dashboard > SQL Editor > paste `supabase/schema.sql` > Run.
2. Replies appear under Table Editor > `rsvps`.

## Gallery
Drop photos (jpg, jpeg, png, webp, avif) into `src/assets/gallery/`. They appear automatically, sorted by filename, with a fullscreen lightbox. With no photos, monogram placeholders are shown. Use a multiple of 4 photos for a perfectly filled grid.

## Admin portal (RSVPs + seating plan)
Open `/admin` while developing (`http://localhost:5173/admin`), or `admin.html` on your host. It is not linked from the public site.
- **Guests** tab: all replies, stats, search/filter, add/edit/delete, CSV export.
- **Seating plan** tab: add/drag round or long tables, stage, dance floor etc.; click a guest then a table (or a seat) to seat their party, or drag the guest onto a table; drag seated dots to swap; Auto-seat; Print (floor plan + seating list). **Save layout** (Ctrl+S) stores it.

One-time setup (the portal is protected by Supabase login):
1. Supabase > SQL Editor: run `supabase/admin.sql` (put your email in it first).
2. Authentication > Users > Add user: same email + a password. Authentication > Sign In / Providers: turn **off** "Allow new users to sign up".
3. Sign in at `/admin`. Without Supabase keys the portal works on this browser only (for testing).

`npm run build` outputs all pages (`index.html`, `gift.html`, `admin.html`); `build:single` only the invitation (no gift page, so use `npm run build` to deploy the QR gift page).

## Gift QR page
`gift.html` shows the BPI InstaPay QR (`public/gift-qr.png`). To change the QR, replace that file. The Gift section button on the main page links to it.

## Entourage
The Entourage section (parents, principal & secondary sponsors, cord, veil, ring bearer, etc.) is edited in the admin: **/admin > Entourage** (edit names, add/delete/reorder, then Save).
Run `supabase/migration-entourage.sql` once in Supabase so the list can be saved online. Until something is saved, the invitation shows the default list in `src/entourage-data.js`.
