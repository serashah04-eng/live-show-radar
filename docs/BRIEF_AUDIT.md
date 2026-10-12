# Brief audit: what is done, what is satisfied, what is left

Audit date: 2026-10-12 (evening IST). Scored on what was actually tested, not on intention. Status: **Met** (works and tested), **Partial**, **Not met**.

## The brief being audited

1. **Exam problem statement (MESA C4, "Live Show Radar"):** Karan follows ~60 artists (Indian indie + international acts that tour India) and keeps missing shows and early-bird windows. Build and deploy an AI-powered alert system that **monitors the concert and festival calendar for every artist he follows and notifies him the moment a show is announced in India**: artist, venue, date, and whether early-bird passes are available or imminent, with any early-bird deadline **flagged clearly**. Bengaluru first, but a Mumbai/Chennai show still alerts. Rules: live external data wherever possible (works with some data at submission), **all AI must be Gemini Flash (no Claude API)**, deploy on **Vercel**, submit a **public URL + GitHub repo + Components Map**.
2. **Master build prompt:** nine-checklist, six stages, verified-vs-unverified evidence, Telegram + email alerts with dedupe/retries, personalization rubric, honest empty states, metrics, guardrails, README, final Components Map.
3. **Credible-sources brief (research + detection rules):** vetted source list (`sources.json`/`sources.md`), keyword rules and Step 1/2/3 detection (`keywords.json`, `detection_rules.md`) with labels CONFIRMED / LIKELY / UNVERIFIED. The user's direction: this must become a **live, running task inside the product**, not just documents.

## Requirement matrix

