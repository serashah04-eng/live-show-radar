// Looks for the actual secret values from .env.local inside everything that could be committed or
// shipped to browsers. Prints file names only, never values.
// Run: node --env-file=.env.local scripts/scan-secrets.mjs   (build first for the bundle check)
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SECRET_NAMES = ["SUPABASE_SECRET_KEY", "TICKETMASTER_API_KEY", "GEMINI_API_KEY", "TELEGRAM_BOT_TOKEN", "RESEND_API_KEY", "CRON_SECRET"];
const secrets = SECRET_NAMES.map((n) => [n, (process.env[n] ?? "").trim()]).filter(([, v]) => v.length >= 12);
console.log(`checking ${secrets.length} secret values against committable files and the browser bundle`);

const hits = [];
const scanText = (label, text) => {
  for (const [name, value] of secrets) if (text.includes(value)) hits.push(`${name} found in ${label}`);
};

// 1) files git would commit (tracked + untracked, minus ignored)
const files = execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" }).split("\n").filter(Boolean);
let scanned = 0;
for (const f of files) {
  try {
    if (statSync(f).size > 2_000_000) continue;
    scanText(f, readFileSync(f, "utf8"));
    scanned++;
  } catch { /* unreadable or deleted */ }
}
console.log(`committable files scanned: ${scanned}`);

// 2) the JavaScript/CSS/HTML sent to browsers
const walk = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])) : []);
const bundle = [...walk(".next/static")];
for (const f of bundle) if (/\.(js|css|html|json|map)$/.test(f)) scanText(f, readFileSync(f, "utf8"));
console.log(`browser bundle files scanned: ${bundle.length}${bundle.length ? "" : " (run npm run build first)"}`);

// 3) server-only secrets must not be referenced from client components
const clientFiles = files.filter((f) => /\.(ts|tsx)$/.test(f) && existsSync(f) && /^["']use client["']/.test(readFileSync(f, "utf8").trimStart()));
for (const f of clientFiles) {
  const t = readFileSync(f, "utf8");
  for (const n of SECRET_NAMES) if (t.includes(n)) hits.push(`${n} referenced in client component ${f}`);
}
console.log(`client components checked: ${clientFiles.length}`);

// 4) the git-ignore must cover env files
const ignored = execSync("git check-ignore .env.local", { encoding: "utf8" }).trim();
console.log(`.env.local is git-ignored: ${ignored === ".env.local"}`);

if (hits.length) {
  console.log("\nFAIL");
  for (const h of hits) console.log(" - " + h);
  process.exit(1);
}
console.log("\nPASS: no secret values in committable files or the browser bundle");
