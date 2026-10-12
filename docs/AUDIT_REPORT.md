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
