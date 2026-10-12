import { cleanVenue } from "../../feed.ts";
import { searchWeb, generateJson, type LlmOptions } from "../../ai/llm.ts";
import { normalizeCity, parseDateField, isPast } from "../normalize.ts";
import type { DiscoveryContext, RawDiscovery, SourceAdapter } from "../types.ts";

interface ExtractedEvent {
  artist?: string;
  title?: string;
  date_text?: string | null;
  date_iso?: string | null;
  venue?: string | null;
  city?: string | null;
  source_index?: number;
  has_ticket_link?: boolean;
  early_bird_mentioned?: boolean;
  early_bird_excerpt?: string | null;
  excerpt?: string | null;
}

interface Chunk {
  uri: string;
  host: string;
}

export interface GeminiGroundingOptions {
  apiKey: string;
  model?: string;
  /** Fallback when Google refuses (quota): Gemini Flash through OpenRouter. */
  openrouterKey?: string;
  openrouterModel?: string;
  cities?: string[];
  /** Pauses between artists to stay inside free-tier rate limits. */
  delayMs?: number;
  /** Extra search focus, used for targeted corroboration of one known event. */
  focus?: string;
  /** "past" looks for shows that already happened (history); default is upcoming shows. */
  mode?: "upcoming" | "past";
  /** Earliest date (YYYY-MM-DD) to accept in past mode. */
  sinceDate?: string;
  /** Epoch ms: stop starting new artists after this time (hosting time limits). */
  deadlineMs?: number;
  /** Called after each artist's search finished without throwing. */
  onArtistDone?: (artistId: string) => void;
  onDebug?: (line: string) => void;
}

const API = "https://generativelanguage.googleapis.com/v1beta/models";