| # | Requirement | Status | Evidence / gap |
|---|---|---|---|
| 1 | Monitor shows for every followed artist | **Partial** | Gemini+Google Search grounding per artist works, but is inconsistent run to run, slow (1 to 3 min/artist) and hit a search-quota 429. Only 9 upcoming events stored. Credible-source monitor not built yet. |
| 2 | Notify "the moment" a show is announced | **Not met** | Vercel Hobby cron is daily; the 30-minute GitHub Actions job needs `SITE_URL` + `CRON_SECRET` repo secrets (not added). Search-based discovery is also slow. |
| 3 | Alert shows artist, venue, date, early-bird status | **Partial** | Messages carry artist/venue/date/source links. Early-bird appears only when an owner verified a phase; nothing detects early-bird automatically. |
| 4 | Early-bird deadline flagged clearly | **Partial** | Orange badge, dashboard watch, pop-up and urgent alert are built and unit-tested; never seen with real data. |
| 5 | Bengaluru first, all India | **Met** | Ordered city priority (#1 listed first), all 115 cities, tested. |
| 6 | Mumbai/Chennai shows still alert | **Met (logic)** | Planner includes every city (unit tested). Live delivery proven only with a labelled TEST Telegram message. |
| 7 | ~60 followed artists | **Partial** | 176-artist catalogue + tap tiles + "add artist". No Spotify/list import yet. |
| 8 | Live external data, works at submission | **Partial** | 35 real events with 48 cited source links (26 past). Upcoming is thin; placeholders fill empty views, clearly labelled. |
| 9 | All AI = Gemini Flash | **Met** | Only Gemini (`gemini-flash-latest`) is used; no Claude API in the app. |
| 10 | Deployed on Vercel, public URL | **Met** | https://live-show-radar-gamma.vercel.app (login enforced, cron secured). Trial mode: any email/password. |
| 11 | GitHub repo | **Met** | Public, synced with local after every change. |
| 12 | Components Map | **Partial** | v1 exists but is stale (predates trial mode, history, filters, deployment, source monitor). Regenerate at the end. |
| 13 | Telegram alerts | **Met** | Test message delivered; dedupe and failure/retry tested live. |
| 14 | Email alerts | **Not tested** | Needs `ALERT_TO_EMAIL` (Resend test sender only reaches the owner's address). |
| 15 | Dedupe + retries + logs | **Met** | Unique key per alert/channel/recipient, 3 attempts with backoff, failures visible. |
| 16 | Personalization rubric | **Met** | Genres, artists, cities, independent channels, persisted; feed scopes; filters never empty (labelled placeholders). |
| 17 | Credible-source monitoring (new) | **Not met** | Research in progress; no source registry, feed monitor, keyword gate or CONFIRMED/LIKELY/UNVERIFIED labels yet. |
| 18 | Nine-checklist final | **Partial** | `docs/NINE-CHECKLIST.md` is stale; rescore after the source monitor. |

## Guardrails check

| Guardrail | Status | Note |
|---|---|---|
| Never fabricate events, dates, prices, links | **Met** | Gemini must cite a real page it used; unstated fields stay null; sample cards are `[Placeholder]`, in-memory only, never alerted, no booking link. |
| Verified vs unverified vs conflicting | **Met / will change** | Current tiers: Unconfirmed / Reported by 2+ sites / Verified. The new brief's CONFIRMED / LIKELY / UNVERIFIED will map onto these, and an UNVERIFIED alert carries the required warning text. |
| No scraping or bypassing restrictions | **Met** | No scraping of BookMyShow/District/SkillBox. The new monitor must check robots.txt/terms per source and honour them. |
| No secrets in git | **Met** | Scan passes on every push (122+ files + bundle). Repo is public. |
| AI never invents facts | **Met** | Two-step design (search, then extraction tied to a cited page index). |
| Dedupe and controlled retries | **Met** | Tested live. |
| Sample data labelled | **Met** | `[Placeholder]` + "Sample data" badge. |
| User controls preferences | **Met** | Independent toggles; persisted. |
| Stale information handled | **Not met** | Nothing marks events stale automatically. |
| Conflicting sources | **Partial** | Venue and exact-date conflicts only; price/sale-date conflicts not covered. |
| Abuse and rate limiting | **Not met** | Trial mode lets anyone sign in and trigger searches (cooldown + 6 per 5 min cap exist, but no per-user/IP limits). |
| Access control | **Partial** | Trial mode: nobody is admin on the public site (by design). Signed-in RLS policies are not tested with real users. |
| Paid dependency disclosure | **Partial** | Gemini Search grounding is quota-limited; plan/billing is unknown and needs the owner's check. |

## Metrics check

Have: discovery runs (found/new/failed per source), events/verified/corroborated/conflict counts, alerts sent/failed, duplicates prevented, failed-delivery list.
Missing (brief asked for them): **discovery-to-alert delay**, relevant events per source (hit rate/precision), matches to followed artists and genres, effect of preference changes, stale/conflicting counts over time, source health and latency, search-quota usage, per-source early-bird detections.

## Missing or worth enhancing (priority order)

1. **Live credible-source monitor** (the user's new requirement; see plan below).
2. **Automatic early-bird detection** from tier-1 sources, quoted with evidence (core of the brief).
3. **Faster than daily:** configure the GitHub 30-minute job, plus the monitor is cheap (feeds, no search quota).
4. **List import** (paste ~60 names; Spotify OAuth later) so Karan's real list can be loaded in one step.
5. **Stale and cancellation/postponement handling** (auto-mark past/stale; keyword-detect changes, high priority).
6. **Metrics page** with the missing measures above.
7. **Search fallback:** cache grounded results, fewer retries, second key/model, health alert to Telegram when discovery fails.
8. **Rate limits** on trial login and Find shows; run an end-to-end test (Playwright) for the main journeys.
9. Test email; see the early-bird pop-up with a real verified phase; regenerate the Components Map and rescore the nine-checklist.

## Plan: incorporate the source research as a live task

1. Merge agent output into `research/sources.json` + `sources.md` (verified/rejected/needs-review).
2. Table `sources` (+ `source_items`, `source_runs`): registry with tier, feed/events URL, robots/terms flag, last-checked, health.
3. Cron `/api/cron/monitor`: poll only sources with a permitted feed/page (robots checked), fetch new items, apply **Step 1 relevance gate** (intent keywords + India venue/city), **Step 2 extraction** with Gemini Flash from the item text only (blank when not stated), **Step 3 credibility label** (CONFIRMED/LIKELY/UNVERIFIED) with source tier, conflict display, and upgrade notice when an official source appears.
4. Persist into the existing events/sources/evidence/ticket_phases model; early-bird/phase facts from tier-1 text stored with quote + URL.
5. Alerts: existing dispatcher with label wording and the required warning for UNVERIFIED; cancellations/postponements high priority; upgrade notices.
6. Metrics page, tests (relevance gate, labels, 15+ worked examples), docs, map, push + log.
