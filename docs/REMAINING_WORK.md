# Vivarium: Remaining Work (detailed)

Status as of Phase 3. Items are grouped by priority. Each item lists **what**, **where**, **how**, and **done when**.
Legend: 🔴 blocker for production · 🟠 core feature · 🟡 polish · 🔵 nice to have.

---

## 0. What is already done (so you don't redo it)

- Security headers/CSP fixed (inline scripts allowed, COEP removed, Supabase hosts allowed in `connect-src`).
- Fake data removed: personal defaults, Marvel avatars (now generated avatars in `lib/avatars.js`), VisionQuest hacks, fake rating breakdown/Metascore, fake profile stats, hardcoded device info.
- Auth scaffold: Prisma schema, NextAuth (credentials + optional Google/GitHub), `/api/auth/register`, sign-in/sign-up pages, Header wired to the real session.
- Sync: `components/SyncManager.js` + `/api/user/sync` (history, watchlist, settings, reactions, ratings, watched episodes, custom lists), `/api/user/export`, `/api/user/delete`.
- Player: Skip intro (series/anime, 15-90s window, +85s), next-episode countdown at 95% with cancel, watch-party playback sync via `?room=CODE`. Keyboard shortcuts, quality and server selectors already existed.
- Watch party page: create/join by 5-char code, realtime chat and presence via Supabase Realtime Broadcast.
- Discover: `type`, `service`, `studio` are all in the URL.
- Settings: Export data (JSON) and Delete account buttons.

**Not verified in my sandbox (please test first):** Prisma generate and `db push` (engine download was blocked), actual sign-up/sign-in, SyncManager merge behaviour, Supabase realtime, skip-intro/next-episode in a real browser. See section 1.

---

## 1. First-run verification checklist (do this before anything else) 🔴

1. `npm install` then `npx prisma validate` then `npm run db:push`. If the schema errors, send me the message.
2. Sign up, sign out, sign in. Check the user row exists in Supabase Table Editor.
3. Watch something for 20 seconds, wait 2 seconds, then check `WatchHistory` has a row.
4. Open the site in a second browser, sign in, confirm history and watchlist appear (tests the merge).
5. Open `/watch-party` in two windows, create a room in one and join in the other. Chat should appear in both. Open `/watch/<id>?room=CODE` in both and press play/pause in one.
6. Open a series episode, check Skip intro appears at 15s and the countdown appears at 95%.
7. Browser console: no CSP violations on `/`, `/title/x`, `/watch/x`, `/settings`.

**Known risks to look for:**
- `SyncManager` does a full-replace PUT of history/watchlist. If a user signs in on a device with an empty list *before* the initial pull finishes, nothing is pushed (guarded by `ready`), but verify.
- Skip-intro window is a fixed 15-90s guess; real intro timing is not in TMDB (see 4.2).
- `window.prompt` in the delete-account flow is a placeholder UI.

---

## 2. Production blockers 🔴

### 2.1 Rotate the exposed TMDB key
The old key was hardcoded in an earlier zip. Revoke it at themoviedb.org/settings/api and create a new one. Set it only as `TMDB_API_KEY` in the host's environment variables.

### 2.2 Rate limiting that works on serverless
`lib/api-guard.js` stores counters in a module-level `Map`. On Vercel each lambda has its own memory, so the limit is per instance, not global.
- **How:** use Upstash Redis (free tier) with `@upstash/ratelimit`, or Vercel KV. Key on IP plus route.
- **Also apply to:** `/api/auth/register`, `/api/user/*`, `/api/sources`.
- **Done when:** 61 requests in a minute from one IP returns 429 across instances.

### 2.3 Login brute-force protection
Credentials login has no throttle. Add the same limiter in `authorize()` keyed on email+IP, and a generic error message (already generic).

### 2.4 Password reset / email verification
No email provider yet, so "Forgot password" does not exist.
- **How:** Resend (free tier) + NextAuth Email provider, or a custom token flow using `VerificationToken` (model already exists).
- **Pages:** `/auth/forgot`, `/auth/reset?token=`.
- **Done when:** a user can reset a password end to end; sign-up optionally requires verified email.

