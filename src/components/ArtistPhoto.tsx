import { artistImage } from "@/lib/artist-images";

const GRADS = [
  "linear-gradient(135deg,#315cff,#8aa3ff)",
  "linear-gradient(135deg,#ff7a30,#ffb36b)",
  "linear-gradient(135deg,#c4d600,#f0ff5a)",
  "linear-gradient(135deg,#7a3cff,#ff4fa3)",
];
const gradFor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GRADS[h % GRADS.length];
};
const initials = (n: string) => n.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

/** Fills its parent: the artist photo, or a bright gradient with their initials when we have no photo. */
export function ArtistPhoto({ name, className = "" }: { name: string; className?: string }) {
  const img = artistImage(name)?.url;
  if (img) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img} alt="" loading="lazy" referrerPolicy="no-referrer" className={`size-full object-cover ${className}`} />;
  }
  return (
    <span aria-hidden="true" className={`grid size-full place-items-center font-bold text-white ${className}`} style={{ background: gradFor(name), fontFamily: "var(--font-display), Impact, sans-serif", fontSize: "2.2rem" }}>
      {initials(name)}
    </span>
  );
}
