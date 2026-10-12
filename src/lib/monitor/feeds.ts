import { XMLParser } from "fast-xml-parser";
import { isAllowed, parseRobots, USER_AGENT, type RobotsRules } from "./robots.ts";

export interface FeedItem {
  url: string;
  title: string;
  /** text the feed itself provides (summary/content), may be empty for sitemap entries */
  text: string;
  publishedAt: string | null;
}

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text", processEntities: true, trimValues: true });
const arr = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const str = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : v && typeof v === "object" && "#text" in (v as object) ? String((v as { "#text": unknown })["#text"]) : "");

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

const iso = (s: string): string | null => {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

/** RSS 2.0 and Atom. Returns only items that have a link. */
export function parseFeed(body: string): FeedItem[] {
  const j = xml.parse(body);
  const out: FeedItem[] = [];
  const rssItems = arr(j?.rss?.channel?.item ?? j?.["rdf:RDF"]?.item);
  for (const it of rssItems) {
    const url = str(it.link) || str(it.guid);
    if (!url.startsWith("http")) continue;
    out.push({
      url,
      title: stripHtml(str(it.title)),
      text: stripHtml(`${str(it.description)} ${str(it["content:encoded"])}`).slice(0, 6000),
      publishedAt: iso(str(it.pubDate) || str(it["dc:date"])),
    });
  }
  for (const e of arr(j?.feed?.entry)) {
    const links = arr(e.link);
    const href = links.map((l: { "@_href"?: string; "@_rel"?: string }) => (l?.["@_rel"] === "alternate" || !l?.["@_rel"] ? l?.["@_href"] : null)).find(Boolean) ?? "";
    if (!String(href).startsWith("http")) continue;
    out.push({ url: String(href), title: stripHtml(str(e.title)), text: stripHtml(`${str(e.summary)} ${str(e.content)}`).slice(0, 6000), publishedAt: iso(str(e.published) || str(e.updated)) });
  }
  return out;
}

export interface SitemapResult {
  /** child sitemaps when this is a sitemap index */
  children: string[];
  urls: { url: string; lastmod: string | null }[];
}

export function parseSitemap(body: string): SitemapResult {
  const j = xml.parse(body);
  const children = arr(j?.sitemapindex?.sitemap).map((s: { loc?: unknown }) => str(s.loc)).filter((u: string) => u.startsWith("http"));
  const urls = arr(j?.urlset?.url)
    .map((u: { loc?: unknown; lastmod?: unknown }) => ({ url: str(u.loc), lastmod: str(u.lastmod) ? iso(str(u.lastmod)) : null }))
    .filter((u: { url: string }) => u.url.startsWith("http"));
  return { children, urls };
}

/** schema.org Event objects embedded as JSON-LD (the most reliable structured data on ticket pages). */
export function extractJsonLdEvents(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const isEvent = (t: unknown) => (Array.isArray(t) ? t : [t]).some((x) => typeof x === "string" && /(^|\/)(Music|Theater|Comedy|Dance|Festival|Sports)?Event$/i.test(x));
  const walk = (n: unknown) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!n || typeof n !== "object") return;
    const o = n as Record<string, unknown>;
    if (isEvent(o["@type"])) out.push(o);
    if (o["@graph"]) walk(o["@graph"]);
  };
  for (const m of html.matchAll(re)) {
    try {
      walk(JSON.parse(m[1].trim()));
    } catch {
      /* malformed block: ignore */
    }
  }
  return out;
}

export async function fetchText(url: string, timeoutMs = 20_000): Promise<{ ok: boolean; status: number; text: string }> {
  try {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,application/xml,application/rss+xml,text/xml,*/*" }, signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
    const text = res.ok ? (await res.text()).slice(0, 2_500_000) : "";
    return { ok: res.ok, status: res.status, text };
  } catch {
    return { ok: false, status: 0, text: "" };
  }
}

const robotsCache = new Map<string, Promise<RobotsRules | null>>();
/** Rules for the URL's host. null when robots.txt could not be read: treated as "do not fetch pages" (be conservative). */
export function robotsFor(url: string): Promise<RobotsRules | null> {
  const origin = new URL(url).origin;
  let p = robotsCache.get(origin);
  if (!p) {
    p = fetchText(`${origin}/robots.txt`, 10_000).then((r) => (r.ok ? parseRobots(r.text) : r.status === 404 ? { allow: [], disallow: [] } : null));
    robotsCache.set(origin, p);
  }
  return p;
}

export async function allowedByRobots(url: string): Promise<boolean> {
  const rules = await robotsFor(url);
  if (!rules) return false;
  const u = new URL(url);
  return isAllowed(rules, u.pathname + u.search);
}
