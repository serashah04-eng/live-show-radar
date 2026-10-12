// Minimal robots.txt support so the monitor never fetches anything a site disallows.

export const BOT_NAME = "FrontRowBot";
export const USER_AGENT = `${BOT_NAME}/1.0 (+https://github.com/serashah04-eng/live-show-radar; concert announcement monitor)`;

export interface RobotsRules {
  allow: string[];
  disallow: string[];
}

/** Parses the group that applies to us: our own name first, else "*". */
export function parseRobots(text: string): RobotsRules {
  const groups: { agents: string[]; allow: string[]; disallow: string[] }[] = [];
  let cur: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], allow: [], disallow: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (!cur) continue;
      if (key === "disallow" && val) cur.disallow.push(val);
      if (key === "allow" && val) cur.allow.push(val);
    }
  }
  const mine = groups.find((g) => g.agents.some((a) => a !== "*" && BOT_NAME.toLowerCase().includes(a)));
  const star = groups.find((g) => g.agents.includes("*"));
  const g = mine ?? star;
  return { allow: g?.allow ?? [], disallow: g?.disallow ?? [] };
}

const toRegex = (p: string) =>
  new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));

/** Longest matching rule wins; Allow beats Disallow on equal length. */
export function isAllowed(rules: RobotsRules, pathAndQuery: string): boolean {
  let best: { len: number; allow: boolean } | null = null;
  for (const p of rules.disallow) if (toRegex(p).test(pathAndQuery) && (!best || p.length > best.len)) best = { len: p.length, allow: false };
  for (const p of rules.allow) if (toRegex(p).test(pathAndQuery) && (!best || p.length >= best.len)) best = { len: p.length, allow: true };
  return best ? best.allow : true;
}
