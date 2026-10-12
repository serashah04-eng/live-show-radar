# CONTEXT_MEMORY.md — read this first (for any person or any Claude continuing this build)

**Purpose:** a single file that lets someone with zero history continue the project. It says what the product is, what state it is in, what was decided and why, what broke before, what is left, and a dated/timed log of every change (why, what, files).

**Rules for whoever edits the project (human or AI):**
1. After EVERY change: run checks, `git commit`, `git push origin main`, and append an entry to the change log below (`node scripts/log-change.mjs "why" "what" "files"` does it with a real timestamp).
2. Keep GitHub and local identical. Never leave work only on this computer.
3. Never put secrets in this file or in git. Env var NAMES only.
4. Update the "Current state" and "TODO" sections when they change.

---

## 1. The product

**FrontRow** (formerly "Live Show Radar"; the name lives in `src/lib/brand.ts`). A concert-discovery and alert app for India, Bengaluru first, built for the MESA C4 "AI and its Applications" final exam (problem statement: *Live Show Radar*, user "Karan" follows ~60 artists and misses shows and early-bird tickets). Rules from the exam: use live external data, **all AI must be Gemini Flash (not Claude API)**, deploy on Vercel, submit a public URL + GitHub repo + Components Map.

- **Repo (public, keep public):** https://github.com/serashah04-eng/live-show-radar (branch `main`)
- **Live site (Vercel, project `live-show-radar`, team sera-f34b, Hobby):** https://live-show-radar-gamma.vercel.app
- **Database:** Supabase project `live-show-radar` (ref `tvaoqaddqoxrrgpcswsn`, ap-northeast-1, free plan)
- **Owner accounts:** GitHub `serashah04-eng`; Vercel `sera-f34b`; Supabase org "serashah04-eng's Org"; Telegram bot `@liveshowradarbot`.
- **Stack:** Next.js 16 (App Router, Turbopack, **Cache Components on**), TypeScript, Tailwind v4, Supabase (Postgres/Auth/RLS), Gemini Flash (`gemini-flash-latest`) with Google Search grounding, Ticketmaster Discovery API, Telegram Bot API, Resend, GSAP, Vercel + GitHub Actions.

## 2. Hard rules the product follows (do not break)

- **Never fabricate** concerts, dates, venues, prices, ticket links, deadlines or API coverage. Placeholders are allowed ONLY when clearly labelled `[Placeholder]`, marked `is_sample`, never stored, never alerted, no booking link.
- **Verification tiers:** `Unconfirmed` (found by search) → `Reported by 2+ sites` (corroborated, 2 independent domains, no conflict; NOT verified) → `Verified` (official API record, or owner review with an evidence URL + quoted text). A verified ticket phase must have evidence (DB constraint). Orange "early bird" urgency only for verified deadlines.
- **No scraping** of BookMyShow / District / SkillBox / Bandsintown. Pages appear only as cited results from Google Search grounding, or as user-submitted links (never fetched).
- Gemini never invents events: search step is grounded in prose; extraction step must cite one of the pages the search used (index), and the stored source URL is that resolved page.
- Secrets stay server-side. Repo is public: scan before every push (`node --env-file=.env.local scripts/scan-secrets.mjs`).
- Alerts: Telegram + Resend email, independent channels, dedupe key per alert+channel+recipient, max 3 attempts with backoff, failures visible, never marked sent unless the provider accepted.

## 3. Current state (update this section)

**Last updated:** 2026-10-12 18:10 IST

