// One place for every Gemini Flash call. Google is tried first; when Google refuses (quota 429, bad key) the same
// request is sent to Gemini Flash through OpenRouter. All AI in this app is Gemini Flash either way.

export interface LlmOptions {
  googleKey?: string;
  googleModel?: string;
  openrouterKey?: string;
  openrouterModel?: string;
  /** "google" | "openrouter" | "auto" (default: Google first, OpenRouter on failure) */
  provider?: "google" | "openrouter" | "auto";
}

export interface SearchResult {
  text: string;
  /** pages the search actually used (uri may be a Google redirect, resolved later) */
  sources: { uri: string; host: string }[];
  provider: "google" | "openrouter";
}

export const optsFromEnv = (env: Record<string, string | undefined> = process.env): LlmOptions => ({
  googleKey: env.GEMINI_API_KEY,
  googleModel: env.GEMINI_MODEL || "gemini-flash-latest",
  openrouterKey: env.OPENROUTER_API_KEY,
  openrouterModel: env.OPENROUTER_MODEL || "google/gemini-3.8-flash",
  provider: (env.AI_PROVIDER as LlmOptions["provider"]) || "auto",
});

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

async function googleCall(o: LlmOptions, body: unknown) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${o.googleModel}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": o.googleKey ?? "" },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${j?.error?.status ?? ""} ${String(j?.error?.message ?? "").slice(0, 120)}`);
  return j;
}

async function openrouterCall(o: LlmOptions, body: Record<string, unknown>) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${o.openrouterKey}`, "content-type": "application/json" },
    body: JSON.stringify({ model: o.openrouterModel, reasoning: { effort: "low" }, ...body }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j?.error) throw new Error(`OpenRouter HTTP ${res.status}: ${String(j?.error?.message ?? "").slice(0, 120)}`);
  return j;
}

const textOfGoogle = (j: { candidates?: { content?: { parts?: { text?: string }[] } }[] }) =>
  j?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";

/** Grounded web search answered in prose, with the pages used. */
export async function searchWeb(prompt: string, o: LlmOptions): Promise<SearchResult> {
  const order: ("google" | "openrouter")[] = o.provider === "openrouter" ? ["openrouter"] : o.provider === "google" ? ["google"] : ["google", "openrouter"];
  let lastErr: unknown = null;
  for (const p of order) {
    try {
      if (p === "google") {
        if (!o.googleKey) throw new Error("no Google key");
        const j = await googleCall(o, { contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }] });
        const chunks = (j?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []) as { web?: { uri?: string; title?: string } }[];
        return {
          text: textOfGoogle(j),
          sources: chunks.filter((c) => c.web?.uri).map((c) => ({ uri: c.web!.uri!, host: (c.web?.title ?? "").toLowerCase().replace(/^www\./, "") })),
          provider: "google",
        };
      }
      if (!o.openrouterKey) throw new Error("no OpenRouter key");
      const j = await openrouterCall(o, { plugins: [{ id: "web", max_results: 8 }], messages: [{ role: "user", content: prompt }], max_tokens: 3500 });
      const msg = j?.choices?.[0]?.message ?? {};
      const seen = new Set<string>();
      const sources: SearchResult["sources"] = [];
      for (const a of (msg.annotations ?? []) as { type?: string; url_citation?: { url?: string; title?: string } }[]) {
        const url = a.url_citation?.url;
        if (a.type === "url_citation" && url && !seen.has(url)) {
          seen.add(url);
          sources.push({ uri: url, host: (a.url_citation?.title ?? hostOf(url)).toLowerCase().replace(/^www\./, "") });
        }
      }
      return { text: String(msg.content ?? ""), sources, provider: "openrouter" };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("search failed");
}

/** Plain (no web search) JSON reply. */
export async function generateJson(prompt: string, o: LlmOptions): Promise<string> {
  const order: ("google" | "openrouter")[] = o.provider === "openrouter" ? ["openrouter"] : o.provider === "google" ? ["google"] : ["google", "openrouter"];
  let lastErr: unknown = null;
  for (const p of order) {
    try {
      if (p === "google") {
        if (!o.googleKey) throw new Error("no Google key");
        return textOfGoogle(await googleCall(o, { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0 } }));
      }
      if (!o.openrouterKey) throw new Error("no OpenRouter key");
      const j = await openrouterCall(o, { messages: [{ role: "user", content: prompt }], response_format: { type: "json_object" }, temperature: 0, max_tokens: 3000 });
      return String(j?.choices?.[0]?.message?.content ?? "");
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("generation failed");
}