async function generate(model: string, apiKey: string, body: unknown) {
  const res = await fetch(`${API}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(`Gemini HTTP ${res.status}: ${j?.error?.status ?? ""} ${String(j?.error?.message ?? "").slice(0, 160)}`);
  }
  return res.json();
}

const textOf = (j: { candidates?: { content?: { parts?: { text?: string }[] } }[] }) =>
  j?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

/** Follows Google's grounding redirect to the real page URL (max 4 hops). Falls back to the redirect URL. */
async function resolveRedirect(uri: string): Promise<string> {
  let url = uri;
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { method: "GET", redirect: "manual" });
      const loc = r.headers.get("location");
      if (r.status >= 300 && r.status < 400 && loc) url = new URL(loc, url).toString();
      else break;
    } catch {
      break;
    }
  }
  return url;
}

/**
 * Finds CANDIDATE events with Gemini Flash + Google Search grounding.
 * Everything it returns is AI-reported and unverified. Safeguards:
 *  1. Step 1 is a grounded search answered in prose, so Google returns the pages it really used.
 *  2. Step 2 extracts structured events (no tools) and must cite one of those pages by index;
 *     the stored source URL is that page's resolved URL, never a URL typed by the model.
 *  3. Unstated fields stay null; dates are accepted only as YYYY-MM[-DD]; past events are dropped.
 */
export function createGeminiGroundingAdapter(opts: GeminiGroundingOptions): SourceAdapter {
  const model = opts.model ?? "gemini-flash-latest";
  const llm: LlmOptions = { googleKey: opts.apiKey, googleModel: model, openrouterKey: opts.openrouterKey ?? process.env.OPENROUTER_API_KEY, openrouterModel: opts.openrouterModel ?? process.env.OPENROUTER_MODEL ?? "google/gemini-3.8-flash", provider: "auto" };
  return {
    name: "gemini_grounding",
    async discover(ctx: DiscoveryContext): Promise<RawDiscovery[]> {
      const out: RawDiscovery[] = [];
      const today = ctx.today.toISOString().slice(0, 10);
      const cityHint = (opts.cities?.length ? opts.cities : ["Bengaluru"]).join(", ");
      const past = opts.mode === "past";
      const since = opts.sinceDate ?? "2025-01-01";

      for (const artist of ctx.artists) {
        if (opts.deadlineMs && Date.now() > opts.deadlineMs) break;
        const names = [artist.name, ...artist.aliases.filter((a) => a !== artist.normalizedName)].slice(0, 4);

        // Step 1: grounded search (prose)
        const searchPrompt = `You MUST use Google Search before answering; do not answer from memory. ${opts.focus ? `Focus especially on finding a DIFFERENT website than the obvious one that lists this event: ${opts.focus}. ` : ""}${past ? `Run several searches, e.g. "${artist.name} India concert 2025", "${artist.name} live in India past shows", "${artist.name} concert review India". Today is ${today}. Search the web for live concerts or festival appearances in INDIA by "${artist.name}" (also known as: ${names.join(", ")}) that ALREADY TOOK PLACE between ${since} and ${today}. Only report events whose page states the exact date and city. For each event give the title, exact date, venue, city, and which website reported it. If you find nothing, say "no past India events found". Never guess.` : `Run several searches, e.g. "${artist.name} India tour 2026", "${artist.name} Bengaluru concert tickets", "${artist.name} live ${cityHint} 2026". Today is ${today}. Search the web for UPCOMING live concerts or festival appearances in INDIA (priority: ${cityHint}; but include every Indian city) for "${artist.name}" (also known as: ${names.join(", ")}). Only report events on pages dated today or later. For each event give the title, date as written, venue, city, which website listed it, and any ticket phase or deadline ONLY if a page states it. If you find nothing, say "no upcoming India events found". Never guess.`}`;
        // The model sometimes answers without searching; retry once to get real grounding.
        let notes = "";
        let chunks: Chunk[] = [];
        for (let attempt = 0; attempt < 3 && !chunks.length; attempt++) {
          if (attempt > 0 && opts.deadlineMs && Date.now() > opts.deadlineMs) break; // out of time budget: no more retries
          if (attempt > 0) await new Promise((r) => setTimeout(r, 3000));
          const search = await searchWeb(searchPrompt, llm);
          notes = search.text;
          chunks = search.sources;
        }

        if (!chunks.length || /no (upcoming |past )?india events found/i.test(notes) && notes.length < 400) {
          opts.onDebug?.(`${artist.name}: search sources ${chunks.length}, nothing to extract. notes: ${notes.slice(0, 140).replace(/\s+/g, " ")}`);
          // Only count the artist as searched when real search sources came back; an ungrounded
          // "nothing found" answer is retried on a later run.
          if (chunks.length) opts.onArtistDone?.(artist.id);
          if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
          continue;
        }

        // Step 2: structured extraction, tied to the real search-result pages
        const extractText = await generateJson(`Research notes about ${past ? "past" : "upcoming"} India concerts by "${artist.name}":\n"""\n${notes}\n"""\n\nPages the search used:\n${chunks.map((c, i) => `${i}: ${c.host}`).join("\n")}\n\nExtract ONLY events that appear in the notes, for ${artist.name}, ${past ? `that took place between ${since} and ${today} (not today), each with a full YYYY-MM-DD date_iso`: `dated ${today} or later`}. Return JSON: {"events":[{"artist":string,"title":string,"date_text":string|null,"date_iso":"YYYY-MM-DD"|"YYYY-MM"|null,"venue":string|null,"city":string|null,"source_index":number (index from the pages list that lists this event),"has_ticket_link":boolean,"early_bird_mentioned":boolean (true ONLY if the notes say early-bird / phase-1 / presale tickets exist for this show),"early_bird_excerpt":string|null (short phrase copied from the notes about the early-bird sale or its dates),"excerpt":string|null (short phrase copied from the notes)}]}. Use null for anything the notes do not state. Do not invent anything. If none, {"events":[]}.`, llm);
        let events: ExtractedEvent[] = [];
        try {
          events = JSON.parse(extractText).events ?? [];
        } catch {
          events = [];
        }

        let droppedBadIndex = 0;
        let droppedPast = 0;
        for (const e of events) {
          const chunk = Number.isInteger(e.source_index) ? chunks[e.source_index as number] : undefined;
          if (!e.title || !chunk) {
            droppedBadIndex++;
            continue;
          }
          const d = parseDateField(e.date_iso);
          if (past) {
            // history: only events with an exact past day inside the window
            if (d.precision !== "day" || !d.startsAt || d.startsAt >= ctx.today.toISOString() || d.bucket < since) {
              droppedPast++;
              continue;
            }
          } else if (isPast(d.startsAt, ctx.today)) {
            droppedPast++;
            continue;
          }
          const sourceUrl = await resolveRedirect(chunk.uri);
          out.push({
            artistNames: [e.artist || artist.name],
            title: e.title.trim(),
            dateText: e.date_text ?? null,
            startsAt: d.startsAt,
            datePrecision: d.precision,
            dateBucket: d.bucket,
            venue: cleanVenue(e.venue),
            city: normalizeCity(e.city),
            ticketUrl: null, // never taken from the model; set only after human review
            sourceUrl,
            sourceTitle: chunk.host || null,
            externalId: null,
            discoverySource: "gemini_grounding",
            excerpt: e.excerpt ?? null,
            earlyBirdExcerpt: !past && e.early_bird_mentioned === true ? (e.early_bird_excerpt ?? "early-bird tickets mentioned").slice(0, 300) : null,
            aiReported: true,
            officialApiRecord: false,
          });
        }
        opts.onArtistDone?.(artist.id);
        opts.onDebug?.(
          `${artist.name}: sources ${chunks.length}, extracted ${events.length}, dropped (no valid source) ${droppedBadIndex}, past ${droppedPast}`,
        );
        if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      }
      return out;
    },
  };
}
