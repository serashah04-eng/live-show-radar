// Appends a timestamped entry to CONTEXT_MEMORY.md.
// Usage: node scripts/log-change.mjs "title" "why" "what" "files"
import { appendFileSync, readFileSync } from "node:fs";

const [title, why, what, files] = process.argv.slice(2);
if (!title || !why || !what) {
  console.error('Usage: node scripts/log-change.mjs "title" "why" "what" "files"');
  process.exit(1);
}
const now = new Date();
const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(now).replace(",", "");
const entry = `- **${stamp} IST — ${title}** · ${why} · ${what}${files ? ` · \`${files}\`` : ""}\n`;
const file = "CONTEXT_MEMORY.md";
if (!readFileSync(file, "utf8").includes("scripts/log-change.mjs")) throw new Error("CONTEXT_MEMORY.md not found or malformed");
appendFileSync(file, entry);
console.log("logged:", entry.trim());