Working and tested:
- Auth (Supabase) + RLS on all 16+ tables; **TRIAL MODE on by default** (`TRIAL_MODE` != "false"): any email + any password signs in (account auto-created, password ignored, sign-up page says so); nobody is admin in trial mode (Review/Status hidden on the public site). Local owner mode (`LOCAL_OWNER_MODE=true`, dev only, never on Vercel) skips login and is admin; it uses the SAME database, so review events locally.
- Discovery: Gemini grounded search (upcoming + **past/history mode**), Ticketmaster adapter (returns 0 India events), manual "Add event by link", dedupe, artist matching, corroboration.
- Feed with filters: when (upcoming/past), scope (My artists / + my genres / Everything), artist, venue, event type, month, city, genre, ticket status, verification, date range, booking-link-only, text search, sort. Every dropdown lists only values that have real shows (with counts); an empty combination shows a labelled `[Placeholder]` card.
- City priority is an ordered list (#1 listed first, Bengaluru default). "Book show" button on every upcoming event (stored ticket URL, else best listing page, labelled honestly).
- 176-artist catalogue, 33 genres, 115 cities; pick-your-scene wizard; one-tap artist tiles; Find shows (per-artist on-demand search) and background search on follow.
- Notifications engine (Telegram tested; email NOT yet tested), in-app early-bird pop-up (not yet seen live), cron endpoints `/api/cron/discover` and `/api/cron/notify` (Bearer `CRON_SECRET`), `vercel.json` daily cron, optional GitHub Actions 30-min workflow (needs repo secrets `SITE_URL`, `CRON_SECRET`).
- UI: lime `#c4d600` on near-black, inspired by voltlites.com (UX effects re-implemented with GSAP ScrollTrigger; placeholder Unsplash photos; CSS percent loader; marquee; numbered rows).
- Tests: `node --test scripts/*.test.mjs` (63 unit tests), DB checks, secret scan.

Data in DB (2026-10-12 ~18:00): 35 events (26 past, 9 upcoming), 48 source links. Past shows found for Anuv Jain, Arijit Singh, AP Dhillon, Prateek Kuhad. **Google Search grounding returned HTTP 429 (RESOURCE_EXHAUSTED) during the bulk fill** while plain Gemini calls still return 200, so only the search-grounding quota is exhausted. The key's billing plan is UNKNOWN to the assistant (do not assume free or paid): check https://aistudio.google.com/usage and the Google Cloud billing link for the key's project. Most artists are still unsearched.

## 4. TODO (priority order)

1. **Fix the Google Search grounding quota** (429 RESOURCE_EXHAUSTED; plain calls work): in Google AI Studio check the key's tier and grounding limit, link a billing account to the key's Google Cloud project if it is not on a paid tier, or wait for the limit to reset. Then re-run `node --env-file=.env.local scripts/fill-data.mjs --parallel=2` (it now stops itself on the first 429).
2. Supabase Auth → URL Configuration: set **Site URL** to the Vercel domain and redirect `https://live-show-radar-gamma.vercel.app/**` (only matters when `TRIAL_MODE=false`).
3. Test email delivery: set `ALERT_TO_EMAIL` (the Resend account email; free test sender `onboarding@resend.dev` only delivers to that address) then run `node --env-file=.env.local scripts/test-notify-live.mjs --email`.
4. Check `APP_BASE_URL` on Vercel = `https://live-show-radar-gamma.vercel.app` (it already exists; value unseen).
5. Optional 30-minute schedule: add GitHub repo secrets `SITE_URL` and `CRON_SECRET` (Vercel Hobby cron is daily only).
6. Verify a real early-bird flow end to end (create a verified phase via /review locally, see pop-up + alerts), then update `docs/NINE-CHECKLIST.md` scores and regenerate the Components Map (`node scripts/build-components-map.mjs`, PNG via headless Chrome) — the exam needs the map, public URL, repo link.
7. Re-check the redesigned dashboard at phone width; consider a real photo set.
8. Before any real launch: set `TRIAL_MODE=false`.

## 5. How to run

```bash
npm install
cp .env.example .env.local        # fill values (never commit)
npm run dev                        # add LOCAL_OWNER_MODE=true to .env.local to skip login locally
node --test scripts/feed.test.mjs scripts/notify.test.mjs scripts/discovery.test.mjs scripts/catalog.test.mjs
node --env-file=.env.local scripts/test-db.mjs
npm run lint && npx tsc --noEmit && npm run build
```
Env var NAMES: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, GEMINI_API_KEY, GEMINI_MODEL, TICKETMASTER_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, RESEND_API_KEY, ALERT_FROM_EMAIL (`onboarding@resend.dev`), ALERT_TO_EMAIL, CRON_SECRET, ADMIN_EMAILS, APP_BASE_URL, LOCAL_OWNER_MODE, TRIAL_MODE, NOTIFICATIONS_ENABLED, AUTO_DISPATCH_ON_REVIEW, AUTO_SEARCH_ON_FOLLOW, DISCOVERY_ARTISTS_PER_RUN, DISCOVERY_CORROBORATE_PER_RUN. Values live in `.env.local` (git-ignored) and in Vercel → Settings → Environment Variables. `.env.local` is NOT in GitHub: a new machine needs the owner to supply the keys.

DB migrations are in `supabase/migrations/` (applied by pasting into the Supabase SQL editor; there is no Supabase CLI link): init, corroboration, local_owner_profiles (user FKs point at `profiles`), notifications, artist_rotation.

## 6. Gotchas learned the hard way

- **Tailwind v4: `@apply` cannot use a custom class** (e.g. `@apply mono`) — it breaks the whole stylesheet and the page does not hydrate. Inline the utilities or write plain CSS.
- **Never run `npm run build` (or delete `.next`) while `next dev` is running** — it corrupts the dev server. Stop the dev server first. After deleting `.next`, `tsc` complains `LayoutProps` is missing until a build regenerates types.
- **Hidden/background browser tabs never fire `requestAnimationFrame`**, so React's streamed Suspense content is never revealed and the page looks stuck on "Loading…". It is a test-environment artifact; front the tab.
- Next 16 + Cache Components: anything reading cookies / `searchParams` / `usePathname()` must be inside `<Suspense>`; `middleware` is `proxy.ts`; read `node_modules/next/dist/docs/` before using Next APIs.
- `gemini-2.5-flash` is closed to new accounts (404) although it is in the model list; use `gemini-flash-latest`. The grounded call returns no grounding metadata if you demand JSON-only in the same call; the code does search (prose) then extraction (JSON) in two calls and retries when no sources come back.
- Search grounding has its own quota, separate from normal Gemini calls: 3–4 parallel grounded searches worked for ~2 minutes then every grounded call returned 429 while plain calls stayed 200. Each artist can use up to 3 search attempts + 1 extraction call, so quota drains fast; keep parallelism at 2.
- Supabase "Confirm email" + redirect URL: localhost:3000 may belong to another project; dev ports are auto-assigned.
- PowerShell: `Resolve-Path` treats `[id]` in `src/app/events/[id]` as a wildcard — use the Edit tool. `Set-Content -Encoding utf8` adds a BOM that breaks JSON/ts parsing; write with UTF8 no-BOM.
- Vercel Hobby cron = once a day. Vercel sends `Authorization: Bearer $CRON_SECRET` to cron paths automatically.
- Windows: LF→CRLF warnings on commit are harmless.
- Ticketmaster has essentially no India events for these artists.
- Computer-use/browser tooling cannot type secrets into web forms by policy; secrets must be pasted by the owner.

## 7. Change log (newest at the bottom; times are IST; times before 18:00 on 2026-10-12 are reconstructed approximations, later ones are real)

Format: **date time — title** · WHY · WHAT · FILES

- **2026-10-12 ~13:15 — Stage 1 audit** · Needed a baseline before building. · Found an empty project folder, GitHub repo `live-show-radar` (public), empty Supabase project, Vercel account with only another project; wrote nine-checklist + risk register. · (report only)
- **~13:40 — Env + git setup** · Secrets must never reach the public repo. · Created `.env.local`, `.gitignore`, `.env.example`; `git init`, remote `origin`. · `.gitignore`, `.env.example`
- **~14:20 — Integrations verified** · Prove each service works before building on it. · Supabase REST 200; Ticketmaster key OK but **0 India events**; Telegram `getMe` OK, chat id found via Telegram Web (user id), test message delivered; Resend key valid; Gemini needed a new key; `CRON_SECRET` generated. · `scripts/check-integrations.mjs`
- **~14:45 — Scaffold** · Foundation. · Next.js 16 scaffold copied in (BOM bug fixed), `@supabase/supabase-js`. · `package.json`, `src/**`
- **~15:00 — Database (migration 1)** · Persistent, secure data model. · 16 tables, RLS, constraints (verified phase needs evidence), seed 5 artists/12 genres. · `supabase/migrations/20261012000000_init.sql`, `scripts/test-db.mjs`
- **~15:30 — Discovery engine** · Find real shows without scraping. · Gemini grounded-search adapter (2-step, cites real pages), Ticketmaster adapter, manual link adapter, matching, dedupe, persistence; first live run found Anuv Jain/WCMT shows. · `src/lib/discovery/**`, `scripts/run-discovery.mjs`, tests
- **~16:00 — Corroboration + app UI (migration 2)** · Hybrid verification so users see "reported by 2+ sites". · `corroborated` flag, independent-domain check, conflict only when venues share no word; Festival After Dark UI, auth, feed, artists, settings, review, status pages. · `src/app/**`, `src/lib/feed.ts`, `supabase/migrations/…corroboration.sql`
- **~16:30 — Local owner mode (migration 3)** · Owner wanted to test without login. · FKs repointed to `profiles`, local owner profile, dev-only bypass (disabled in production/Vercel). · `src/lib/local-mode.ts`, `…local_owner_profiles.sql`
- **~16:45 — Notifications (migration 4)** · Alerts that never duplicate or lie. · Planner, dispatcher (reserve→send→retry), Telegram/Resend providers, in-app early-bird pop-up, secured cron endpoints; Telegram TEST delivered, failure/retry tested. · `src/lib/notify/**`, `src/app/api/cron/notify`, `…notifications.sql`
- **~17:10 — Scheduler + docs (migration 5)** · Hosting-limit-safe scheduling. · Rotating discovery cycle, atomic artist claims, GitHub Actions workflow, README, nine-checklist, components map SVG/PNG, secret scan. · `src/lib/discovery/cycle.ts`, `.github/workflows/scheduled-discovery.yml`, `docs/**`
- **~17:30 — First push to GitHub** · Owner approved publishing. · Committed 98 files, merged GitHub's initial commit, pushed. · all
- **~17:45 — FrontRow rename + tap-to-choose UI** · Owner wanted easy picking and a better name. · 176-artist catalogue, 33 genres, 115 cities, wizard, artist tiles, city picker, MENU overlay, lime theme. · `src/lib/catalog/**`, `src/components/ArtistPicker.tsx`, `CityPicker.tsx`, `src/app/start/**`
- **~17:50 — Vercel project created by owner** · Public deployment. · Project `live-show-radar` deployed from main; verified login enforced, cron secured, DB connected. · `vercel.json` (daily cron added)
- **~17:55 — Feed follows your picks + on-demand search + city order + Book show** · Owner saw only Anuv Jain/WCMT. · Default view = My artists; background search on follow; Find shows button; ordered city priority; Book show link. · `src/lib/feed.ts`, `src/lib/discovery/on-demand.ts`, `src/components/BookButton.tsx`, `FindShows.tsx`
- **~18:00 — GSAP motion + photo hero** · Owner asked for the reference site's UX. · GSAP ScrollTrigger effects, Unsplash placeholder photos, statement/numbered rows/footer. · `src/components/Motion.tsx`, `PhotoTile.tsx`, `src/lib/photos.ts`
- **~18:00 — Trial mode** · Owner wanted any email/password to work for the trial. · Passwordless session via admin magic-link; sign-up page banner; nobody admin in trial. · `src/app/login/**`, `src/lib/trial.ts`, `src/lib/auth.ts`
- **2026-10-12 18:10 — History view, more filters, placeholders, data fill** · Owner: page looked empty, wanted history + filters (venue, artist, type, month…) that are never empty. · Past-shows mode in the grounded search; `when=past` feed; filters venue/month/type/search/booking-link; facets with counts; `[Placeholder]` cards for empty combos and empty dashboard sections; bulk fill script found 26 real past shows before Gemini quota 429. · `src/lib/feed.ts`, `src/app/feed/page.tsx`, `src/app/page.tsx`, `src/components/EventCard.tsx`, `src/lib/discovery/sources/gemini-grounding.ts`, `on-demand.ts`, `scripts/fill-data.mjs`, `scripts/feed.test.mjs`
- **2026-10-12 18:10 — Context memory file + push policy** · Owner may run out of credits and wants another Claude to continue. · Created this file and `scripts/log-change.mjs`; policy: push to GitHub after every change. · `CONTEXT_MEMORY.md`, `scripts/log-change.mjs`

<!-- new entries are appended below by scripts/log-change.mjs -->
- **2026-10-12 18:05 IST — Pushed history/filters/placeholders/context file to GitHub** · Owner required GitHub and local to stay identical and a handover file for another Claude · Committed and pushed all pending work; production build, tsc, lint, 63 unit tests, DB checks and secret scan (122 files) all passed first · `CONTEXT_MEMORY.md, scripts/log-change.mjs, src/lib/feed.ts, src/app/feed/page.tsx, src/app/page.tsx, src/components/EventCard.tsx, scripts/fill-data.mjs`
- **2026-10-12 18:08 IST — Handle Google Search quota (429) explicitly; correct the 'free tier' claim** · Assistant wrongly called the quota 'free'; test showed plain Gemini calls return 200 and only search-grounding calls return 429, plan is unknown · fill-data stops on first 429; Find shows explains quota and points to AI Studio billing; handover file corrected · `scripts/fill-data.mjs, src/components/FindShows.tsx, CONTEXT_MEMORY.md`
- **2026-10-12 18:22 IST — Brief audit + start of credible-source research** · Owner asked to confirm the brief, audit done/missing, guardrails and metrics, and to make the credible-sources research a live part of the product · Wrote docs/BRIEF_AUDIT.md (requirement matrix, guardrails, metrics, enhancements, plan); stored the seed source file under research/; launched 7 parallel research agents (ticketing, promoters, venues x2, banks+bodies, press, apps+artists) writing research/_parts/*.json · `docs/BRIEF_AUDIT.md, research/seed-credible-event-sources.md`
- **2026-10-12 18:27 IST — Source research complete and merged** · Owner's credible-sources brief must feed the product; seven agents verified sources · Merged 199 sources (50 verified, 30 need review, 109 unverified, 10 rejected) into research/sources.json + sources.md + rejected.json; only 2 RSS feeds and ~6 sitemaps are monitorable (District/Eventbrite robots forbid RSS); added monitor modules keywords/gate/label/robots/feeds · `research/*, scripts/merge-sources.mjs, src/lib/monitor/*`
- **2026-10-12 18:48 IST — OpenRouter fallback for Gemini Flash + data fill** · Google search quota (429) blocked searches for most followed artists, so the feed showed only Anuv Jain; user supplied an OpenRouter key · Added src/lib/ai/llm.ts (Google first, OpenRouter Gemini Flash fallback); grounded adapter uses it; ran fill-data: 108 events (84 past), 129 sources; live monitor engine (src/lib/monitor) committed · `src/lib/ai/llm.ts, src/lib/discovery/sources/gemini-grounding.ts, src/lib/monitor/*, scripts/scan-secrets.mjs`
- **2026-10-12 19:23 IST — Newsroom, three separate links, one-page onboarding, artist photos** · User: UI cluttered across 3 huge pages; Book show opened a news article; wanted upcoming calendar on top with tickets/location/source links; artist tiles blank; 'Stadium presentation' shown as a venue · Newsroom (Just found + month calendar) on home; Book show now ONLY opens a ticketing site, else 'Tickets not announced'; separate Location (Maps) and Source (credibility-labelled) links; junk venues cleaned (cleanVenue); one-page onboarding with compact city picker; artist photos from Deezer/Wikipedia (192 of 194); find-tours script found 52 new upcoming shows incl. Fred again.. · `src/components/Newsroom.tsx, EventLinks.tsx, ArtistAvatar.tsx, BookButton.tsx, src/lib/feed.ts, src/lib/links.ts, src/app/page.tsx, src/app/events/[id]/page.tsx, src/app/start/Wizard.tsx, src/components/CityPicker.tsx, ArtistPicker.tsx, scripts/find-tours.mjs, fetch-artist-images*.mjs, clean-venues.mjs`
- **2026-10-12 19:32 IST — Audit report, photos everywhere, settings declutter, followed-artist search** · User asked whether photos were placed wherever artists appear and for a re-audit report · docs/AUDIT_REPORT.md; avatars on cards/event page/review; settings genres collapsed + compact cities; scripts/search-followed.mjs ran for all 17 followed artists · `docs/AUDIT_REPORT.md, src/components/EventCard.tsx, src/app/events/[id]/page.tsx, src/app/settings/SettingsForm.tsx, scripts/search-followed.mjs`
- **2026-10-12 19:35 IST — Smaller buttons, genre-first music-app artist picker, audit enhancements** · User: buttons too big; artist tiles should look like music apps with small name + tags; choose genre then artist, search for other genres; wants enhancement/loophole report · Site-wide button/field/chip size reduction; ArtistPicker rewritten (genre first, round photos, tag pills, search across genres, Following strip); AUDIT_REPORT section D · `src/app/globals.css, src/components/ArtistPicker.tsx, docs/AUDIT_REPORT.md`
- **2026-10-12 19:40 IST — Light theme, alerts for unverified shows, tick endpoint, calendar/share, map refresh** · Rubric: build due EOD 12 Oct (map 10%, Vercel link 10%, design 10%, backend 25%, demo 5%); user asked for light theme and PM-style features within 40 min · Light/dark toggle (CSS tokens + ink colour); alert planner now alerts UNVERIFIED/LIKELY/CONFIRMED with exact warning text and early-bird status line; /api/cron/tick (monitor + sweepStale + dispatch, 25-min guard); monitor extraction falls back to OpenRouter; add-to-calendar .ics + WhatsApp share; alert-status strip; Components Map regenerated (38 components) · `src/lib/notify/*, src/app/api/cron/tick/route.ts, src/lib/monitor/extract.ts, src/components/ThemeToggle.tsx, src/app/globals.css, src/app/events/[id]/page.tsx, scripts/build-components-map.mjs, docs/components-map.*`
- **2026-10-12 19:45 IST — Friendly search messages and Show all button** · User saw raw 'no OpenRouter key' errors on the live site and the newsroom showed every artist by default · Find shows: technical errors never shown, empty = 'no India shows announced yet', stops after 2 failed searches with one calm message; newsroom defaults to followed artists with explicit Show all genres and artists button (?all=1) · `src/components/FindShows.tsx, src/app/discover/actions.ts, src/app/page.tsx, src/components/Newsroom.tsx`
- **2026-10-12 19:50 IST — Find shows panel is owner-only** · User: customers must not see an ops panel with 'Find shows now' and 'Live search unavailable' · FindShows shown only to admins/local owner; customers get one calm line that artists are being watched; trial/live build never grants admin · `src/app/page.tsx, src/app/artists/page.tsx`
- **2026-10-12 20:01 IST — Live check after adding OPENROUTER_API_KEY in Vercel** · User added the key and redeployed; first live discovery still reported 'no OpenRouter key', so a fresh build was needed. The same run sent 20 alerts (52 planned, 32 capped for next run): alert path works · Pushed a log entry to trigger a new Vercel production build with the current env vars · `CONTEXT_MEMORY.md`
- **2026-10-12 20:13 IST — Multi-select genres, My artists tab, early-bird section, status panel removed, email sender fix** · User: multi-select genres; a My artists tab for favourites driving results and alerts; remove the status panel; where is early bird; emails failing · Picker genres multi-select (artists of any picked genre); /artists is now My artists (cards with next show or none announced, remove, + Add artists opens picker); early-bird section always visible with honest empty state; home status panel removed; found email failures = Resend 403 because ALERT_FROM_EMAIL was a gmail address: set to onboarding@resend.dev locally and in Vercel; live OpenRouter search verified (gemini step success) · `src/components/ArtistPicker.tsx, src/components/MyArtists.tsx, src/app/artists/page.tsx, src/app/page.tsx, src/components/Nav.tsx`
