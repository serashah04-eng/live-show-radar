// Generates docs/components-map.svg (editable SVG) from the data below.
// Only components that exist in the code are listed. Update `status` when a test changes the evidence, then re-run:
//   node scripts/build-components-map.mjs
import { mkdirSync, writeFileSync } from "node:fs";

// status: "tested"  = exercised with a real test (see docs/NINE-CHECKLIST.md)
//         "built"   = implemented, not yet exercised end to end
//         "pending" = depends on something not done yet (deployment, secrets)
const AS_OF = "12 Oct 2026";
const COLS = ["Actor", "Trigger", "Input", "Context", "Processing", "AI", "Output"];

const B = (id, col, row, status, ...lines) => ({ id, col, row, status, lines });
const boxes = [
  B("A1", 0, 0, "tested", "Karan (fan)", "Follows artists, sets", "genres, cities, alerts"),
  B("A2", 0, 1, "built", "Owner / admin", "Reviews and verifies", "events with evidence"),
  B("A3", 0, 2, "pending", "GitHub Actions", "scheduler (30 min)", "not deployed yet"),

  B("T1", 1, 0, "tested", "Opens app, follows,", "saves settings", "(Next.js, local owner mode)"),
  B("T2", 1, 1, "built", "Add event by link", "form"),
  B("T3", 1, 2, "built", "Review: confirm event", "or add ticket phase"),
  B("T4", 1, 3, "tested", "POST /api/cron/discover", "CRON_SECRET required"),
  B("T5", 1, 4, "tested", "POST /api/cron/notify", "CRON_SECRET required"),

  B("I1", 2, 0, "tested", "Followed artists", "+ aliases"),
  B("I2", 2, 1, "tested", "Saved genres, cities,", "alert preferences"),
  B("I3", 2, 2, "built", "User-submitted URL", "(never fetched or scraped)"),
  B("I4", 2, 3, "tested", "Ticketmaster Discovery", "API (0 India events found)"),
  B("I5", 2, 4, "tested", "Google Search results", "via Gemini grounding"),

  B("C1", 3, 0, "tested", "Supabase Postgres + RLS", "16 tables, 5 migrations"),
  B("C2", 3, 1, "tested", "Evidence, timestamps,", "verification status"),
  B("C3", 3, 2, "tested", "notification_log", "dedupe keys, retries"),
  B("C4", 3, 3, "pending", "GitHub repo (public)", "code not pushed yet"),
  B("C5", 3, 4, "pending", "Vercel hosting", "not deployed yet"),

  B("P1", 4, 0, "tested", "Source adapters", "Gemini, Ticketmaster, manual"),
  B("P2", 4, 1, "tested", "Normalize, deduplicate,", "match artists (rules)"),
  B("P3", 4, 2, "tested", "Corroboration:", "2+ independent sites"),
  B("P4", 4, 3, "built", "Owner verification", "evidence URL + quote"),
  B("P5", 4, 4, "tested", "Alert planner", "prefs + evidence rules"),
  B("P6", 4, 5, "tested", "Dispatcher: reserve,", "send, retry, log"),

  B("AI1", 5, 0, "tested", "Gemini Flash", "grounded search +", "structured extraction"),
  B("AI2", 5, 1, "built", "Gemini Flash", "ambiguous artist match", "(needs 0.85+ confidence)"),

  B("O1", 6, 0, "tested", "Feed, dashboard,", "event pages, filters"),
  B("O2", 6, 1, "built", "In-app early-bird", "pop-up (once per user)"),
  B("O3", 6, 2, "tested", "Telegram alert", "(test message delivered)"),
  B("O4", 6, 3, "built", "Email via Resend", "(not delivery-tested)"),
  B("O5", 6, 4, "tested", "Status page, run logs,", "failed-alert list"),
];

const edges = [
  ["A1", "T1"], ["A1", "T2"], ["A2", "T3"], ["A3", "T4"],
  ["T1", "I2"], ["T1", "I1"], ["T2", "I3"], ["T3", "P4"], ["T4", "I1"], ["T4", "I4"], ["T4", "I5"], ["T5", "P5"],
  ["I1", "P1"], ["I4", "P1"], ["I3", "P1"], ["I5", "AI1"], ["I2", "P5"],
  ["AI1", "P1"], ["P1", "P2"], ["P2", "P3"], ["P2", "AI2"], ["P2", "C1"], ["P3", "C2"], ["P4", "C2"],
  ["C1", "P5"], ["P5", "P6"], ["P6", "C3"], ["P6", "O3"], ["P6", "O4"],
  ["C1", "O1"], ["C2", "O1"], ["C1", "O2"], ["C3", "O5"], ["C4", "C5"],
];

