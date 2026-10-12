import type { SupabaseClient } from "@supabase/supabase-js";
import { dedupeKey, isPast, normalizeCity, normalizeName, parseDateField } from "../discovery/normalize.ts";
import { matchArtistsDeterministic } from "../discovery/match.ts";
import { persistDiscovery } from "../discovery/persist.ts";
import { loadArtists } from "../discovery/run.ts";
import type { ArtistRecord, RawDiscovery } from "../discovery/types.ts";
import { recomputeConfidence } from "./confidence.ts";
import { extractWithGemini, fromJsonLd, type Extracted } from "./extract.ts";
import { allowedByRobots, extractJsonLdEvents, fetchText, parseFeed, parseSitemap, stripHtml, type FeedItem } from "./feeds.ts";
import { relevanceGate } from "./gate.ts";
import { tierFor } from "./tiers.ts";

export interface MonitorOptions {
  geminiApiKey: string;
  geminiModel?: string;
  maxSources?: number;
  maxItemsPerSource?: number;
  maxAiPerRun?: number;
  budgetMs?: number;
  dryRun?: boolean;
  log?: (line: string) => void;
}

export interface MonitorSummary {
  sourcesPolled: number;
  sourcesBlocked: number;
  sourcesFailed: number;
  itemsSeen: number;
  itemsRelevant: number;
  eventsCreated: number;
  eventsUpdated: number;
  changesFlagged: number;
  aiCalls: number;
  perSource: { name: string; kind: string; status: string; seen: number; relevant: number; created: number; error?: string }[];
  elapsedMs: number;
}

const PLAUSIBLE_ARTIST = (n: string | null): n is string => !!n && n.length >= 2 && n.length <= 60 && !/^(live|tickets?|tba|tbc|various|the event|event|concert|festival|india|artist)$/i.test(n.trim());

async function ensureArtist(db: SupabaseClient, artists: ArtistRecord[], name: string): Promise<ArtistRecord | null> {
  const norm = normalizeName(name);
  if (!norm) return null;
  const hit = artists.find((a) => a.normalizedName === norm || a.aliases.includes(norm));
  if (hit) return hit;
  const { data, error } = await db.from("artists").insert({ name: name.trim(), normalized_name: norm, origin: "other", metadata: { added_by: "source_monitor" } }).select("id").single();
  if (error || !data) return null;
  await db.from("artist_aliases").upsert({ artist_id: data.id, alias: name.trim(), normalized_alias: norm }, { onConflict: "artist_id,normalized_alias", ignoreDuplicates: true });
  const rec: ArtistRecord = { id: data.id, name: name.trim(), normalizedName: norm, aliases: [norm] };
  artists.push(rec);
  return rec;
}

function toRaw(x: Extracted, item: { url: string; title: string }, source: { name: string }, artist: string): RawDiscovery {
  const d = parseDateField(x.dateIso);
  return {
    artistNames: [artist],
    title: (x.title ?? item.title).slice(0, 200),
    dateText: x.dateText,
    startsAt: d.startsAt,
    datePrecision: d.precision,
    dateBucket: d.bucket,
    venue: x.venue,
    city: normalizeCity(x.city),
    ticketUrl: x.method === "structured" ? x.ticketUrl : null, // only structured data may supply a ticket link
    sourceUrl: item.url,
    sourceTitle: source.name,
    externalId: x.method === "structured" ? "jsonld" : null,
    discoverySource: "source_monitor",
    excerpt: x.excerpt,
    aiReported: x.method === "ai",
    officialApiRecord: false,
  };
}