### 2.5 Environment validation at startup
Create `lib/env.js` using zod to validate `TMDB_API_KEY`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` at boot, and fail fast in production with a clear message.

### 2.6 Dockerfile / deploy
- Add `npx prisma generate` in the build stage; copy `prisma/` and `node_modules/.prisma` and `node_modules/@prisma` to the runner.
- For Vercel: no Dockerfile needed; set env vars; `postinstall` already runs `prisma generate`.
- Set `NEXTAUTH_URL` to the production origin, `NEXT_PUBLIC_SITE_URL` the same.
- **Done when:** the production URL signs up/in and syncs.

### 2.7 CSP hardening (optional, later)
`script-src 'unsafe-inline'` is needed because Next Pages Router inlines `__NEXT_DATA__` and bootstrap scripts. Moving to nonces requires dynamic rendering (`getServerSideProps` everywhere), which loses static caching. Keep as is unless a security review requires it.

### 2.8 Backups and limits
Supabase free tier pauses after 7 days of inactivity and has no point-in-time backups. Add a weekly `pg_dump` (GitHub Action) or upgrade before real users.

---

## 3. Account and profile features 🟠

### 3.1 Profile page: real "Joined" date and public profiles
**Where:** `pages/u/[username].js`.
- Replace local-profile lookup with `getServerSideProps`/API fetch of `User` by `username` (`/api/user/profile?username=`).
- Show `createdAt` as "Joined Month YYYY".
- Add `isPublic` (and `bio`) to `User`; if private, show a locked view to visitors.
- Edit-profile modal: add bio textarea (max 160) and the privacy toggle; persist to DB via `/api/user/profile` (PUT).
- **Done when:** `/u/someone` renders another user's public stats without being signed in as them.

### 3.2 Multi-profile (Netflix-style) in the database
Local profiles (`viv:profiles`) are not synced. Add a `Profile` model (id, userId, name, avatar, isKids) and add optional `profileId` to history/watchlist rows. Extend `SyncManager` to sync the profile list and key history per profile.

### 3.3 Settings fully synced
Settings, reactions, custom lists are synced as a JSON blob in `UserSettings.data`. Remaining:
- Do not sync device-specific settings (volume, device label).
- Version the blob (`schemaVersion`) so future changes can migrate.

### 3.4 Delete account UI
Replace `window.prompt` with the existing dialog component (`dialogMode`) with a password field and a typed "DELETE" confirmation.

### 3.5 Change email / password
`pages/settings.js` dialogs "email" and "password" still only set local flags (`passwordSet: true`). Implement `/api/user/password` (verify old, hash new, rate limit) and `/api/user/email` (with re-verification once 2.4 exists).

### 3.6 "Sign out of all devices"
Currently local-only. With JWT sessions this needs a `tokenVersion` field on `User`, included in the JWT and checked in the `jwt` callback; bump it to invalidate other sessions.

### 3.7 Notifications
`lib/notifications.js` generates notifications from local patterns. Use the `Notification` table:
- `/api/user/notifications` GET (paginated) and `/api/user/notifications/read` POST.
- A scheduled job (Vercel Cron) that creates "new episode" notifications for titles in a user's watchlist using TMDB `air_date`.
- Header bell: unread badge, "All / Unread" tabs, mark all read on open.

### 3.8 Integrations (Trakt / Simkl / AniList)
Toggles in Settings are cosmetic. Needs OAuth apps for each service, token storage (encrypted) in a new `Integration` table, and scrobble calls from the player's `onProgress` at 80% completion. Treat as a separate project.

---

## 4. Player and streaming 🟠

### 4.1 Source resolution
`pages/api/sources.js` and `lib/sources.mjs` define the pipeline; there must be a legitimate, licensed source of streams for the titles you serve. Without it, the player shows "No streams are available". Decide your content source (your own HLS via `scripts/transcode.mjs`, or licensed providers) before launch.

### 4.2 Accurate intro / credits timing
Skip-intro uses a fixed 15-90s window. Better: per-episode chapter data (store `introStart`, `introEnd`, `creditsStart` per episode in the DB or from HLS chapters/WebVTT) and use them in `VideoPlayer.js` (`showSkipIntro`, `nearEnd`). Fall back to the current window when missing.

### 4.3 Next-episode edge cases
`hasNext` in `pages/watch/[id].js` guesses. Use the season episode count from `/api/tmdb/season` and roll over to the next season's episode 1; stop on the last episode of the last season.

### 4.4 Mobile gestures
Swipe left/right to seek, swipe up/down for volume, double-tap to seek ±10s. Implement with pointer events on the stage in `VideoPlayer.js`.

### 4.5 Subtitles and audio tracks
Settings has subtitle options, but the player must load `<track>` VTT files or HLS subtitle renditions and apply size/colour/background settings (`::cue` styling). Add an audio-track selector from `hls.audioTracks`.

### 4.6 Resume prompt and "mark watched"
At 90%+ progress mark the episode watched (`toggleWatchedEpisode`) automatically; show "Resume from 12:34 / Start over" when `initialProgress` is between 2% and 90%.

### 4.7 Picture-in-picture, playback speed, Chromecast
Add PiP (`video.requestPictureInPicture()`), speed menu (0.5x-2x), optional Cast.

### 4.8 Watch party refinements
- Host-only control option; late joiners should receive the current time (send a `state` event on presence join).
- Room expiry after 6 hours idle (Supabase has no TTL; store rooms in a table with `expiresAt` and clean by cron).
- Show "N watching" inside the player, not only on the party page.
- Rate-limit chat client-side (1 msg/sec) and sanitize rendering (React escapes by default; keep it that way).
- Realtime has no auth: anyone who knows a room code can join. For private rooms use Supabase Realtime Authorization (RLS on `realtime.messages`) tied to signed-in users.

---

## 5. Catalog pages 🟠

For every item: **Done when** = the behaviour works on a fresh load of a shared URL.

| Page | Task | Where |
|---|---|---|
| `/movies` | Sync `category` and all filters to the URL query (`router.replace` shallow), initialise from `router.query` | `pages/movies.js` state at ~line 84 |
| `/movies` | Scroll to the grid after a filter change | same |
| `/movies`, `/series`, `/anime` | Rating badge `★ 8.4` on card hover only when vote > 0 | `components/MediaCard.js` |
| `/series` | Network pills (HBO, Netflix, AMC, Apple TV+, Showtime, FX, Peacock) mapped to TMDB network ids | `pages/series.js` + `/api/tmdb/discover` (`with_networks`) |
| `/series` | Season count on cards ("4 Seasons") from `number_of_seasons` | `lib/tmdb.js` normalize + `MediaCard` |
| `/series` | Verify "Airing Today" -> `/tv/airing_today`, "On Air" -> `/tv/on_the_air` | `pages/api/tmdb/discover.js` |
| `/anime` | Studio pills (MAPPA, Ufotable, Wit, A-1, Sunrise, KyoAni) via `with_companies` | `pages/anime.js` |
| `/anime` | SIMULCAST badge when `status === "Returning Series"` and airing recently; `JP` badge for `original_language === "ja"` | `MediaCard` |
| `/anime` | Sub-genre filters using TMDB keyword ids (Isekai 210024, Mecha 10987, Shounen 256647 — verify the ids on TMDB before using) | `discover.js` (`with_keywords`) |
| `/discover` | Load more / infinite scroll (IntersectionObserver, `page` param, cap at 500 pages) | `pages/discover.js`, `/api/tmdb/discover` |
| `/discover` | Sort dropdown mapped to `sort_by` | same |
| `/discover` | Studio row of logos, full service list via watch-provider ids | same |
| `/discover` | Friendly empty state | `Empty` component exists in `components/Page.js` |
| `/search` | People results (`/search/person`), person cards (portrait, name, known for) | `pages/api/tmdb/search.js`, `pages/search.js` |
| `/search` | Genre chips on result cards (`Action · Sci-Fi · 2024`) | `pages/search.js` |
| `/search` | Recent searches already stored (`useSearches`); confirm max 10 and show on empty focus | `SearchPalette.js` |
| `/schedule` | "Today" tab from `new Date()`, network logos, local-timezone air time (`Intl.DateTimeFormat`), premiere/finale badges, "Remind me" + `.ics` download, upcoming movies row | `pages/schedule.js` |
| `/history` | Group by Today / Yesterday / This week / Earlier; show `S1 · E4 — "Title"` on series; delete from DB when signed in (SyncManager already pushes the new list) | `pages/history.js` |
| `/lists` | Public share URL (`/lists/[id]`) + `isPublic` flag, drag-reorder (`@dnd-kit`), description field, "Updated 3 days ago" | needs `CustomList` + `CustomListItem` tables (schema in the original todo, section 2) |
| `/watchlist` | Title "My list", subtitle "Save anything with the plus button", All/Movies/Series/Anime pills | `pages/lists.js` |
| `/profiles` | "Not now" honours `callbackUrl`; skip picker when only one profile; zoom-to-fill transition with `AnimatePresence`; KIDS badge and restricted content filter | `pages/profiles.js` |

### 5.1 Title page 🟠
- Quality badges (4K UHD / HDR / 5.1): your plan calls them cosmetic and static. If you keep them, label them honestly or derive from stream metadata later; showing "4K" for content you do not serve is misleading.
- Director/creator row from TMDB `credits.crew` / `created_by`.
- Cast avatar fallback exists (initials). Add a gradient background.
- "Where to watch" via TMDB `/watch/providers` (requires attributing JustWatch as TMDB requires).
- Rating tab: the fake breakdown was removed. Optionally add real Vivarium user ratings by aggregating `viv:user_ratings` from the DB (`Rating` table).
- Download button now shows "not available". Remove it from the menu if you will not build downloads.
- Watched-episode toggle persists locally and syncs via `watched` in the extras blob; also mark history when toggled.

---

## 6. Admin panel 🟡

Not started. Needs the `role` already in the JWT.
1. Route protection: `getServerSideProps` check `session.user.role === "ADMIN"` for `/admin/*`; redirect otherwise. Also enforce in every `/api/admin/*` handler (never trust the page check alone).
2. Pages: users (list, change role, ban via a `bannedAt` column), notifications broadcast, featured titles (needs a `FeaturedTitle` table that the hero reads), basic analytics (counts from the DB; no tracking beyond what you store).
3. Make the first admin with SQL: `update "User" set role='ADMIN' where email='you@example.com';`

---

## 7. Animations and visuals 🟡

- Page transitions: wrap `<Component>` in `AnimatePresence`/`motion.div` in `pages/_app.js` (keep `prefers-reduced-motion` respected; `globals.css` already has a reduced-motion block).
- MediaRow: drag-to-scroll, hover arrows, 3-card step.
- Top-10 rank numeral entrance animation (IntersectionObserver).
- Skeleton shimmer: confirm `Skeleton.module.css` uses the left-to-right sweep from the todo.
- Hero: confirm cross-fade and `moodDrift` are applied (HeroBanner already uses AnimatePresence).
- Card hover (translateY -4px, scale 1.02, scrim), toast slide, settings tab `swapIn`.
- Header: logo present, sliding active pill (verify), mobile bottom tab bar.
- Typography/colour tokens table in the todo (sections 25) should be diffed against `styles/globals.css`.
- Hero height: use `100dvh` on mobile.
- Responsive audit at 375 / 390 / 768 / 1024 / 1440 / 1920. Automate with Playwright screenshots (`tests/browser`).

---

## 8. Performance and SEO 🟡

- `next/image` instead of `<img>` for posters and backdrops (remote patterns already allow TMDB). Add `sizes` to keep bandwidth low. ESLint currently warns `no-img-element`.
- `next/dynamic` for `VideoPlayer` and `SearchPalette`.
- Prefetch title page on card hover.
- ISR: title pages have `revalidate: 1800`. Check the build time: a large `getStaticPaths` set makes builds slow. Consider returning `paths: []` with `fallback: "blocking"` and let ISR fill in.
- SEO: `Layout` already sets title/description/og; add `og:image` sizes, canonical URLs, and per-title JSON-LD (title page has it; confirm valid with Google's Rich Results Test). The JSON-LD `ratingCount: 100` fallback is invented; remove it when `voteCount` is missing.
- `sitemap.xml` exists; add `robots.txt` and reference the sitemap.
- Lighthouse target: Performance 90+, Accessibility 95+.

---

## 9. Code quality and testing 🟡

- ESLint reports about 34 errors; fix or deliberately downgrade each rule. Most are React 19 `set-state-in-effect`. Fix by deriving state or using `useSyncExternalStore`.
- The transcode test needs `ffmpeg`; skip it in CI when ffmpeg is missing (`t.skip`) or install ffmpeg in the CI image.
- Add tests: `api-guard` (rate limit, clamp), `register` (validation, duplicate), `sync` merge logic (extract the merge from `SyncManager` into a pure function in `lib/syncMerge.js` and unit test it).
- E2E (Playwright): sign-up, add to watchlist, reload, sign in on a second context.
- CI (GitHub Actions): `npm ci`, `npm run lint`, `npm test`, `npm run build`.
- The zip script `scripts/make_zip.ps1` now uses `-LiteralPath`; bracket route files must be in every archive. Prefer `git archive` once the project is in git.
- Sentry (free tier) for error reporting; replace `console.error` in API routes.

---

## 10. Legal and compliance 🔴 before public launch

- TMDB requires visible attribution ("This product uses the TMDB API but is not endorsed or certified by TMDB") and its logo. `public/brands/tmdb.svg` exists; add it to the footer and About tab.
- Privacy policy and terms pages; cookie notice for the NextAuth session cookie.
- Do not host or link copyrighted streams without rights. The audit flagged the streaming sources as your biggest legal risk; resolve section 4.1 first.
- Data export and deletion exist (3.4 improves them): keep them for GDPR/DPDP requests.

---

## 11. Suggested order of work

1. Section 1 (verify what exists) and 2.1, 2.5, 2.6 (key rotation, env validation, deploy).
2. 3.1, 3.4, 3.5 (profile and account completeness).
3. 5 (catalog URL sync, load more, schedule, history grouping).
4. 4.2, 4.3, 4.6 (player correctness), then 4.4, 4.5.
5. 2.2, 2.3, 2.4 (rate limiting, reset email) before inviting real users.
6. 7, 8, 9 (polish, performance, tests).
7. 6 and 3.7, 3.8 last.

Rough effort: section 1-2: 1 day · 3: 2-3 days · 4: 3-4 days · 5: 3-4 days · 6: 2 days · 7-9: 4-5 days.