const W = 188, H = 74, GX = 26, STEP = 214, TOP = 118, ROWSTEP = 92, LEFT = 24;
const x = (b) => LEFT + b.col * STEP;
const y = (b) => TOP + b.row * ROWSTEP;
const byId = Object.fromEntries(boxes.map((b) => [b.id, b]));
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const maxRow = Math.max(...boxes.map((b) => b.row));
const totalW = LEFT * 2 + STEP * COLS.length - (STEP - W);
const totalH = TOP + (maxRow + 1) * ROWSTEP + 70;

const C = { bg: "#151821", lane: "#1a1e2b", lane2: "#171b26", cobalt: "#315CFF", orange: "#FF7A30", off: "#F4F5F7", slate: "#70798B", slateText: "#A3ABBD" };
const style = {
  tested: `fill="#1d2848" stroke="${C.cobalt}" stroke-width="2"`,
  built: `fill="#262029" stroke="${C.orange}" stroke-width="2" stroke-dasharray="6 4"`,
  pending: `fill="#1d2230" stroke="${C.slate}" stroke-width="2" stroke-dasharray="2 4"`,
};

let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}" font-family="Arial, Helvetica, sans-serif">
<title>Live Show Radar: components map (as implemented, ${AS_OF})</title>
<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${C.slateText}"/></marker></defs>
<rect width="100%" height="100%" fill="${C.bg}"/>
<text x="${LEFT}" y="34" fill="${C.off}" font-size="22" font-weight="700" letter-spacing="1">LIVE SHOW <tspan fill="${C.orange}">RADAR</tspan>  ·  COMPONENTS MAP</text>
<text x="${LEFT}" y="54" fill="${C.slateText}" font-size="12">As implemented, status as of ${AS_OF}. Arrows show data flow. This map is not evidence that anything works: see docs/NINE-CHECKLIST.md for the tests.</text>
`;

COLS.forEach((c, i) => {
  const lx = LEFT - GX / 2 + i * STEP;
  svg += `<rect x="${lx}" y="72" width="${STEP - 2}" height="${totalH - 72 - 52}" fill="${i % 2 ? C.lane2 : C.lane}" rx="10"/>`;
  svg += `<text x="${lx + (STEP - 2) / 2}" y="98" fill="${C.off}" font-size="14" font-weight="700" text-anchor="middle" letter-spacing="2">${c.toUpperCase()}</text>`;
});

for (const [a, b] of edges) {
  const f = byId[a], t = byId[b];
  let d;
  if (f.col === t.col) {
    const down = t.row > f.row;
    d = `M ${x(f) + W / 2} ${down ? y(f) + H : y(f)} L ${x(t) + W / 2} ${down ? y(t) : y(t) + H}`;
  } else if (f.col < t.col) {
    const sx = x(f) + W, sy = y(f) + H / 2, ex = x(t), ey = y(t) + H / 2, mx = (sx + ex) / 2;
    d = `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`;
  } else continue;
  svg += `<path d="${d}" fill="none" stroke="${C.slate}" stroke-width="1.4" opacity="0.85" marker-end="url(#arr)"/>`;
}

for (const b of boxes) {
  svg += `<g><rect x="${x(b)}" y="${y(b)}" width="${W}" height="${H}" rx="10" ${style[b.status]}/>`;
  b.lines.forEach((l, i) => {
    svg += `<text x="${x(b) + 10}" y="${y(b) + 24 + i * 16}" font-size="${i === 0 ? 13 : 11.5}" font-weight="${i === 0 ? 700 : 400}" fill="${i === 0 ? C.off : C.slateText}">${esc(l)}</text>`;
  });
  svg += `</g>`;
}

const ly = totalH - 30;
const legend = [["tested", "Tested with a real run (see checklist)"], ["built", "Built, not yet exercised end to end"], ["pending", "Waiting on deployment / not done yet"]];
legend.forEach(([s, label], i) => {
  const lx = LEFT + i * 330;
  svg += `<rect x="${lx}" y="${ly - 12}" width="26" height="16" rx="4" ${style[s]}/><text x="${lx + 36}" y="${ly + 1}" fill="${C.off}" font-size="12">${esc(label)}</text>`;
});
svg += `</svg>\n`;

mkdirSync("docs", { recursive: true });
writeFileSync("docs/components-map.svg", svg);
console.log(`wrote docs/components-map.svg (${totalW}x${totalH}), ${boxes.length} components, ${edges.length} flows`);
