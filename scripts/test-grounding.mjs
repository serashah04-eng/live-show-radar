// Tests Gemini Google Search grounding for upcoming India concerts. Never prints secrets.
// Run: node --env-file=.env.local scripts/test-grounding.mjs "Artist One" "Artist Two"
const artists = process.argv.slice(2);
if (!artists.length) artists.push("Prateek Kuhad", "Anuv Jain");
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const today = new Date().toISOString().slice(0, 10);

const prompt = `Today is ${today}. Search the web for UPCOMING live concerts in India (Bengaluru first, then other Indian cities) for: ${artists.join(", ")}.
Only report events you actually found on a web page. For each event give: artist, title, date as written on the page, venue, city, ticket/source URL, and any early-bird ticket phase and deadline ONLY if the page explicitly states it. Use "unknown" for anything not stated. If you find nothing, say "no upcoming India events found". Never guess.`;

const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], tools: [{ google_search: {} }] }),
});
const j = await r.json();
console.log(`model=${model} HTTP ${r.status}`);
if (!r.ok) { console.log("error:", j?.error?.status, j?.error?.message?.slice(0, 300)); process.exit(1); }
const c = j.candidates?.[0];
console.log("\n--- ANSWER ---\n" + (c?.content?.parts?.map((p) => p.text).join("") ?? "(none)"));
const gm = c?.groundingMetadata;
console.log("\n--- GROUNDING ---");
console.log("search queries:", gm?.webSearchQueries ?? []);
console.log("sources:", (gm?.groundingChunks ?? []).map((g) => g.web?.title).filter(Boolean));
console.log("grounded:", Boolean(gm?.groundingChunks?.length));