/** Early-bird, sale-start and card-offer facts are stored as evidence; a verified deadline needs tier 1 + structured data. */
async function applySignals(db: SupabaseClient, eventId: string, x: Extracted, item: { url: string }, tier: number, sourceName: string) {
  const bits = [
    x.earlyBird.mentioned ? `Early bird: ${x.earlyBird.excerpt ?? "mentioned"}` : null,
    x.saleStartText ? `Sale: ${x.saleStartText}` : null,
    x.cardOffers.length ? `Card offers: ${x.cardOffers.join(", ")}` : null,
  ].filter(Boolean);
  if (bits.length) {
    await db.from("event_evidence").insert({
      event_id: eventId, kind: "ticket_phase", evidence_url: item.url,
      excerpt: `[${sourceName}, ${x.method === "structured" ? "structured data" : "AI-read from the page text, please check"}] ${bits.join(" | ")}`.slice(0, 600),
    });
  }
  if (x.earlyBird.mentioned) {
    await db.from("events").update({ ticket_status: "early_bird_announced" }).eq("id", eventId).in("ticket_status", ["unknown", "upcoming", "tickets_available"]);
  }
  if (x.method === "structured" && tier === 1 && x.earlyBird.mentioned && x.earlyBird.endsIso) {
    const raw = x.earlyBird.endsIso;
    const ends = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T23:59:00+05:30`) : new Date(raw);
    if (!Number.isNaN(ends.getTime()) && ends.getTime() > Date.now()) {
      const { data: ev } = await db.from("event_evidence").insert({
        event_id: eventId, kind: "deadline", evidence_url: item.url,
        excerpt: `[${sourceName}, structured data] ${x.earlyBird.excerpt ?? "early bird"} valid through ${raw}`.slice(0, 500),
      }).select("id").single();
      if (ev) {
        await db.from("ticket_phases").insert({ event_id: eventId, phase: "early_bird", ends_at: ends.toISOString(), verification_status: "verified", evidence_id: ev.id, verified_at: new Date().toISOString() });
        await db.from("events").update({ ticket_status: ends.getTime() - Date.now() < 72 * 3600 * 1000 ? "early_bird_ending_soon" : "early_bird_announced" }).eq("id", eventId);
      }
    }
  }
}

/** Cancellations/postponements/changes: flag the known upcoming events for that artist (never create an event from a change notice). */
async function flagChange(db: SupabaseClient, artist: ArtistRecord, x: Extracted, item: { url: string }, tier: number, city: string | null): Promise<number> {
  const type = x.change.type;
  if (!type) return 0;
  const { data: links } = await db.from("event_artists").select("event_id").eq("artist_id", artist.id);
  const ids = (links ?? []).map((l) => l.event_id as string);
  if (!ids.length) return 0;
  const { data: evs } = await db.from("events").select("id, city, starts_at, verification_status").in("id", ids);
  const now = Date.now();
  const hits = (evs ?? []).filter((e) => (!e.starts_at || Date.parse(e.starts_at as string) >= now - 86400000) && (!city || !e.city || normalizeName(e.city as string) === normalizeName(city)));
  for (const e of hits) {
    const patch: Record<string, unknown> = { change_flag: type };
    if (type === "cancelled" && tier > 0 && tier <= 2) patch.verification_status = "cancelled";
    await db.from("events").update(patch).eq("id", e.id);
    await db.from("event_evidence").insert({ event_id: e.id, kind: "cancellation", evidence_url: item.url, excerpt: `[${type}] ${x.change.excerpt ?? ""}`.slice(0, 500) });
  }
  return hits.length;
}

/**
 * One monitoring pass: poll vetted sources whose robots.txt allows it, gate for relevance (Step 1), extract facts
 * (Step 2: structured data first, Gemini Flash text reading second), label by source credibility (Step 3), save.
 */
export async function runMonitor(db: SupabaseClient, o: MonitorOptions): Promise<MonitorSummary> {
  const started = Date.now();
  const log = o.log ?? (() => {});
  const maxItems = o.maxItemsPerSource ?? 10;
  let aiBudget = o.maxAiPerRun ?? 12;
  const budget = o.budgetMs ?? 120_000;
  const sum: MonitorSummary = { sourcesPolled: 0, sourcesBlocked: 0, sourcesFailed: 0, itemsSeen: 0, itemsRelevant: 0, eventsCreated: 0, eventsUpdated: 0, changesFlagged: 0, aiCalls: 0, perSource: [], elapsedMs: 0 };

  const { data: sources } = await db.from("sources").select("*").eq("active", true).order("last_polled_at", { ascending: true, nullsFirst: true }).limit(o.maxSources ?? 6);
  const artists = await loadArtists(db);
  const watch = artists.map((a) => a.name);

  for (const s of sources ?? []) {
    if (Date.now() - started > budget) break;
    const row = { name: s.name as string, kind: s.kind as string, status: "ok", seen: 0, relevant: 0, created: 0, error: undefined as string | undefined };
    sum.perSource.push(row);
    sum.sourcesPolled++;
    const touch = async (patch: Record<string, unknown>) => !o.dryRun && db.from("sources").update({ last_polled_at: new Date().toISOString(), ...patch }).eq("id", s.id);

    if (!(await allowedByRobots(s.feed_url as string))) {
      row.status = "blocked_by_robots";
      sum.sourcesBlocked++;
      log(`${s.name}: robots.txt does not allow ${s.feed_url}`);
      await touch({ robots_ok: false, robots_checked_at: new Date().toISOString(), last_error: "blocked by robots.txt" });
      continue;
    }
    let feedRes = await fetchText(s.feed_url as string);
    if (!feedRes.ok) {
      row.status = "fetch_failed";
      row.error = `HTTP ${feedRes.status}`;
      sum.sourcesFailed++;
      await touch({ robots_ok: true, last_error: `feed fetch failed (HTTP ${feedRes.status})` });
      continue;
    }

    // candidate items
    let items: FeedItem[] = [];
    try {
      if (s.kind === "rss") {
        items = parseFeed(feedRes.text);
        if (items.length === 0 && /<html[\s>]/i.test(feedRes.text.slice(0, 2000))) {
          // the "feed" URL is a web page: follow its own feed link if it advertises one, otherwise switch the source off
          const alt = feedRes.text.match(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*href=["']([^"']+)["']/i)?.[1];
          const next = alt ? new URL(alt, s.feed_url as string).toString() : null;
          const retry = next && (await allowedByRobots(next)) ? await fetchText(next) : null;
          if (retry?.ok && (items = parseFeed(retry.text)).length > 0) {
            feedRes = retry;
            if (!o.dryRun) await db.from("sources").update({ feed_url: next }).eq("id", s.id);
          } else {
            row.status = "not_a_feed";
            row.error = "feed URL returns a web page, not RSS/Atom";
            sum.sourcesFailed++;
            await touch({ active: false, robots_ok: true, last_error: "feed URL returns a web page, not RSS/Atom; switched off (needs a real feed URL)" });
            continue;
          }
        }
      } else {
        let sm = parseSitemap(feedRes.text);
        if (sm.children.length) {
          const kids = sm.children.slice(-2);
          const all = { children: [] as string[], urls: [] as { url: string; lastmod: string | null }[] };
          for (const k of kids) {
            const r = await fetchText(k);
            if (r.ok) all.urls.push(...parseSitemap(r.text).urls);
          }
          sm = all;
        }
        items = sm.urls
          .sort((a, b) => (b.lastmod ?? "").localeCompare(a.lastmod ?? ""))
          .slice(0, 60)
          .map((u) => ({ url: u.url, title: "", text: "", publishedAt: u.lastmod }));
      }
    } catch (e) {
      row.status = "parse_failed";
      row.error = e instanceof Error ? e.message.slice(0, 80) : "parse error";
      sum.sourcesFailed++;
      await touch({ robots_ok: true, last_error: `could not parse feed: ${row.error}` });
      continue;
    }

    const { data: known } = await db.from("source_items").select("url").eq("source_id", s.id).in("url", items.map((i) => i.url).slice(0, 200));
    const seen = new Set((known ?? []).map((k) => k.url as string));
    const fresh = items.filter((i) => !seen.has(i.url)).slice(0, maxItems);
    const tier = Number(s.tier);

    for (const it of fresh) {
      if (Date.now() - started > budget) break;
      row.seen++;
      sum.itemsSeen++;
      let html = "";
      let text = `${it.title}. ${it.text}`;
      let jsonLd: Record<string, unknown>[] = [];
      if (s.kind === "sitemap" || it.text.length < 120) {
        if (!(await allowedByRobots(it.url))) continue; // never fetch a page the site disallows
        const page = await fetchText(it.url);
        if (page.ok) {
          html = page.text;
          jsonLd = extractJsonLdEvents(html);
          const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? it.title;
          const desc = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "";
          // menus, headers and footers mention cities and "tickets" on every page, so judge the main content only
          const main = html.replace(/<(nav|header|footer|aside|form|script|style|noscript)[\s\S]*?<\/\1>/gi, " ");
          text = `${stripHtml(title)}. ${stripHtml(desc)}. ${stripHtml(main).slice(0, 2500)}`;
          it.title = stripHtml(title).slice(0, 200);
        }
      }

      const gate = relevanceGate(text, { watchlist: watch });
      const base = { source_id: s.id, url: it.url, title: it.title.slice(0, 300), published_at: it.publishedAt, relevance_pass: gate.pass, reasons: gate.reasons, high_priority: gate.priority === "high" };
      if (!gate.pass) {
        if (!o.dryRun) await db.from("source_items").upsert(base, { onConflict: "source_id,url", ignoreDuplicates: true });
        continue;
      }
      row.relevant++;
      sum.itemsRelevant++;

      let extracted: Extracted[] = jsonLd.map((e) => fromJsonLd(e, it.url));
      if (!extracted.length) {
        if (aiBudget <= 0) continue; // stay inside the Gemini budget; picked up next run (not recorded as seen)
        aiBudget--;
        sum.aiCalls++;
        try {
          extracted = [await extractWithGemini({ title: it.title, text, published: it.publishedAt, url: it.url }, { apiKey: o.geminiApiKey, model: o.geminiModel })];
        } catch (e) {
          log(`${s.name}: extraction failed for ${it.url}: ${e instanceof Error ? e.message : e}`);
          continue;
        }
      }

      let eventId: string | null = null;
      let label: string | null = null;
      for (const x of extracted) {
        if (!x.isEvent || x.inIndia === false) continue;
        if (!PLAUSIBLE_ARTIST(x.artist)) continue;
        if (o.dryRun) {
          log(`  would save: ${x.artist} | ${x.city ?? "?"} | ${x.dateIso ?? "?"} | early-bird ${x.earlyBird.mentioned} | change ${x.change.type ?? "-"} [${x.method}]`);
          continue;
        }
        const artist = await ensureArtist(db, artists, x.artist);
        if (!artist) continue;
        const city = normalizeCity(x.city);
        if (x.change.type) sum.changesFlagged += await flagChange(db, artist, x, it, tier, city);
        const raw = toRaw(x, it, { name: s.name as string }, artist.name);
        if (!raw.startsAt && raw.datePrecision === "unknown" && !x.change.type && !gate.cardOffers.length && !x.earlyBird.mentioned && !x.saleStartText) continue; // nothing concrete to store
        if (isPast(raw.startsAt, new Date())) continue;
        const matches = matchArtistsDeterministic(raw, [artist]);
        const key = dedupeKey(artist.name, raw.city, raw.dateBucket);
        void key;
        const res = await persistDiscovery(db, raw, matches, artists);
        if (res.eventId) {
          eventId = res.eventId;
          if (res.action === "created") {
            sum.eventsCreated++;
            row.created++;
          } else sum.eventsUpdated++;
          await applySignals(db, res.eventId, x, it, tier, s.name as string);
          label = (await recomputeConfidence(db, res.eventId)).label;
        }
      }
      if (!o.dryRun) await db.from("source_items").upsert({ ...base, extracted: extracted[0] ?? null, label, event_id: eventId }, { onConflict: "source_id,url" });
    }

    await touch({
      robots_ok: true, robots_checked_at: new Date().toISOString(), last_success_at: new Date().toISOString(), last_error: null,
      items_seen: Number(s.items_seen ?? 0) + row.seen, items_relevant: Number(s.items_relevant ?? 0) + row.relevant, events_created: Number(s.events_created ?? 0) + row.created,
    });
    log(`${s.name} (${s.kind}, tier ${tier}): seen ${row.seen}, relevant ${row.relevant}, new events ${row.created}`);
  }
  sum.elapsedMs = Date.now() - started;
  return sum;
}

/** Marks upcoming, never-confirmed events whose information has not been re-checked for 21 days as stale. */
export async function sweepStale(db: SupabaseClient): Promise<number> {
  const cutoff = new Date(Date.now() - 21 * 86400000).toISOString();
  const { data } = await db
    .from("events")
    .update({ verification_status: "stale" })
    .eq("verification_status", "pending_verification")
    .eq("is_sample", false)
    .gt("starts_at", new Date().toISOString())
    .lt("last_checked_at", cutoff)
    .select("id");
  return data?.length ?? 0;
}

export { tierFor };
