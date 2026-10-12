import type { SupabaseClient } from "@supabase/supabase-js";
import { isAmbiguous, matchArtistsDeterministic, resolveAmbiguousWithGemini } from "./match.ts";
import { normalizeName } from "./normalize.ts";
import { persistDiscovery } from "./persist.ts";
import type { AdapterRunResult, ArtistRecord, DiscoveryContext, RawDiscovery, SourceAdapter } from "./types.ts";

export async function loadArtists(db: SupabaseClient, only?: string[]): Promise<ArtistRecord[]> {
  const { data, error } = await db.from("artists").select("id, name, normalized_name, artist_aliases(normalized_alias)");
  if (error) throw new Error(`load artists failed: ${error.message}`);
  const wanted = only?.map(normalizeName);
  return (data ?? [])
    .filter((a) => !wanted || wanted.includes(a.normalized_name))
    .map((a) => ({
      id: a.id,
      name: a.name,
      normalizedName: a.normalized_name,
      aliases: (a.artist_aliases as { normalized_alias: string }[]).map((x) => x.normalized_alias),
    }));
}

export interface RunOptions {
  geminiApiKey?: string;
  geminiModel?: string;
  dryRun?: boolean;
}

/** Runs one adapter, matches, persists, and records the run so source status is visible in the app. */
export async function runAdapter(
  db: SupabaseClient,
  adapter: SourceAdapter,
  ctx: DiscoveryContext,
  opts: RunOptions = {},
): Promise<AdapterRunResult & { raw: RawDiscovery[] }> {
  const { data: run } = await db.from("discovery_runs").insert({ source_name: adapter.name }).select("id").single();
  let found: RawDiscovery[] = [];
  let created = 0;
  let status: AdapterRunResult["status"] = "success";
  let error: string | null = null;
  try {
    found = await adapter.discover(ctx);
    for (const raw of found) {
      let matches = matchArtistsDeterministic(raw, ctx.artists);
      if (isAmbiguous(raw, matches) && opts.geminiApiKey && raw.officialApiRecord) {
        matches = await resolveAmbiguousWithGemini(raw, ctx.artists, {
          apiKey: opts.geminiApiKey,
          model: opts.geminiModel ?? "gemini-flash-latest",
        });
      }
      if (opts.dryRun) continue;
      const r = await persistDiscovery(db, raw, matches, ctx.artists);
      if (r.action === "created") created++;
    }
  } catch (e) {
    status = found.length ? "partial" : "failed";
    error = e instanceof Error ? e.message.replace(/key=[^&\s]+/gi, "key=***") : String(e);
  }
  if (run) {
    await db
      .from("discovery_runs")
      .update({ finished_at: new Date().toISOString(), status, events_found: found.length, events_new: created, error })
      .eq("id", run.id);
  }
  return { source: adapter.name, status, found: found.length, created, error, raw: found };
}
