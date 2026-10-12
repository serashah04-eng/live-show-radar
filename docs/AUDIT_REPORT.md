# FrontRow: audit report (2026-10-12)

Written from the point of view of a first-time user and of someone presenting this to a client. "Verified" means I opened it and saw it work; "Not verified" means I could not check it.

## A. Fixed in this pass
| # | Problem | Fix |
|---|---|---|
| 1 | "Book show" opened a news article | Booking now only ever opens a ticketing site; otherwise "Tickets not announced". Location (Maps) and Source (credibility-labelled) are separate links |
| 2 | Junk venues ("Stadium presentation", "TBA") shown as places | `cleanVenue` filter at ingestion + 5 stored rows cleaned |
| 3 | Onboarding was 3 full pages, genre wall of 36 chips | One page: cities row + photo grid + sticky save |
| 4 | Artist tiles blank | Photos (Deezer, Wikipedia) for 192 of 194 artists; on picker, newsroom, feed/home cards, event page, review queue |
| 5 | No "what's coming up" at the top | Newsroom: Just found + month calendar, every row links to event / tickets / map / source |
| 6 | Only Anuv Jain results | Cause: events only exist for artists that were searched; Google search quota (429) blocked the rest. OpenRouter Gemini Flash fallback added; all 17 followed artists searched |
| 7 | Settings page: genre wall and full city list open by default | Genres collapsed, cities compact |
| 8 | Home page far too long (statement, five steps, featured artists, photo band) | Cut; status collapsed |

## B. Found and NOT yet fixed (my list, in priority order)
1. **Production has no search path.** Google search quota is exhausted again (HTTP 429). OpenRouter works, but `OPENROUTER_API_KEY` is only in `.env.local`; it must be pasted into Vercel env vars (cannot be done from here safely). Until then the live site cannot refresh.
2. **Alerts do not yet follow the credible-sources brief.** Telegram/email still only fire for corroborated or verified shows. The brief wants UNVERIFIED shows alerted too, with the warning text, plus "now confirmed by" upgrades and cancellation/postponement alerts. Migration `…060000_alert_label.sql` is written but not applied; planner/messages/UI not changed.
3. **Live monitor is not scheduled.** Engine, tiers, gate and labelling exist and a dry run worked, but there is no `/api/cron/monitor` or `/api/cron/tick`, Vercel cron is daily only, and the 30-minute GitHub workflow needs two secrets you have not added.
4. **Photos are not in Telegram/email alerts, the early-bird pop-up or the Find-shows log.** No photo credit page yet (Deezer and Wikimedia ask for credit).
5. **Feed filter form is heavy** (radio groups plus many selects). Works, but is not "easy". Needs a compact bar with a "More filters" drawer.
6. **Some Deezer photos are album art**, not a face (smaller artists). Cannot be told apart automatically.
7. **Streamed pages not verified** (Status, Submit, Review): the preview tab shows "Loading…" because hidden tabs do not paint streamed content. Code type-checks; visual check pending in a normal browser.
8. **Mobile layout not re-checked** after the redesign.
9. **Missing from the brief:** metrics page, rate limiting on trial login and Find shows, bulk paste of artist names, email test (Resend only sends to the account owner's address), `detection_rules.md` with 15+ worked examples, `keywords.json`.
10. **Docs stale:** `docs/NINE-CHECKLIST.md`, Components Map image, README sections about the monitor and the OpenRouter fallback.
11. **Stale events:** past-dated "upcoming" events are not swept automatically yet (`sweepStale` exists, not scheduled).

## C. Data honesty notes
- 2026-10-12 search: Martin Garrix, Zedd, Calvin Harris, Marshmello, David Guetta, Tiesto, Kygo, SHM, Armin, Diplo, Above & Beyond, Skrillex, Alan Walker, Afrojack returned **no announced India dates**. A search for Martin Garrix mentioned a media hint of a planned India tour; hints are rumours and are **not** stored as events.
- Almost every stored upcoming show is UNCONFIRMED. Few have a ticketing link, so most show "Tickets not announced". That reflects the sources, not a bug.
- All AI is Gemini Flash (Google API first, Gemini Flash via OpenRouter as fallback). No Claude API is called by the app.

## D. Enhancements and loopholes (user view, then assessment view)

### From a user's seat
1. **The first-run promise is "alerts", but a new user cannot tell alerts are on.** Add one line on the home page: "Telegram: connected / email: not set up" with a button. Today that lives in Settings.
2. **Every card says UNCONFIRMED.** Honest, but a wall of the same badge teaches people to ignore it. Show the badge only when it differs from the norm, and explain once ("found by search, check the source").
3. **Following an artist with no announced India dates shows nothing.** Add an "Artist page" line: "No India dates announced as of <date>; we check every 30 min" so empty is clearly intentional.
4. **Calendar is a list.** A real month grid (dots on days) with click-through would read faster.
5. **Add to calendar (.ics) and Share** buttons on the event page are cheap and useful.
6. **City priority is hidden.** After onboarding the user never sees "Bengaluru first" working. Show a "In Bengaluru" strip at the top of the newsroom.
7. **Photos:** some are album art. Allow a user to ignore a bad photo; fall back to monogram.

### Loopholes I can see
1. **Stale shows.** A show that has passed or been cancelled can linger as "upcoming" because the sweep is not scheduled.
2. **Duplicate shows** across spellings of a venue (e.g. "Mahalaxmi Racecourse" vs "Mahalaxmi Race Course (Polo Ground)") may not merge; dedupe key is artist+city+date only, so duplicates are possible within the same day if the city string differs ("Navi Mumbai" vs "Mumbai").
3. **Wrong-artist match.** A band name that is a common word (e.g. "Divine", "Raftaar") could attach unrelated events; deterministic matching needs a context check for single-word names.
4. **Rumours.** The AI search sometimes mentions hints ("media hinted a tour"). They are dropped today only because they carry no date; add an explicit "rumour" rule and a test.
5. **Ticket link correctness.** A ticketer page that came up in search may be an artist page, not that show. The UI says "check it lists this show"; a stricter check (page title contains date/city) would be better.
6. **Trial mode:** any email/password works by design; no rate limit yet, so someone could create unlimited accounts. Needs a limit before public use.
7. **Public URL cost risk:** the "Find shows" and any tick endpoint spend paid AI credit. Needs per-user and global caps.
8. **Secrets:** the OpenRouter key was pasted into chat; rotate it.

### From an assessor's seat (until you share the rubric)
- They will test the exam story end to end: *follow artists, a new show appears, an alert arrives with artist/venue/date/early-bird status.* The weakest link today is the **alert path for UNCONFIRMED shows** (section B2) and **the monitor not running on a schedule** (B3). I will fix these first.
- They will check **no hallucination**: every event has a stored source URL and an "AI-reported/unverified" label; booking links are ticketer-only; past/unknown fields stay empty. Add a visible "How we decide" page linking the rules.
- They will check **AI = Gemini Flash only**: true (Google API, with Gemini Flash via OpenRouter as fallback). State this in the README.
- They will check **Components Map, GitHub history, public URL**: map is stale, README needs the monitor + fallback sections.
- They will look for **evidence of testing**: 63 unit tests exist; add a short TEST_REPORT.md with the commands and results.
