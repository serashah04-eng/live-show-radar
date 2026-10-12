import { normalizeName } from "./normalize.ts";
import type { ArtistRecord, RawDiscovery } from "./types.ts";

export interface ArtistMatch {
  artistId: string;
  method: "exact" | "alias" | "ai_assisted" | "manual";
  confidence: number;
  matchedText: string;
}

function hasWholePhrase(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

/**
 * Deterministic matching only. Names/aliases must appear as whole words in the
 * source-reported artist names or the event title. Short aliases (<4 chars) only
 * match the reported artist names, never free text, to avoid false positives.
 */
export function matchArtistsDeterministic(raw: RawDiscovery, artists: ArtistRecord[]): ArtistMatch[] {
  const reported = raw.artistNames.map(normalizeName).filter(Boolean);
  const title = normalizeName(raw.title);
  const out: ArtistMatch[] = [];

  for (const a of artists) {
    let found: ArtistMatch | null = null;
    if (reported.includes(a.normalizedName) || hasWholePhrase(title, a.normalizedName)) {
      found = { artistId: a.id, method: "exact", confidence: 1, matchedText: a.name };
    } else {
      for (const al of a.aliases) {
        if (al === a.normalizedName) continue;
        const inReported = reported.includes(al);
        const inTitle = al.length >= 4 && hasWholePhrase(title, al);
        if (inReported || inTitle) {
          found = { artistId: a.id, method: "alias", confidence: 0.95, matchedText: al };
          break;
        }
      }
    }
    if (found) out.push(found);
  }
  return out;
}

/** Events reporting an artist name that matches nobody we follow are ambiguous candidates. */
export function isAmbiguous(raw: RawDiscovery, matches: ArtistMatch[]): boolean {
  return matches.length === 0 && raw.artistNames.length > 0;
}

/**
 * Gemini is used ONLY to judge whether a reported name refers to one of our known
 * artists. It never creates events. A result is accepted only with confidence >= 0.85
 * and a quoted reason; otherwise it is ignored.
 */
export async function resolveAmbiguousWithGemini(
  raw: RawDiscovery,
  artists: ArtistRecord[],
  opts: { apiKey: string; model: string },
): Promise<ArtistMatch[]> {
  const prompt = `Known artists (id: name | aliases):\n${artists
    .map((a) => `${a.id}: ${a.name} | ${a.aliases.join(", ")}`)
    .join("\n")}\n\nAn event source reported these performer names: ${JSON.stringify(raw.artistNames)} for the event titled "${raw.title}".\nDecide whether any reported name refers to the SAME artist as a known artist (spelling variants, stage-name vs band name). Do not guess; if unsure, return none.\nReply with JSON only: {"matches":[{"artist_id":"...","confidence":0.0-1.0,"reason":"short quote-based reason"}]}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${opts.model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": opts.apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
    },
  );
  if (!res.ok) return [];
  const j = await res.json();
  const text: string = j?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  try {
    const parsed = JSON.parse(text) as { matches?: { artist_id: string; confidence: number; reason: string }[] };
    return (parsed.matches ?? [])
      .filter((m) => artists.some((a) => a.id === m.artist_id) && m.confidence >= 0.85 && m.reason?.trim())
      .map((m) => ({
        artistId: m.artist_id,
        method: "ai_assisted" as const,
        confidence: Math.min(0.99, m.confidence),
        matchedText: m.reason.slice(0, 200),
      }));
  } catch {
    return [];
  }
}
