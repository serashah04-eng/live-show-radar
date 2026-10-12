import { artistImage } from "@/lib/artist-images";

const COLORS = [["#315cff", "#ffffff"], ["#ff7a30", "#151821"], ["#c6d800", "#151821"], ["#2f3649", "#f4f5f7"]];
const colorFor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
};
const initials = (name: string) => name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

/** Round artist photo (Wikimedia) with a monogram fallback. */
export function ArtistAvatar({ name, size = 48, src }: { name: string; size?: number; src?: string | null }) {
  const url = src === undefined ? artistImage(name)?.url : src;
  const [bg, fg] = colorFor(name);
  const box = { width: size, height: size } as const;
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" className="shrink-0 rounded-full object-cover" style={box} />;
  }
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full font-bold" style={{ ...box, background: bg, color: fg, fontSize: size / 2.6 }}>
      {initials(name)}
    </span>
  );
}
