// Merges research/_parts/*.json into research/sources.json and research/sources.md.
// Run: node scripts/merge-sources.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = "research/_parts";
const parts = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")) : [];
const all = [];
for (const f of parts) {
  let arr;
  try {
    arr = JSON.parse(readFileSync(join(dir, f), "utf8"));
  } catch (e) {
    console.log(`SKIPPED ${f}: invalid JSON (${e.message.slice(0, 60)})`);
    continue;
  }
  for (const e of arr) all.push({ ...e, _part: f });
}

const domain = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};
const norm = (s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const seen = new Map();
for (const e of all) {
  const key = domain(e.root_url) ?? norm(e.name);
  const prev = seen.get(key);
  const rank = { verified: 3, needs_human_review: 2, unverified: 1, rejected: 0 };
  if (!prev || (rank[e.status] ?? 0) > (rank[prev.status] ?? 0)) seen.set(key, e);
}
const merged = [...seen.values()];
const clean = (e) => {
  const { _part, ...rest } = e;
  return rest;
};
const usable = merged.filter((e) => e.status !== "rejected").map(clean);
const rejected = merged.filter((e) => e.status === "rejected").map(clean);
writeFileSync("research/sources.json", JSON.stringify(usable, null, 2));
writeFileSync("research/rejected.json", JSON.stringify(rejected, null, 2));

const link = (u) => (u && u !== "not found on site" ? `[link](${u})` : "none");
const row = (e) =>
  `| ${e.name} | ${e.root_url ? `[${domain(e.root_url) ?? e.root_url}](${e.root_url})` : "none"} | ${e.status} | T${e.credibility_tier} | ${link(e.linkedin)} / ${link(e.instagram)} / ${link(e.x)} / ${link(e.youtube)} | ${e.feed_url ? link(e.feed_url) : "none"} | ${(e.signals_provided ?? []).join(", ")} | ${String(e.automation_notes ?? "").slice(0, 110).replace(/\|/g, "/")} |`;
const head = "| Source | Root | Status | Tier | LinkedIn / Instagram / X / YouTube (from the site itself) | Feed | Signals | Automation notes |\n|---|---|---|---|---|---|---|---|";
const cats = [...new Set(usable.map((e) => e.category))];
let md = `# Credible India live-entertainment sources (research output)\n\nResearch date: 2026-10-12. Built from seven research passes; every entry is marked **verified** only if the homepage was actually fetched. Anything blocked, unresolved or unclear is **unverified** or **needs_human_review**. Nothing was filled from memory. Tier 1 = official primary, Tier 2 = trade/news confirmation, Tier 3 = discovery lead only.\n\n`;
md += `Counts: ${usable.length} usable entries (${usable.filter((e) => e.status === "verified").length} verified, ${usable.filter((e) => e.status === "needs_human_review").length} need human review, ${usable.filter((e) => e.status === "unverified").length} unverified), ${rejected.length} rejected.\n\n`;
for (const t of [[1, "Tier 1: official primary sources"], [2, "Tier 2: trade and news confirmation"], [3, "Tier 3: discovery leads only (never confirmation)"]]) {
  md += `## ${t[1]}\n\n`;
  for (const c of cats) {
    const rows = usable.filter((e) => e.credibility_tier === t[0] && e.category === c && e.status === "verified");
    if (!rows.length) continue;
    md += `### ${c}\n\n${head}\n${rows.map(row).join("\n")}\n\n`;
  }
}
const review = usable.filter((e) => e.status === "needs_human_review");
md += `## Needs human review\n\n${review.length ? `${head}\n${review.map(row).join("\n")}` : "none"}\n\n`;
const unv = usable.filter((e) => e.status === "unverified");
md += `## Unverified (could not be fetched or confirmed; do not use until checked)\n\n${unv.length ? `${head}\n${unv.map(row).join("\n")}` : "none"}\n\n`;
md += `## Rejected\n\n| Name | Domain | Reason |\n|---|---|---|\n${rejected.map((e) => `| ${e.name} | ${domain(e.root_url) ?? "n/a"} | ${String(e.rejected_reason ?? e.notes ?? "").slice(0, 200).replace(/\|/g, "/")} |`).join("\n")}\n`;
writeFileSync("research/sources.md", md);

const withFeed = usable.filter((e) => e.feed_url && e.feed_url !== "not found on site");
console.log(`merged ${merged.length} unique sources from ${parts.length} files -> usable ${usable.length}, rejected ${rejected.length}`);
console.log("by status:", JSON.stringify(Object.fromEntries(["verified", "needs_human_review", "unverified"].map((s) => [s, usable.filter((e) => e.status === s).length]))));
console.log("verified with a feed_url:", withFeed.filter((e) => e.status === "verified").length, "| any status with a feed_url:", withFeed.length);
for (const e of withFeed.slice(0, 40)) console.log(` - [${e.status}] T${e.credibility_tier} ${e.name} -> ${e.feed_url}`);
