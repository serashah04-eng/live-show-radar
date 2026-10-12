# Nine-checklist: final assessment

Scored on what was actually tested (12 Oct 2026), not on intention. "Partial" means part of it is proven and part is not.

| # | Check | Status | Evidence | Remaining risk and what would change the score |
|---|---|---|---|---|
| 1 | Problem real? | **Pass** | The problem statement describes specific missed shows and early-bird windows. The product is built around relevance, not a directory: the feed applies saved artists, genres and cities (16 behaviour tests), and alerts only fire for evidence-backed events. | Only one user (Karan) defines the need. |
| 2 | Workflow repeated? | **Partial** | A secured `/api/cron/discover` cycle ran against a production build: one cycle took 265 s, then after tuning three parallel cycles took 167 to 185 s. The GitHub Actions workflow is written, but it has **not run** because the app is not deployed. | Needs a deployed site, two GitHub secrets, and a few real scheduled runs. Parallel runs competed for Gemini: 1 of 3 completed a grounded search. |
| 3 | Input available? | **Partial** | Ticketmaster key works but returned **0 events for India and for Bengaluru** (and for the 5 starter artists). Gemini + Google Search grounding found 8 candidate events (Anuv Jain: Jaipur, Chennai, Kochi, Noida, Mumbai, Bhubaneswar; When Chai Met Toast: near Bengaluru) with 21 stored source links. BookMyShow, District and SkillBox have no permitted API, so they appear only as search-cited pages or user-submitted links. | Grounding is **inconsistent run to run**: the same artist sometimes returns no grounded sources, so a missed show is possible. No permitted official India feed has been found. |
| 4 | Output valuable? | **Partial** | A labelled Telegram TEST message was delivered (Telegram API accepted it) and the feed, event pages and filters work. | Email delivery is untested (needs `ALERT_TO_EMAIL`). The in-app early-bird pop-up has never been seen on screen. No real alert has been acted on. |
| 5 | Impact measurable? | **Partial** | The Status page and database track runs (19 recorded, 0 failed), events found and new, sources, corroborated and conflicting events, alerts sent and failed, and duplicates prevented. | Discovery-to-alert delay is not measured. Effect of preference changes is covered by unit tests, not a metric. |
| 6 | Failure risk acceptable? | **Pass** | Search and AI results are always `pending_verification`; only an official API record or an owner review with an evidence URL and quote can verify. A database constraint rejects a verified ticket phase without evidence (tested). Deadlines are never guessed. "Reported by 2+ sites" is a separate, honestly worded label. Source disagreement sets a conflict flag and blocks alerts (tested). | Conflict detection only covers venue and exact date. A wrong but widely copied listing could still be corroborated. |
| 7 | Judgment protected? | **Pass** | Genres (OR logic, All genres, strict mode), followed artists, cities, and Telegram/email channels are independent and saved in Supabase. Tested: settings survive a reload; Telegram off leaves email on; early-bird alerts off leaves verified data visible; resetting filters does not touch saved preferences. The app informs only. | None found. |
| 8 | ROI worth it? | **Partial** | Everything so far runs on free tiers (Supabase 28 of 500 MB, Gemini free key, Ticketmaster free key, Resend test sender, Vercel Hobby, GitHub Actions on a public repo). | Gemini grounding free-tier limits are unknown and are the likely bottleneck. Resend can only email one address until a domain is verified. Vercel Hobby cron is daily only, so GitHub Actions is required. |
| 9 | Owner clear? | **Partial** | README, `.env.example`, this checklist, operations notes below, and a components map exist. Secrets scan passes (92 committable files, 26 browser-bundle files). | Deployment, the scheduler, and a real signed-in login have not been tested. This becomes Pass after deployment. |

## Initial-release acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Runs locally and can be deployed | Runs locally and builds for production (tested). **Not yet deployed.** |
| 2 | Supabase persistence and access policies verified | Tables, seed, signed-out blocking and constraints tested (`scripts/test-db.mjs`). Signed-in policies are not tested with a real account. |
| 3 | At least one permitted source gives usable data, limits documented | Gemini grounding gives candidate data; Ticketmaster gives none for India. Limits documented. |
| 4 | Users can change genres, followed artists, cities | Tested in the UI. |
| 5 | Preference changes affect results | Tested (UI reload, filter and unit tests). |
| 6 | Verified is distinguished from unverified | Built and unit tested. Nothing is verified yet because no owner review has been done. |
| 7 | Telegram and email testable and respect preferences | Telegram tested. Email untested. Preference rules unit tested. |
| 8 | Notification deduplication works | Tested live (duplicate blocked and counted) and in unit tests. |
| 9 | Newly verified early-bird phases can trigger alerts | Covered by unit tests only. No live verified phase has been created. |
| 10 | Secrets protected and core journeys pass | Secret scan passes. Core journeys tested locally; signed-in journeys on a deployed site are not. |

A successful connection to one event API does not prove coverage of concerts across India. Ticketmaster in particular has no India coverage for these artists.
